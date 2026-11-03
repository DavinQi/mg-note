use git2::{IndexAddOption, Repository, Signature, StatusOptions};
use std::path::Path;
use std::process::Command;
use crate::models::SyncStatus;

pub fn open_or_init_repo(path: &Path) -> Result<Repository, String> {
    if path.join(".git").exists() {
        Repository::open(path).map_err(|e| e.to_string())
    } else {
        Repository::init(path).map_err(|e| e.to_string())
    }
}

pub fn clone_or_open_remote_repo(
    remote_url: &str,
    target_path: &Path,
    token: Option<&str>,
) -> Result<Repository, String> {
    if target_path.join(".git").exists() {
        return Repository::open(target_path).map_err(|e| e.to_string());
    }

    // Build authenticated URL if token provided
    let auth_url = if let Some(tok) = token {
        if !tok.is_empty() && remote_url.starts_with("https://") {
            let without_https = &remote_url["https://".len()..];
            format!("https://x-access-token:{}@{}", tok, without_https)
        } else {
            remote_url.to_string()
        }
    } else {
        remote_url.to_string()
    };

    // Use /usr/bin/git to clone for maximum compatibility with network proxies & SSL
    let output = Command::new("git")
        .arg("clone")
        .arg(&auth_url)
        .arg(target_path)
        .output();

    match output {
        Ok(out) => {
            if !out.status.success() {
                let err_msg = String::from_utf8_lossy(&out.stderr);
                return Err(format!("Git 克隆失败: {}", err_msg));
            }
            Repository::open(target_path).map_err(|e| e.to_string())
        }
        Err(e) => Err(format!("无法执行 git 命令: {}", e)),
    }
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
        } else if status.is_wt_new() || status.is_wt_modified() || status.is_index_new() || status.is_index_modified() {
            pending_commits += 1;
        }
    }

    let state = if !conflict_files.is_empty() {
        "conflict"
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
    })
}

pub fn commit_all(repo: &Repository, message: &str) -> Result<String, String> {
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
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

    let parents = match &parent_commit {
        Some(c) => vec![c],
        None => vec![],
    };

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_id.to_string())
}

pub fn sync_with_remote(repo_path: &Path) -> Result<(), String> {
    // If remote origin exists, try git pull and git push
    let _ = Command::new("git")
        .current_dir(repo_path)
        .args(["pull", "--rebase"])
        .output();

    let push_res = Command::new("git")
        .current_dir(repo_path)
        .args(["push"])
        .output();

    if let Ok(res) = push_res {
        if !res.status.success() {
            let err = String::from_utf8_lossy(&res.stderr);
            log::warn!("Git push notice: {}", err);
        }
    }

    Ok(())
}
