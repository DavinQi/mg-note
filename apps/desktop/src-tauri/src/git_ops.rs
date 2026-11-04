use git2::{ErrorCode, IndexAddOption, Repository, Signature, StatusOptions};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use crate::models::{
    GitBranchItem, GitEnvironmentStatus, SyncFileChange, SyncPreview, SyncStatus,
};

pub(crate) fn remove_http_userinfo(remote_url: &str) -> String {
    if !(remote_url.starts_with("https://") || remote_url.starts_with("http://")) {
        return remote_url.to_string();
    }

    let Some(scheme_end) = remote_url.find("://") else {
        return remote_url.to_string();
    };
    let authority_start = scheme_end + 3;
    let authority_end = remote_url[authority_start..]
        .find(|ch| matches!(ch, '/' | '?' | '#'))
        .map(|offset| authority_start + offset)
        .unwrap_or(remote_url.len());
    let Some(userinfo_end) = remote_url[authority_start..authority_end].rfind('@') else {
        return remote_url.to_string();
    };

    format!(
        "{}{}{}",
        &remote_url[..authority_start],
        &remote_url[authority_start + userinfo_end + 1..authority_end],
        &remote_url[authority_end..]
    )
}

fn sanitize_remote_credentials(repo: &Repository, remote_name: &str) -> Result<(), String> {
    let (remote_url, push_url) = {
        let remote = match repo.find_remote(remote_name) {
            Ok(remote) => remote,
            Err(error) if error.code() == ErrorCode::NotFound => return Ok(()),
            Err(error) => return Err(error.to_string()),
        };
        (
            remote.url().map(str::to_string),
            remote.pushurl().map(str::to_string),
        )
    };

    if let Some(url) = remote_url {
        let sanitized = remove_http_userinfo(&url);
        if sanitized != url {
            repo.remote_set_url(remote_name, &sanitized)
                .map_err(|e| e.to_string())?;
        }
    }

    if let Some(url) = push_url {
        let sanitized = remove_http_userinfo(&url);
        if sanitized != url {
            repo.remote_set_pushurl(remote_name, Some(&sanitized))
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

struct AskpassScript(PathBuf);

impl Drop for AskpassScript {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

fn configure_git_auth(
    command: &mut Command,
    token: Option<&str>,
    username: &str,
) -> Result<Option<AskpassScript>, String> {
    command.env("GIT_TERMINAL_PROMPT", "0");
    let Some(token) = token.filter(|token| !token.is_empty()) else {
        return Ok(None);
    };

    let helper = AskpassScript(
        std::env::temp_dir().join(format!("mg-node-askpass-{}.sh", ulid::Ulid::new())),
    );
    fs::write(
        &helper.0,
        "#!/bin/sh\ncase \"$1\" in\n  *sername*) printf '%s\\n' \"$MG_NODE_GIT_USERNAME\" ;;\n  *) printf '%s\\n' \"$MG_NODE_GIT_TOKEN\" ;;\nesac\n",
    )
    .map_err(|e| format!("Cannot create temporary Git credential helper: {}", e))?;
    #[cfg(unix)]
    {
        let mut permissions = fs::metadata(&helper.0)
            .map_err(|e| e.to_string())?
            .permissions();
        permissions.set_mode(0o700);
        fs::set_permissions(&helper.0, permissions).map_err(|e| e.to_string())?;
    }

    command
        .env("GIT_ASKPASS", &helper.0)
        .env("GIT_ASKPASS_REQUIRE", "force")
        .env("MG_NODE_GIT_USERNAME", username)
        .env("MG_NODE_GIT_TOKEN", token);
    Ok(Some(helper))
}

fn run_git(command: &mut Command, token: Option<&str>, username: &str) -> Result<Output, String> {
    let _helper = configure_git_auth(command, token, username)?;
    command
        .env("GIT_AUTHOR_NAME", "mg-node")
        .env("GIT_AUTHOR_EMAIL", "mgnode@local")
        .env("GIT_COMMITTER_NAME", "mg-node")
        .env("GIT_COMMITTER_EMAIL", "mgnode@local");
    command
        .output()
        .map_err(|e| format!("Cannot execute Git: {}", e))
}

fn git_output_error(action: &str, output: &Output) -> String {
    let detail = String::from_utf8_lossy(&output.stderr);
    let detail = detail.trim();
    if detail.is_empty() {
        format!("{} (Git exited with {})", action, output.status)
    } else {
        format!("{}: {}", action, detail)
    }
}

pub fn format_git_error(action: &str, output: &Output) -> String {
    let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let lower = detail.to_lowercase();
    if lower.contains("permission to")
        || lower.contains("denied")
        || lower.contains("403")
        || lower.contains("401")
        || lower.contains("invalid username or password")
        || lower.contains("authentication failed")
        || lower.contains("could not read username")
    {
        format!(
            "PERMISSION_ERROR: Git 鉴权或写入权限未通过。请检查 Token 是否有效且已勾选 repo (读写仓库) 权限。原始错误：{}",
            if detail.is_empty() { action } else { &detail }
        )
    } else if lower.contains("not found")
        || lower.contains("404")
        || lower.contains("repository not found")
    {
        format!(
            "NOT_FOUND_ERROR: 远程仓库不存在或地址错误。请确认已在 GitHub/Gitee 上创建对应仓库。原始错误：{}",
            if detail.is_empty() { action } else { &detail }
        )
    } else {
        git_output_error(action, output)
    }
}

pub fn set_remote_origin(repo: &Repository, remote_url: &str) -> Result<(), String> {
    let sanitized_url = remove_http_userinfo(remote_url);
    match repo.find_remote("origin") {
        Ok(_) => {
            repo.remote_set_url("origin", &sanitized_url)
                .map_err(|e| e.to_string())?;
        }
        Err(error) if error.code() == ErrorCode::NotFound => {
            repo.remote("origin", &sanitized_url)
                .map_err(|e| e.to_string())?;
        }
        Err(error) => return Err(error.to_string()),
    }
    sanitize_remote_credentials(repo, "origin")?;
    Ok(())
}

pub const DEFAULT_SYNC_BRANCH: &str = "my-git-note";

pub fn resolve_git_binary() -> Result<PathBuf, String> {
    let candidates = [
        "/opt/homebrew/bin/git",
        "/usr/local/bin/git",
        "/usr/bin/git",
        "git",
    ];

    for candidate in candidates {
        if let Ok(output) = Command::new(candidate).arg("--version").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if stdout.trim().starts_with("git version") {
                    return Ok(PathBuf::from(candidate));
                }
            }
        }
    }

    Err("Git command not found in system PATH or standard locations".into())
}

pub fn git_command() -> Command {
    let bin = resolve_git_binary().unwrap_or_else(|_| PathBuf::from("/usr/bin/git"));
    Command::new(bin)
}

pub fn check_git_environment() -> GitEnvironmentStatus {
    match resolve_git_binary() {
        Ok(path) => {
            let version = Command::new(&path)
                .arg("--version")
                .output()
                .ok()
                .and_then(|o| {
                    if o.status.success() {
                        Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                    } else {
                        None
                    }
                });

            GitEnvironmentStatus {
                is_installed: true,
                version,
                binary_path: Some(path.to_string_lossy().to_string()),
                can_auto_install: false,
                error_message: None,
            }
        }
        Err(err) => {
            #[cfg(target_os = "macos")]
            let can_auto_install = true;
            #[cfg(not(target_os = "macos"))]
            let can_auto_install = false;

            GitEnvironmentStatus {
                is_installed: false,
                version: None,
                binary_path: None,
                can_auto_install,
                error_message: Some(format!("未检测到可用 Git 环境：{}", err)),
            }
        }
    }
}

pub fn install_git_environment() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("xcode-select")
            .arg("--install")
            .output()
            .map_err(|e| format!("启动 macOS 开发者工具安装器失败: {}", e))?;

        if output.status.success() {
            Ok("已启动 macOS Xcode Command Line Tools 安装器，请在弹出的系统对话框中确认并完成安装。".into())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("already installed") {
                Ok("Command Line Tools 已处于安装状态，请尝试重启应用或检查终端中的 git 命令。".into())
            } else {
                Err(format!("启动安装器失败: {}", stderr.trim()))
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("当前系统不支持一键后台静默安装，请前往 https://git-scm.com/downloads 下载安装 Git。".into())
    }
}

pub fn ensure_sync_branch(repo_path: &Path, target_branch: &str) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // Check if HEAD already points to target branch
    if let Ok(head) = repo.head() {
        if let Some(shorthand) = head.shorthand() {
            if shorthand == target_branch {
                return Ok(());
            }
        }
    }

    // 1. Try checkout target_branch if it already exists locally
    let mut cmd = git_command();
    cmd.current_dir(repo_path).args(["checkout", target_branch]);
    if let Ok(output) = cmd.output() {
        if output.status.success() {
            return Ok(());
        }
    }

    // 2. Try checkout -b target_branch --track origin/<target_branch>
    let mut cmd = git_command();
    cmd.current_dir(repo_path)
        .args(["checkout", "-b", target_branch, "--track"])
        .arg(format!("origin/{}", target_branch));
    if let Ok(output) = cmd.output() {
        if output.status.success() {
            return Ok(());
        }
    }

    // 3. Otherwise checkout -b target_branch from current HEAD
    let mut cmd = git_command();
    cmd.current_dir(repo_path).args(["checkout", "-b", target_branch]);
    if let Ok(output) = cmd.output() {
        if output.status.success() {
            return Ok(());
        }
    }

    // 4. Fallback for unborn/empty repository: symbolic-ref HEAD refs/heads/<target_branch>
    let mut cmd = git_command();
    cmd.current_dir(repo_path)
        .args(["symbolic-ref", "HEAD"])
        .arg(format!("refs/heads/{}", target_branch));
    let _ = cmd.output();

    Ok(())
}

pub fn open_or_init_repo(path: &Path, target_branch: Option<&str>) -> Result<Repository, String> {
    let (repo, is_new) = if path.join(".git").exists() {
        (Repository::open(path).map_err(|e| e.to_string())?, false)
    } else {
        (Repository::init(path).map_err(|e| e.to_string())?, true)
    };
    if let Some(branch) = target_branch {
        let _ = ensure_sync_branch(path, branch);
    } else if is_new || repo.head().is_err() {
        let _ = ensure_sync_branch(path, DEFAULT_SYNC_BRANCH);
    }
    Ok(repo)
}

pub fn clone_or_open_remote_repo(
    remote_url: &str,
    target_path: &Path,
    username: &str,
    token: Option<&str>,
    target_branch: Option<&str>,
) -> Result<Repository, String> {
    let branch = target_branch.unwrap_or(DEFAULT_SYNC_BRANCH);
    if target_path.join(".git").exists() {
        let repo = Repository::open(target_path).map_err(|e| e.to_string())?;
        if !remote_url.is_empty() {
            set_remote_origin(&repo, remote_url)?;
        } else {
            sanitize_remote_credentials(&repo, "origin")?;
        }
        let _ = ensure_sync_branch(target_path, branch);
        return Ok(repo);
    }

    let sanitized_url = remove_http_userinfo(remote_url);
    let mut command = git_command();
    command.arg("clone").arg(&sanitized_url).arg(target_path);
    let output = run_git(&mut command, token, username)?;
    if !output.status.success() {
        return Err(format_git_error("Git clone failed", &output));
    }
    let _ = ensure_sync_branch(target_path, branch);
    Repository::open(target_path).map_err(|e| e.to_string())
}

pub fn get_sync_status(repo: &Repository) -> Result<SyncStatus, String> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut pending_commits = 0;
    let mut conflict_files = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        if status.is_conflicted() {
            if let Some(path) = entry.path() {
                conflict_files.push(path.to_string());
            }
        } else if status.is_wt_new()
            || status.is_wt_modified()
            || status.is_index_new()
            || status.is_index_modified()
        {
            pending_commits += 1;
        }
    }

    let (has_origin, remote_url) = match repo.find_remote("origin") {
        Ok(remote) => (true, remote.url().map(|u| remove_http_userinfo(u))),
        Err(_) => (false, None),
    };

    let current_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from))
        .unwrap_or_else(|| DEFAULT_SYNC_BRANCH.to_string());

    let state = if !conflict_files.is_empty() {
        "conflict"
    } else if !has_origin {
        "no_remote"
    } else if pending_commits > 0 {
        "pending"
    } else {
        "synced"
    };

    Ok(SyncStatus {
        state: state.to_string(),
        last_sync_time: Some(chrono::Local::now().format("%H:%M").to_string()),
        pending_commits,
        conflict_files,
        has_origin,
        remote_url,
        branch: current_branch,
    })
}

fn change_label(status: &str) -> String {
    if status.contains('U') || status == "UU" {
        "冲突".into()
    } else if status.contains('D') {
        "删除".into()
    } else if status.contains('A') || status == "??" {
        "新增".into()
    } else if status.contains('R') {
        "重命名".into()
    } else {
        "修改".into()
    }
}

fn parse_name_status_changes(output: &[u8]) -> Vec<SyncFileChange> {
    let mut changes = BTreeMap::new();
    let fields: Vec<&[u8]> = output
        .split(|byte| *byte == 0)
        .filter(|field| !field.is_empty())
        .collect();
    for pair in fields.chunks_exact(2) {
        let status = String::from_utf8_lossy(pair[0]).to_string();
        let path = String::from_utf8_lossy(pair[1]).to_string();
        changes.insert(path, change_label(&status));
    }
    changes
        .into_iter()
        .map(|(path, status)| SyncFileChange { path, status })
        .collect()
}

fn run_git_diff(repo_path: &Path, range: &str) -> Result<Vec<SyncFileChange>, String> {
    let mut command = git_command();
    command
        .current_dir(repo_path)
        .args(["diff", "--name-status", "--no-renames", "-z", range]);
    let output = command
        .output()
        .map_err(|e| format!("Cannot compare Git files: {}", e))?;
    if !output.status.success() {
        return Err(git_output_error("Git file comparison failed", &output));
    }
    Ok(parse_name_status_changes(&output.stdout))
}

pub fn preview_sync(
    repo_path: &Path,
    token: Option<&str>,
    username: &str,
    target_branch: Option<&str>,
) -> Result<SyncPreview, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let mut status_options = StatusOptions::new();
    status_options
        .include_untracked(true)
        .recurse_untracked_dirs(true);
    let status_list = repo
        .statuses(Some(&mut status_options))
        .map_err(|e| e.to_string())?;
    let mut local_changes: BTreeMap<String, String> = status_list
        .iter()
        .filter_map(|entry| {
            let path = entry.path()?.to_string();
            let status = entry.status();
            let label = if status.is_conflicted() {
                "冲突"
            } else if status.is_wt_deleted() || status.is_index_deleted() {
                "删除"
            } else if status.is_wt_new() || status.is_index_new() {
                "新增"
            } else if status.is_wt_renamed() || status.is_index_renamed() {
                "重命名"
            } else {
                "修改"
            };
            Some((path, label.to_string()))
        })
        .collect();

    let (has_origin, remote_url) = match repo.find_remote("origin") {
        Ok(remote) => (true, remote.url().map(|u| remove_http_userinfo(u))),
        Err(error) if error.code() == ErrorCode::NotFound => (false, None),
        Err(error) => return Err(error.to_string()),
    };

    let current_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from));
    let branch = match target_branch {
        Some(b) => b,
        None => match current_branch.as_deref() {
            Some("main") | Some("master") | None => DEFAULT_SYNC_BRANCH,
            Some(other) => other,
        },
    };
    let _ = ensure_sync_branch(repo_path, branch);

    if !has_origin {
        return Ok(SyncPreview {
            local_changes: local_changes
                .into_iter()
                .map(|(path, status)| SyncFileChange { path, status })
                .collect(),
            remote_changes: Vec::new(),
            possible_conflicts: Vec::new(),
            has_origin: false,
            has_remote_branch: false,
            remote_url: None,
            branch: branch.to_string(),
        });
    }

    let mut fetch = git_command();
    fetch.current_dir(repo_path)
        .args(["fetch", "origin"])
        .arg(branch);
    let fetch_output = run_git(&mut fetch, token, username)?;
    if !fetch_output.status.success() {
        let stderr = String::from_utf8_lossy(&fetch_output.stderr).to_lowercase();
        if !stderr.contains("couldn't find remote ref")
            && !stderr.contains("fatal: couldn't find remote ref")
        {
            return Err(format_git_error("Git fetch failed", &fetch_output));
        }
    }

    let remote_ref = format!("refs/remotes/origin/{}", branch);
    if repo.find_reference(&remote_ref).is_err() {
        return Ok(SyncPreview {
            local_changes: local_changes
                .into_iter()
                .map(|(path, status)| SyncFileChange { path, status })
                .collect(),
            remote_changes: Vec::new(),
            possible_conflicts: Vec::new(),
            has_origin: true,
            has_remote_branch: false,
            remote_url,
            branch: branch.to_string(),
        });
    }

    let local_commits = run_git_diff(repo_path, &format!("{}...HEAD", remote_ref))?;
    let remote_changes = run_git_diff(repo_path, &format!("HEAD...{}", remote_ref))?;
    for change in local_commits {
        local_changes.insert(change.path, change.status);
    }

    let local_paths: BTreeSet<&str> = local_changes.keys().map(String::as_str).collect();
    let possible_conflicts = remote_changes
        .iter()
        .filter(|change| local_paths.contains(change.path.as_str()))
        .map(|change| change.path.clone())
        .collect();

    Ok(SyncPreview {
        local_changes: local_changes
            .into_iter()
            .map(|(path, status)| SyncFileChange { path, status })
            .collect(),
        remote_changes,
        possible_conflicts,
        has_origin: true,
        has_remote_branch: true,
        remote_url,
        branch: branch.to_string(),
    })
}

pub fn commit_all(repo: &Repository, message: &str) -> Result<String, String> {
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index
        .update_all(["*"].iter(), None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let sig = Signature::now("mg-node", "mgnode@local").map_err(|e| e.to_string())?;

    let parent_commit = match repo.head() {
        Ok(head) => {
            let target = head.target().ok_or("Cannot resolve HEAD target")?;
            Some(repo.find_commit(target).map_err(|e| e.to_string())?)
        }
        Err(_) => None,
    };

    if let Some(parent) = &parent_commit {
        if parent.tree_id() == tree_id {
            return Ok(parent.id().to_string());
        }
    }

    let parents = match &parent_commit {
        Some(commit) => vec![commit],
        None => vec![],
    };

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_id.to_string())
}

pub fn sync_with_remote(
    repo_path: &Path,
    token: Option<&str>,
    username: &str,
    target_branch: Option<&str>,
) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let current_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from));
    let branch = match target_branch {
        Some(b) => b,
        None => match current_branch.as_deref() {
            Some("main") | Some("master") | None => DEFAULT_SYNC_BRANCH,
            Some(other) => other,
        },
    };
    let _ = ensure_sync_branch(repo_path, branch);

    match repo.find_remote("origin") {
        Ok(_) => sanitize_remote_credentials(&repo, "origin")?,
        Err(error) if error.code() == ErrorCode::NotFound => {
            return Err("NO_ORIGIN_ERROR: 此仓库尚未关联远程 Git 仓库（origin 不存在）。请先在客户端关联远程地址或发布到 GitHub/Gitee。".into());
        }
        Err(error) => return Err(error.to_string()),
    }

    let branch_ref = format!("refs/heads/{branch}");

    let mut pull = git_command();
    pull.current_dir(repo_path)
        .args(["pull", "--no-rebase", "origin"])
        .arg(branch);
    let output = run_git(&mut pull, token, username)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
        // If remote repository does not have target branch yet (new branch)
        if !stderr.contains("couldn't find remote ref")
            && !stderr.contains("fatal: couldn't find remote ref")
        {
            return Err(format_git_error("Git pull failed", &output));
        }
    }

    let mut push = git_command();
    push.current_dir(repo_path)
        .args(["push", "-u", "origin"])
        .arg(format!("HEAD:{branch_ref}"));
    let output = run_git(&mut push, token, username)?;
    if output.status.success() {
        return Ok(());
    }

    let detail = String::from_utf8_lossy(&output.stderr);
    let lower_detail = detail.to_lowercase();
    if lower_detail.contains("non-fast-forward") || lower_detail.contains("fetch first") {
        let mut retry_pull = git_command();
        retry_pull
            .current_dir(repo_path)
            .args(["pull", "--no-rebase", "origin"])
            .arg(branch);
        let retry_output = run_git(&mut retry_pull, token, username)?;
        if !retry_output.status.success() {
            return Err(format_git_error("Git pull retry failed", &retry_output));
        }

        let mut retry_push = git_command();
        retry_push
            .current_dir(repo_path)
            .args(["push", "-u", "origin"])
            .arg(format!("HEAD:{branch_ref}"));
        let retry_output = run_git(&mut retry_push, token, username)?;
        if retry_output.status.success() {
            return Ok(());
        }
        return Err(format_git_error(
            "Git push failed after retry",
            &retry_output,
        ));
    }

    Err(format_git_error("Git push failed", &output))
}

pub fn list_repository_branches(repo_path: &Path) -> Result<Vec<GitBranchItem>, String> {
    let mut cmd = git_command();
    cmd.current_dir(repo_path).args([
        "branch",
        "-a",
        "--format=%(refname:short)|%(HEAD)|%(objectname:short)|%(contents:subject)",
    ]);
    let output = cmd
        .output()
        .map_err(|e| format!("执行 git branch 失败: {}", e))?;

    if !output.status.success() {
        return Err(format_git_error("读取分支列表失败", &output));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branches = Vec::new();
    let mut seen_keys = std::collections::HashSet::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(4, '|').collect();
        let raw_name = parts.first().unwrap_or(&"").trim();
        let head_flag = parts.get(1).unwrap_or(&"").trim();
        let commit_id = parts.get(2).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let commit_message = parts.get(3).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

        if raw_name.is_empty() || raw_name.contains("HEAD ->") {
            continue;
        }

        let is_remote = raw_name.starts_with("origin/") || raw_name.contains('/');
        let display_name = if let Some(local_part) = raw_name.strip_prefix("origin/") {
            local_part
        } else {
            raw_name
        };

        let is_current = head_flag == "*";
        let is_protected = display_name == "main" || display_name == "master";

        let key = (raw_name.to_string(), is_remote);
        if seen_keys.insert(key) {
            branches.push(GitBranchItem {
                name: raw_name.to_string(),
                is_current,
                is_remote,
                is_protected,
                commit_id,
                commit_message,
            });
        }
    }

    Ok(branches)
}

pub fn switch_repository_branch(
    repo_path: &Path,
    branch_name: &str,
    create_if_missing: bool,
) -> Result<String, String> {
    let clean_branch = branch_name.trim();
    if clean_branch.is_empty() {
        return Err("分支名称不能为空".into());
    }
    if clean_branch.contains(' ') || clean_branch.contains("..") || clean_branch.starts_with('/') {
        return Err("分支名称格式不合法".into());
    }

    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    // Auto-commit existing modifications before branch checkout to prevent dirty working tree errors
    let _ = commit_all(&repo, "mg-node: auto-save before branch switch");

    let local_name = if let Some(stripped) = clean_branch.strip_prefix("origin/") {
        stripped
    } else {
        clean_branch
    };

    let local_ref = format!("refs/heads/{}", local_name);
    let local_exists = repo.find_reference(&local_ref).is_ok();

    if local_exists {
        let mut cmd = git_command();
        cmd.current_dir(repo_path).args(["checkout", local_name]);
        let output = cmd
            .output()
            .map_err(|e| format!("执行 git checkout 失败: {}", e))?;
        if !output.status.success() {
            return Err(format_git_error("切换分支失败", &output));
        }
        return Ok(local_name.to_string());
    }

    let remote_ref = format!("refs/remotes/origin/{}", local_name);
    let remote_exists = repo.find_reference(&remote_ref).is_ok();

    if remote_exists {
        let mut cmd = git_command();
        cmd.current_dir(repo_path).args([
            "checkout",
            "-b",
            local_name,
            &format!("origin/{}", local_name),
        ]);
        let output = cmd
            .output()
            .map_err(|e| format!("跟踪远程分支并切换失败: {}", e))?;
        if !output.status.success() {
            return Err(format_git_error("跟踪远程分支失败", &output));
        }
        return Ok(local_name.to_string());
    }

    if create_if_missing {
        let mut cmd = git_command();
        cmd.current_dir(repo_path).args(["checkout", "-b", local_name]);
        let output = cmd
            .output()
            .map_err(|e| format!("创建并切换新分支失败: {}", e))?;
        if !output.status.success() {
            return Err(format_git_error("创建新分支失败", &output));
        }
        return Ok(local_name.to_string());
    }

    Err(format!("目标分支 \"{}\" 不存在", local_name))
}

#[cfg(test)]
mod tests {
    use super::{
        clone_or_open_remote_repo, commit_all, configure_git_auth, remove_http_userinfo,
        sanitize_remote_credentials, sync_with_remote,
    };
    use git2::Repository;
    use std::fs;
    use std::path::Path;
    use std::process::Command;

    #[test]
    fn removes_http_userinfo_but_keeps_ssh_urls() {
        assert_eq!(
            remove_http_userinfo("https://x-access-token:secret@github.com/team/notes.git"),
            "https://github.com/team/notes.git"
        );
        assert_eq!(
            remove_http_userinfo("https://user:secret@gitee.com/team/notes.git?branch=main"),
            "https://gitee.com/team/notes.git?branch=main"
        );
        assert_eq!(
            remove_http_userinfo("git@github.com:team/notes.git"),
            "git@github.com:team/notes.git"
        );
    }

    #[test]
    fn askpass_helper_does_not_write_the_token_to_disk() {
        let mut command = Command::new("git");
        let helper = configure_git_auth(&mut command, Some("private-token"), "davin")
            .unwrap()
            .unwrap();
        let helper_path = helper.0.clone();
        let script = fs::read_to_string(&helper_path).unwrap();
        assert!(!script.contains("private-token"));
        drop(helper);
        assert!(!helper_path.exists());
    }

    #[test]
    fn strips_credentials_from_existing_remote_config() {
        let root = std::env::temp_dir().join(format!("mg-node-remote-{}", ulid::Ulid::new()));
        let result = (|| -> Result<(), String> {
            let repo = Repository::init(&root).map_err(|e| e.to_string())?;
            repo.remote("origin", "https://user:secret@example.com/team/notes.git")
                .map_err(|e| e.to_string())?;
            sanitize_remote_credentials(&repo, "origin")?;
            let remote = repo.find_remote("origin").map_err(|e| e.to_string())?;
            assert_eq!(remote.url(), Some("https://example.com/team/notes.git"));
            Ok(())
        })();
        let _ = fs::remove_dir_all(&root);
        result.unwrap();
    }

    #[test]
    fn clones_merges_and_pushes_without_empty_commits() {
        let root = std::env::temp_dir().join(format!("mg-node-sync-{}", ulid::Ulid::new()));
        let result = (|| -> Result<(), String> {
            fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            let bare_path = root.join("remote.git");
            let bare = Repository::init_bare(&bare_path).map_err(|e| e.to_string())?;
            let source_path = root.join("source");
            let source = Repository::init(&source_path).map_err(|e| e.to_string())?;
            fs::write(source_path.join("note.md"), "initial\n").map_err(|e| e.to_string())?;
            commit_all(&source, "seed remote")?;

            let branch = source
                .head()
                .map_err(|e| e.to_string())?
                .shorthand()
                .ok_or_else(|| "missing source branch".to_string())?
                .to_owned();
            let branch_ref = format!("refs/heads/{branch}");
            bare.set_head(&branch_ref).map_err(|e| e.to_string())?;
            let bare_url = bare_path
                .to_str()
                .ok_or_else(|| "invalid temporary remote path".to_string())?;
            source
                .remote("origin", bare_url)
                .map_err(|e| e.to_string())?;
            source
                .find_remote("origin")
                .map_err(|e| e.to_string())?
                .push(&[format!("{branch_ref}:{branch_ref}")], None)
                .map_err(|e| e.to_string())?;

            let checkout_path = root.join("checkout");
            let checkout = clone_or_open_remote_repo(bare_url, &checkout_path, "", None, Some(&branch))?;

            fs::write(source_path.join("remote.md"), "remote update\n")
                .map_err(|e| e.to_string())?;
            commit_all(&source, "remote update")?;
            source
                .find_remote("origin")
                .map_err(|e| e.to_string())?
                .push(&[format!("{branch_ref}:{branch_ref}")], None)
                .map_err(|e| e.to_string())?;

            fs::write(checkout_path.join("note.md"), "local update\n")
                .map_err(|e| e.to_string())?;
            let first_commit = commit_all(&checkout, "local update")?;
            let repeated_commit = commit_all(&checkout, "should not create an empty commit")?;
            assert_eq!(first_commit, repeated_commit);

            sync_with_remote(&checkout_path, None, "", Some(&branch))?;

            let bare = Repository::open_bare(&bare_path).map_err(|e| e.to_string())?;
            let remote_commit = bare
                .head()
                .and_then(|head| head.peel_to_commit())
                .map_err(|e| e.to_string())?;
            let tree = remote_commit.tree().map_err(|e| e.to_string())?;
            let local_note = bare
                .find_blob(
                    tree.get_path(Path::new("note.md"))
                        .map_err(|e| e.to_string())?
                        .id(),
                )
                .map_err(|e| e.to_string())?;
            let remote_note = bare
                .find_blob(
                    tree.get_path(Path::new("remote.md"))
                        .map_err(|e| e.to_string())?
                        .id(),
                )
                .map_err(|e| e.to_string())?;
            assert_eq!(local_note.content(), b"local update\n");
            assert_eq!(remote_note.content(), b"remote update\n");
            Ok(())
        })();

        let _ = fs::remove_dir_all(&root);
        result.unwrap();
    }

    #[test]
    fn isolates_sync_to_dedicated_note_branch() {
        let root = std::env::temp_dir().join(format!("mg-node-branch-test-{}", ulid::Ulid::new()));
        let result = (|| -> Result<(), String> {
            fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            let bare_path = root.join("remote.git");
            let _bare = Repository::init_bare(&bare_path).map_err(|e| e.to_string())?;
            let bare_url = bare_path.to_str().unwrap();

            let local_path = root.join("local");
            let repo = Repository::init(&local_path).map_err(|e| e.to_string())?;
            fs::write(local_path.join("main.txt"), "hello main\n").unwrap();
            commit_all(&repo, "main commit")?;
            repo.remote("origin", bare_url).map_err(|e| e.to_string())?;

            // Push main branch to remote first
            let mut push_main = Command::new("/usr/bin/git");
            push_main
                .current_dir(&local_path)
                .args(["push", "-u", "origin", "HEAD:main"]);
            push_main.output().unwrap();

            // Now perform sync_with_remote (which isolates to `my-git-note`)
            fs::write(local_path.join("note.md"), "secret note\n").unwrap();
            commit_all(&repo, "add note")?;
            sync_with_remote(&local_path, None, "", None)?;

            // Verify bare repo has both `main` and `my-git-note` branches, and main was NOT touched!
            let bare = Repository::open_bare(&bare_path).unwrap();
            assert!(bare.find_reference("refs/heads/main").is_ok());
            assert!(bare.find_reference("refs/heads/my-git-note").is_ok());

            let main_commit = bare
                .find_reference("refs/heads/main")
                .unwrap()
                .peel_to_commit()
                .unwrap();
            let note_commit = bare
                .find_reference("refs/heads/my-git-note")
                .unwrap()
                .peel_to_commit()
                .unwrap();
            assert_ne!(main_commit.id(), note_commit.id());
            // Verify main tree does NOT contain note.md
            assert!(main_commit
                .tree()
                .unwrap()
                .get_path(Path::new("note.md"))
                .is_err());
            // Verify my-git-note tree DOES contain note.md
            assert!(note_commit
                .tree()
                .unwrap()
                .get_path(Path::new("note.md"))
                .is_ok());

            Ok(())
        })();
        let _ = fs::remove_dir_all(&root);
        result.unwrap();
    }

    #[test]
    fn resolves_git_binary_and_checks_environment() {
        let env = super::check_git_environment();
        assert!(env.is_installed);
        assert!(env.version.is_some());
        assert!(env.binary_path.is_some());
    }

    #[test]
    fn lists_and_switches_repository_branches() {
        let root = std::env::temp_dir().join(format!("mg-node-branch-switch-{}", ulid::Ulid::new()));
        let result = (|| -> Result<(), String> {
            fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            let repo = Repository::init(&root).map_err(|e| e.to_string())?;
            fs::write(root.join("hello.txt"), "hello\n").unwrap();
            commit_all(&repo, "initial commit")?;

            // Create new branch
            let new_branch = super::switch_repository_branch(&root, "feature-daily", true)?;
            assert_eq!(new_branch, "feature-daily");

            let branches = super::list_repository_branches(&root)?;
            let current = branches.iter().find(|b| b.is_current);
            assert!(current.is_some());
            assert_eq!(current.unwrap().name, "feature-daily");

            let head_shorthand = repo.head().unwrap().shorthand().unwrap().to_string();
            assert_eq!(head_shorthand, "feature-daily");

            Ok(())
        })();
        let _ = fs::remove_dir_all(&root);
        result.unwrap();
    }
}
