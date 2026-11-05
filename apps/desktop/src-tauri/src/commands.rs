use crate::git_ops::{
    check_git_environment as ops_check_git_environment, clone_or_open_remote_repo, commit_all,
    get_sync_status, install_git_environment as ops_install_git_environment,
    list_repository_branches as ops_list_repository_branches, open_or_init_repo, preview_sync,
    remove_http_userinfo, set_remote_origin,
    switch_repository_branch as ops_switch_repository_branch, sync_with_remote,
};
use crate::keychain::{delete_token, get_token, save_token};
use crate::models::{
    DataRootGroupInfo, GitBranchItem, GitEnvironmentStatus, ImportFilesResult, ImportFolderResult,
    NoteFileItem, RepoStorageUsage, SavedCredential, Settings, SyncPreview, SyncStatus,
};
use crate::storage::{
    forget_saved_credential, get_repos_dir, load_saved_credentials, load_settings, open_external,
    remember_saved_credential, save_settings, scan_notebooks_tree,
};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

fn validate_relative_path(value: &str, allow_empty: bool) -> Result<PathBuf, String> {
    if value.is_empty() {
        return if allow_empty {
            Ok(PathBuf::new())
        } else {
            Err("路径不能为空".into())
        };
    }
    if value.starts_with('/') || value.contains('\\') || value.contains('\0') {
        return Err("路径格式无效".into());
    }

    let mut path = PathBuf::new();
    for part in value.split('/') {
        if part.is_empty() || part == "." || part == ".." {
            return Err("路径不能包含空段或目录跳转".into());
        }
        path.push(part);
    }
    if path
        .components()
        .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("路径格式无效".into());
    }
    Ok(path)
}

fn repository_path(repo_name: &str) -> Result<PathBuf, String> {
    let repo = validate_relative_path(repo_name, false)?;
    if repo.components().count() != 1 {
        return Err("仓库名称无效".into());
    }
    Ok(get_repos_dir().join(repo))
}

fn notebook_root(repo_name: &str) -> Result<PathBuf, String> {
    Ok(repository_path(repo_name)?.join("notebooks"))
}

fn notebook_paths(repo_name: &str, rel_path: &str) -> Result<(PathBuf, PathBuf), String> {
    let rel = validate_relative_path(rel_path, false)?;
    let root = notebook_root(repo_name)?;
    Ok((root.clone(), root.join(rel)))
}

fn escape_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn max_child_folder_depth(folder: &Path) -> Result<usize, String> {
    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;
    let mut max_depth = 0;
    for entry in entries {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_dir() {
            max_depth = max_depth.max(1 + max_child_folder_depth(&path)?);
        }
    }
    Ok(max_depth)
}

#[tauri::command]
pub fn get_settings() -> Settings {
    load_settings()
}

#[tauri::command]
pub fn update_settings(settings: Settings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
pub fn store_keychain_token(
    provider: String,
    username: String,
    token: String,
) -> Result<(), String> {
    remember_saved_credential(&provider, &username)?;
    save_token(&provider.to_ascii_lowercase(), &username, &token)
}

#[tauri::command]
pub fn read_keychain_token(provider: String, username: String) -> Result<Option<String>, String> {
    get_token(&provider.to_ascii_lowercase(), &username)
}

#[tauri::command]
pub fn remove_keychain_token(provider: String, username: String) -> Result<(), String> {
    delete_token(&provider.to_ascii_lowercase(), &username)?;
    forget_saved_credential(&provider, &username)
}

#[tauri::command]
pub fn list_keychain_accounts() -> Result<Vec<SavedCredential>, String> {
    load_saved_credentials()
}

#[tauri::command]
pub fn remember_keychain_account(provider: String, username: String) -> Result<(), String> {
    if get_token(&provider.to_ascii_lowercase(), &username)?.is_none() {
        return Err("当前登录没有对应的已保存密钥".into());
    }
    remember_saved_credential(&provider, &username)
}

#[tauri::command]
pub fn clone_remote_repository(
    remote_url: String,
    repo_name: String,
    username: String,
    token: Option<String>,
) -> Result<(), String> {
    let repo_path = repository_path(&repo_name)?;
    clone_or_open_remote_repo(&remote_url, &repo_path, &username, token.as_deref(), None)?;
    Ok(())
}

#[tauri::command]
pub fn list_local_repos() -> Result<Vec<String>, String> {
    let repos_dir = get_repos_dir();
    let mut names = Vec::new();
    if let Ok(entries) = fs::read_dir(repos_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    names.push(name.to_string());
                }
            }
        }
    }
    Ok(names)
}

#[tauri::command]
pub fn list_notebooks_tree(repo_name: String) -> Result<Vec<NoteFileItem>, String> {
    let repo_path = repository_path(&repo_name)?;
    if !repo_path.exists() {
        let _ = fs::create_dir_all(&repo_path);
        let _ = open_or_init_repo(&repo_path, None);
    }
    scan_notebooks_tree(&repo_path)
}

#[tauri::command]
pub fn read_note_content(repo_name: String, rel_path: String) -> Result<String, String> {
    let (_, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if !file_path.exists() {
        return Err("Note file not found".into());
    }
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

fn ensure_folder_metadata(dir: &Path, root: &Path) {
    if dir == root || !dir.starts_with(root) {
        return;
    }
    let meta_file = dir.join("_folder.json");
    if !meta_file.exists() {
        if let Some(folder_name) = dir.file_name().and_then(|n| n.to_str()) {
            let meta = serde_json::json!({
                "name": folder_name,
                "created": chrono::Local::now().to_rfc3339(),
                "order": []
            });
            let _ = fs::write(meta_file, meta.to_string());
        }
    }
    if let Some(parent) = dir.parent() {
        ensure_folder_metadata(parent, root);
    }
}

#[tauri::command]
pub fn save_note_content(
    repo_name: String,
    rel_path: String,
    content: String,
) -> Result<(), String> {
    let (root, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
        ensure_folder_metadata(parent, &root);
    }
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_new_folder(
    repo_name: String,
    parent_folder: Option<String>,
    folder_name: String,
) -> Result<(), String> {
    let base_dir = notebook_root(&repo_name)?;
    let folder_name_path = validate_relative_path(&folder_name, false)?;
    if folder_name_path.components().count() != 1 {
        return Err("文件夹名称无效".into());
    }
    let parent_path = validate_relative_path(parent_folder.as_deref().unwrap_or(""), true)?;
    if parent_path.components().count() > 10 {
        return Err("文件夹层级最多支持10级".into());
    }
    let parent_dir = base_dir.join(parent_path);
    if !parent_dir.is_dir() {
        return Err("上级文件夹不存在".into());
    }
    let target_dir = parent_dir.join(&folder_name_path);
    fs::create_dir(&target_dir).map_err(|e| {
        if e.kind() == std::io::ErrorKind::AlreadyExists {
            "同名文件夹已存在".to_string()
        } else {
            e.to_string()
        }
    })?;

    // Create _folder.json to keep git tracking and store metadata
    let meta_file = target_dir.join("_folder.json");
    if !meta_file.exists() {
        let meta = serde_json::json!({
            "name": folder_name,
            "created": chrono::Local::now().to_rfc3339(),
            "order": []
        });
        let _ = fs::write(meta_file, meta.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn move_notebook_item(
    repo_name: String,
    source_path: String,
    destination_folder: String,
) -> Result<String, String> {
    let (base_dir, source_rel) = notebook_paths(&repo_name, &source_path)?;
    let destination_rel = validate_relative_path(&destination_folder, true)?;
    let destination_dir = base_dir.join(&destination_rel);
    if !destination_dir.is_dir() {
        return Err("目标文件夹不存在".into());
    }

    let source = base_dir.join(&source_rel);
    if !source.exists() {
        return Err("要移动的文件或文件夹不存在".into());
    }
    if destination_rel.components().count() > 10 {
        return Err("文件夹层级最多支持10级".into());
    }

    let name = source.file_name().ok_or_else(|| "源路径无效".to_string())?;
    let destination = destination_dir.join(name);
    if destination == source {
        return Ok(source_rel.to_string_lossy().into_owned());
    }
    if source.is_dir() && destination.starts_with(&source) {
        return Err("不能把文件夹移动到它自身或其子文件夹中".into());
    }
    if destination.exists() {
        return Err("目标位置已存在同名文件或文件夹".into());
    }

    if source.is_dir() {
        let new_depth = destination_rel.components().count() + 1 + max_child_folder_depth(&source)?;
        if new_depth > 10 {
            return Err("移动后会超过10级文件夹限制".into());
        }
    }

    fs::rename(&source, &destination).map_err(|e| e.to_string())?;
    Ok(destination
        .strip_prefix(&base_dir)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/"))
}

#[tauri::command]
pub fn read_docx_html(repo_name: String, rel_path: String) -> Result<String, String> {
    let (_, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        != Some("docx".into())
    {
        return Err("文件不是 DOCX 文档".into());
    }
    if !file_path.is_file() {
        return Err("DOCX 文档不存在".into());
    }

    let output = Command::new("/usr/bin/textutil")
        .args(["-convert", "html", "-stdout"])
        .arg(&file_path)
        .output()
        .map_err(|e| format!("无法启动 macOS 文档转换工具：{e}"))?;
    if !output.status.success() {
        let conversion_error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let raw_content = fs::read(&file_path).map_err(|e| e.to_string())?;
        if let Ok(text_content) = String::from_utf8(raw_content) {
            let contains_binary_control = text_content.chars().any(|character| {
                character == '\0'
                    || (character.is_control() && !matches!(character, '\n' | '\r' | '\t'))
            });
            if !contains_binary_control {
                return Ok(format!(
                    "<!doctype html><html><body><pre>{}</pre></body></html>",
                    escape_html_text(&text_content)
                ));
            }
        }
        return Err(conversion_error);
    }
    String::from_utf8(output.stdout).map_err(|e| format!("DOCX 转换结果编码无效：{e}"))
}

#[tauri::command]
pub fn save_docx_html(repo_name: String, rel_path: String, html: String) -> Result<(), String> {
    let (root, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        != Some("docx".into())
    {
        return Err("文件不是 DOCX 文档".into());
    }
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        ensure_folder_metadata(parent, &root);
    }

    let temp_dir = std::env::temp_dir().join(format!("mg-node-docx-{}", ulid::Ulid::new()));
    fs::create_dir(&temp_dir).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Err(error) = fs::set_permissions(&temp_dir, fs::Permissions::from_mode(0o700)) {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(error.to_string());
        }
    }
    let input_path = temp_dir.join("document.html");
    let output_path = temp_dir.join("document.docx");
    let conversion_result = (|| {
        fs::write(&input_path, html.as_bytes()).map_err(|e| e.to_string())?;
        let output = Command::new("/usr/bin/textutil")
            .args(["-convert", "docx", "-output"])
            .arg(&output_path)
            .arg(&input_path)
            .output()
            .map_err(|e| format!("无法启动 macOS 文档转换工具：{e}"))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        fs::read(&output_path).map_err(|e| e.to_string())
    })();
    let _ = fs::remove_dir_all(&temp_dir);
    let bytes = conversion_result?;

    let temp_file = file_path.with_file_name(format!(".mg-node-{}.docx.tmp", ulid::Ulid::new()));
    fs::write(&temp_file, bytes).map_err(|e| e.to_string())?;
    if let Err(error) = fs::rename(&temp_file, &file_path) {
        let _ = fs::remove_file(&temp_file);
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn open_note_in_external(repo_name: String, rel_path: String) -> Result<(), String> {
    let (_, file_path) = notebook_paths(&repo_name, &rel_path)?;
    open_external(&file_path)
}

#[tauri::command]
pub fn perform_git_sync(
    repo_name: String,
    provider: String,
    username: String,
    target_branch: Option<String>,
) -> Result<SyncStatus, String> {
    let repo_path = repository_path(&repo_name)?;
    let repo = open_or_init_repo(&repo_path, target_branch.as_deref())?;
    let msg = format!(
        "mg-node: auto sync {}",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    );
    commit_all(&repo, &msg)?;
    let token = get_token(&provider.to_lowercase(), &username)?;
    if token.as_deref().map_or(true, |t| t.trim().is_empty()) {
        if let Ok(origin) = repo.find_remote("origin") {
            if let Some(url) = origin.url() {
                if url.starts_with("http://") || url.starts_with("https://") {
                    return Err(format!(
                        "PERMISSION_ERROR: 未在钥匙串中找到 {} 用户 {} 的授权 Token。请先使用 Personal Access Token 登录或在设置中配置密钥。",
                        provider, username
                    ));
                }
            }
        }
    }
    sync_with_remote(&repo_path, token.as_deref(), &username, target_branch.as_deref())?;
    get_sync_status(&repo)
}

#[tauri::command]
pub fn preview_git_sync(
    repo_name: String,
    provider: String,
    username: String,
    target_branch: Option<String>,
) -> Result<SyncPreview, String> {
    let repo_path = repository_path(&repo_name)?;
    let repo = open_or_init_repo(&repo_path, target_branch.as_deref())?;
    let token = get_token(&provider.to_lowercase(), &username)?;
    if token.as_deref().map_or(true, |t| t.trim().is_empty()) {
        if let Ok(origin) = repo.find_remote("origin") {
            if let Some(url) = origin.url() {
                if url.starts_with("http://") || url.starts_with("https://") {
                    return Err(format!(
                        "PERMISSION_ERROR: 未在钥匙串中找到 {} 用户 {} 的授权 Token。请先使用 Personal Access Token 登录或在设置中配置密钥。",
                        provider, username
                    ));
                }
            }
        }
    }
    preview_sync(&repo_path, token.as_deref(), &username, target_branch.as_deref())
}

#[tauri::command]
pub fn check_git_environment() -> GitEnvironmentStatus {
    ops_check_git_environment()
}

#[tauri::command]
pub fn install_git_environment() -> Result<String, String> {
    ops_install_git_environment()
}

#[tauri::command]
pub fn list_repository_branches(repo_name: String) -> Result<Vec<GitBranchItem>, String> {
    let repo_path = repository_path(&repo_name)?;
    let _repo = open_or_init_repo(&repo_path, None)?;
    ops_list_repository_branches(&repo_path)
}

#[tauri::command]
pub fn switch_repository_branch(
    repo_name: String,
    branch_name: String,
    create_if_missing: Option<bool>,
) -> Result<String, String> {
    let repo_path = repository_path(&repo_name)?;
    let _repo = open_or_init_repo(&repo_path, None)?;
    ops_switch_repository_branch(&repo_path, &branch_name, create_if_missing.unwrap_or(false))
}

#[tauri::command]
pub fn get_repo_sync_status(repo_name: String) -> Result<SyncStatus, String> {
    let repo_path = repository_path(&repo_name)?;
    let repo = open_or_init_repo(&repo_path, None)?;
    get_sync_status(&repo)
}

#[tauri::command]
pub fn set_repository_remote(repo_name: String, remote_url: String) -> Result<(), String> {
    let repo_path = repository_path(&repo_name)?;
    let repo = open_or_init_repo(&repo_path, None)?;
    set_remote_origin(&repo, &remote_url)
}

#[tauri::command]
pub fn get_repository_remote(repo_name: String) -> Result<Option<String>, String> {
    let repo_path = repository_path(&repo_name)?;
    let repo = open_or_init_repo(&repo_path, None)?;
    let url = match repo.find_remote("origin") {
        Ok(remote) => remote.url().map(|u| remove_http_userinfo(u)),
        Err(_) => None,
    };
    Ok(url)
}

#[tauri::command]
pub fn read_file_bytes(repo_name: String, rel_path: String) -> Result<Vec<u8>, String> {
    let (_root, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if !file_path.exists() {
        return Err("文档不存在".into());
    }
    fs::read(&file_path).map_err(|e| format!("读取文件失败：{e}"))
}

#[tauri::command]
pub fn save_file_bytes(
    repo_name: String,
    rel_path: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let (root, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        ensure_folder_metadata(parent, &root);
    }
    let temp_file = file_path.with_file_name(format!(".mg-node-{}.tmp", ulid::Ulid::new()));
    fs::write(&temp_file, &bytes).map_err(|e| format!("写入临时文件失败：{e}"))?;
    if let Err(error) = fs::rename(&temp_file, &file_path) {
        let _ = fs::remove_file(&temp_file);
        return Err(format!("重命名文档失败：{error}"));
    }
    Ok(())
}

#[tauri::command]
pub fn import_file_bytes(
    repo_name: String,
    rel_path: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let (root, file_path) = notebook_paths(&repo_name, &rel_path)?;
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
        ensure_folder_metadata(parent, &root);
    }
    fs::write(&file_path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_local_files(
    repo_name: String,
    source_paths: Vec<String>,
    target_folder: String,
) -> Result<ImportFilesResult, String> {
    let base_dir = notebook_root(&repo_name)?;
    let target_path = validate_relative_path(&target_folder, true)?;
    let dest_dir = base_dir.join(&target_path);
    if !dest_dir.exists() {
        fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    }
    ensure_folder_metadata(&dest_dir, &base_dir);

    let mut success_count = 0;
    let mut imported_files = Vec::new();
    let mut errors = Vec::new();

    for src_str in &source_paths {
        let src = Path::new(src_str);
        if !src.exists() || !src.is_file() {
            errors.push(format!("源文件不存在或不是文件：{}", src_str));
            continue;
        }

        let file_name = match src.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => {
                errors.push(format!("无法解析文件名：{}", src_str));
                continue;
            }
        };

        if file_name.starts_with('.') || file_name == "_folder.json" {
            continue;
        }

        let mut final_name = file_name.clone();
        let file_stem = Path::new(&file_name)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let file_ext = Path::new(&file_name)
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();

        let mut counter = 1;
        while dest_dir.join(&final_name).exists() {
            final_name = format!("{} ({}){}", file_stem, counter, file_ext);
            counter += 1;
        }

        let dest_file = dest_dir.join(&final_name);
        match fs::copy(src, &dest_file) {
            Ok(_) => {
                let rel_file = if target_folder.is_empty() {
                    final_name
                } else {
                    format!("{}/{}", target_folder, final_name)
                };
                imported_files.push(rel_file);
                success_count += 1;
            }
            Err(e) => {
                errors.push(format!("复制文件 {} 失败：{}", file_name, e));
            }
        }
    }

    Ok(ImportFilesResult {
        success_count,
        total_count: source_paths.len(),
        imported_files,
        errors,
    })
}

fn copy_folder_recursive(
    src: &Path,
    dst: &Path,
    base_root: &Path,
    file_count: &mut usize,
    folder_count: &mut usize,
) -> Result<(), String> {
    let entries = match fs::read_dir(src) {
        Ok(e) => e,
        Err(err) => return Err(format!("读取文件夹失败: {err}")),
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry_path.file_name().unwrap_or_default().to_string_lossy().to_string();

        if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
            continue;
        }

        if entry_path.is_dir() {
            let sub_dst = dst.join(&name);
            fs::create_dir_all(&sub_dst).map_err(|e| e.to_string())?;
            ensure_folder_metadata(&sub_dst, base_root);
            *folder_count += 1;
            copy_folder_recursive(&entry_path, &sub_dst, base_root, file_count, folder_count)?;
        } else if entry_path.is_file() {
            let sub_dst = dst.join(&name);
            if fs::copy(&entry_path, &sub_dst).is_ok() {
                *file_count += 1;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn import_local_folder(
    repo_name: String,
    source_folder_path: String,
    target_folder: String,
) -> Result<ImportFolderResult, String> {
    let base_dir = notebook_root(&repo_name)?;
    let target_path = validate_relative_path(&target_folder, true)?;
    let parent_dest_dir = base_dir.join(&target_path);
    if !parent_dest_dir.exists() {
        fs::create_dir_all(&parent_dest_dir).map_err(|e| e.to_string())?;
    }
    ensure_folder_metadata(&parent_dest_dir, &base_dir);

    let src_dir = Path::new(&source_folder_path);
    if !src_dir.exists() || !src_dir.is_dir() {
        return Err("指定的源路径不存在或不是文件夹".into());
    }

    let folder_name = match src_dir.file_name() {
        Some(name) => name.to_string_lossy().to_string(),
        None => return Err("无法获取源文件夹名称".into()),
    };

    if folder_name.starts_with('.') {
        return Err("不能导入以点开头的隐藏文件夹".into());
    }

    let mut final_folder_name = folder_name.clone();
    let mut counter = 1;
    while parent_dest_dir.join(&final_folder_name).exists() {
        final_folder_name = format!("{} ({})", folder_name, counter);
        counter += 1;
    }

    let dest_folder = parent_dest_dir.join(&final_folder_name);
    fs::create_dir_all(&dest_folder).map_err(|e| format!("创建目标文件夹失败: {}", e))?;

    let meta_file = dest_folder.join("_folder.json");
    let meta = serde_json::json!({
        "name": final_folder_name,
        "created": chrono::Local::now().to_rfc3339(),
        "order": []
    });
    let _ = fs::write(meta_file, meta.to_string());

    let mut file_count = 0;
    let mut folder_count = 1;

    copy_folder_recursive(&src_dir, &dest_folder, &base_dir, &mut file_count, &mut folder_count)?;

    let rel_path = if target_folder.is_empty() {
        final_folder_name.clone()
    } else {
        format!("{}/{}", target_folder, final_folder_name)
    };

    Ok(ImportFolderResult {
        folder_name: final_folder_name,
        rel_path,
        file_count,
        folder_count,
    })
}

fn dir_size_and_count(path: &Path) -> (u64, usize) {
    let mut size = 0;
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    size += meta.len();
                    count += 1;
                } else if meta.is_dir() {
                    let (sub_size, sub_count) = dir_size_and_count(&p);
                    size += sub_size;
                    count += sub_count;
                }
            }
        }
    }
    (size, count)
}

fn format_bytes(bytes: u64) -> String {
    if bytes >= 1024 * 1024 * 1024 {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    } else if bytes >= 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else if bytes >= 1024 {
        format!("{:.0} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

fn inspect_repo_storage(repo_name: &str) -> Result<RepoStorageUsage, String> {
    let repo_path = repository_path(repo_name)?;
    let notebook_dir = repo_path.join("notebooks");
    let git_dir = repo_path.join(".git");

    let (working_size_bytes, file_count) = if notebook_dir.is_dir() {
        dir_size_and_count(&notebook_dir)
    } else {
        (0, 0)
    };

    let (git_size_bytes, _) = if git_dir.is_dir() {
        dir_size_and_count(&git_dir)
    } else {
        (0, 0)
    };

    let total_size_bytes = working_size_bytes + git_size_bytes;
    let total_size_formatted = format_bytes(total_size_bytes);

    // Try to inspect git remote
    let mut remote_url = None;
    let mut remote_provider = "local".to_string();
    if let Ok(repo) = git2::Repository::open(&repo_path) {
        if let Ok(remote) = repo.find_remote("origin") {
            if let Some(url) = remote.url() {
                remote_url = Some(url.to_string());
                let lower = url.to_lowercase();
                if lower.contains("gitee.com") {
                    remote_provider = "gitee".to_string();
                } else if lower.contains("github.com") {
                    remote_provider = "github".to_string();
                } else {
                    remote_provider = "git".to_string();
                }
            }
        }
    }

    // Determine estimated quota based on provider
    let quota_bytes: u64 = match remote_provider.as_str() {
        "gitee" => 500 * 1024 * 1024,   // 500 MB
        "github" => 1024 * 1024 * 1024, // 1 GB
        _ => 5 * 1024 * 1024 * 1024,    // 5 GB for local
    };
    let quota_formatted = format_bytes(quota_bytes);

    let usage_percentage = if quota_bytes > 0 {
        ((total_size_bytes as f64 / quota_bytes as f64) * 100.0) as f32
    } else {
        0.0
    };

    let health_status = if usage_percentage >= 85.0 {
        "critical".to_string()
    } else if usage_percentage >= 70.0 {
        "warning".to_string()
    } else {
        "healthy".to_string()
    };

    Ok(RepoStorageUsage {
        repo_name: repo_name.to_string(),
        working_size_bytes,
        git_size_bytes,
        total_size_bytes,
        total_size_formatted,
        file_count,
        quota_bytes,
        quota_formatted,
        usage_percentage,
        health_status,
        remote_provider,
        remote_url,
    })
}

#[tauri::command]
pub fn get_repo_storage_usage(repo_name: String) -> Result<RepoStorageUsage, String> {
    inspect_repo_storage(&repo_name)
}

#[tauri::command]
pub fn list_data_root_groups(current_repo: Option<String>) -> Result<Vec<DataRootGroupInfo>, String> {
    let repos_dir = get_repos_dir();
    let mut groups = Vec::new();

    if let Ok(entries) = fs::read_dir(&repos_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    // Skip hidden dirs
                    if name.starts_with('.') {
                        continue;
                    }

                    if let Ok(usage) = inspect_repo_storage(name) {
                        let repo_path = repos_dir.join(name);
                        let mut current_branch = "my-git-note".to_string();
                        let mut last_sync_time = None;

                        if let Ok(repo) = git2::Repository::open(&repo_path) {
                            if let Ok(head) = repo.head() {
                                if let Some(bname) = head.shorthand() {
                                    current_branch = bname.to_string();
                                }
                            }
                            if let Ok(commit) = repo.head().and_then(|h| h.peel_to_commit()) {
                                let time = commit.time();
                                let dt = chrono::DateTime::from_timestamp(time.seconds(), 0);
                                if let Some(local_dt) = dt {
                                    last_sync_time = Some(local_dt.format("%Y-%m-%d %H:%M").to_string());
                                }
                            }
                        }

                        let is_current = current_repo.as_deref().map_or(false, |cur| cur == name);
                        let display_name = name.to_string();

                        groups.push(DataRootGroupInfo {
                            name: name.to_string(),
                            display_name,
                            provider: usage.remote_provider,
                            remote_url: usage.remote_url,
                            total_size_bytes: usage.total_size_bytes,
                            total_size_formatted: usage.total_size_formatted,
                            quota_bytes: usage.quota_bytes,
                            quota_formatted: usage.quota_formatted,
                            usage_percentage: usage.usage_percentage,
                            health_status: usage.health_status,
                            file_count: usage.file_count,
                            current_branch,
                            last_sync_time,
                            is_current,
                        });
                    }
                }
            }
        }
    }

    // Sort: current first, then alphabetically
    groups.sort_by(|a, b| {
        b.is_current.cmp(&a.is_current).then_with(|| a.name.cmp(&b.name))
    });

    Ok(groups)
}

#[tauri::command]
pub fn create_data_root_group(
    name: String,
    display_name: Option<String>,
    provider: Option<String>,
    remote_url: Option<String>,
) -> Result<DataRootGroupInfo, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("数据根组名称不能为空".into());
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err("名称不能包含路径分隔符或非法字符".into());
    }

    let repos_dir = get_repos_dir();
    let repo_path = repos_dir.join(trimmed);
    if repo_path.exists() {
        return Err(format!("数据根组「{}」已存在", trimmed));
    }

    let notebook_dir = repo_path.join("notebooks");
    fs::create_dir_all(&notebook_dir).map_err(|e| format!("创建目录失败：{e}"))?;

    // Create a welcoming note in the new root group
    let disp = display_name.clone().unwrap_or_else(|| trimmed.to_string());
    let welcome_content = format!(
        "# 数据根组：{}\n\n- 创建日期：{}\n- 存储类型：{}\n\n本数据根组为独立的 Git 仓库，可独立扩容与同步。\n",
        disp,
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        provider.as_deref().unwrap_or("本地仓库")
    );
    let _ = fs::write(notebook_dir.join("关于本数据根组.md"), welcome_content);

    // Initialize git repository
    let repo = open_or_init_repo(&repo_path, None)?;

    // If remote URL is given, bind remote origin
    if let Some(ref r_url) = remote_url {
        if !r_url.trim().is_empty() {
            let _ = set_remote_origin(&repo, r_url.trim());
        }
    }

    // Initial commit
    let _ = commit_all(&repo, &format!("mg-node: initialize data root group [{}]", trimmed));

    let usage = inspect_repo_storage(trimmed)?;
    Ok(DataRootGroupInfo {
        name: trimmed.to_string(),
        display_name: disp,
        provider: usage.remote_provider,
        remote_url: usage.remote_url,
        total_size_bytes: usage.total_size_bytes,
        total_size_formatted: usage.total_size_formatted,
        quota_bytes: usage.quota_bytes,
        quota_formatted: usage.quota_formatted,
        usage_percentage: usage.usage_percentage,
        health_status: usage.health_status,
        file_count: usage.file_count,
        current_branch: "my-git-note".to_string(),
        last_sync_time: Some(chrono::Local::now().format("%Y-%m-%d %H:%M").to_string()),
        is_current: true,
    })
}

#[tauri::command]
pub fn move_item_between_repos(
    source_repo: String,
    source_path: String,
    target_repo: String,
    target_folder: String,
    is_folder: bool,
) -> Result<String, String> {
    if source_repo == target_repo {
        return Err("源数据根组与目标数据根组相同，无需跨根组迁移".into());
    }

    let source_root = notebook_root(&source_repo)?;
    let target_root = notebook_root(&target_repo)?;

    let source_rel = validate_relative_path(&source_path, false)?;
    let target_folder_rel = validate_relative_path(&target_folder, true)?;

    let source_abs = source_root.join(&source_rel);
    if !source_abs.exists() {
        return Err("源文档或文件夹不存在".into());
    }

    let file_name = source_abs
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "文件名无效".to_string())?;

    let target_dir = target_root.join(&target_folder_rel);
    fs::create_dir_all(&target_dir).map_err(|e| format!("创建目标目录失败：{e}"))?;

    let mut dest_path = target_dir.join(file_name);
    let mut final_filename = file_name.to_string();

    // Handle collision in target
    if dest_path.exists() {
        let (stem, ext) = if is_folder {
            (file_name.to_string(), "".to_string())
        } else {
            let path_obj = Path::new(file_name);
            let s = path_obj.file_stem().and_then(|s| s.to_str()).unwrap_or(file_name).to_string();
            let e = path_obj.extension().and_then(|e| e.to_str()).map(|e| format!(".{}", e)).unwrap_or_default();
            (s, e)
        };

        let mut idx = 1;
        while dest_path.exists() {
            final_filename = format!("{} ({}){}", stem, idx, ext);
            dest_path = target_dir.join(&final_filename);
            idx += 1;
        }
    }

    // Move file/folder across repositories
    if is_folder {
        let mut f_cnt = 0;
        let mut d_cnt = 0;
        copy_folder_recursive(&source_abs, &dest_path, &target_root, &mut f_cnt, &mut d_cnt)?;
        let _ = fs::remove_dir_all(&source_abs);
    } else {
        if let Err(_) = fs::rename(&source_abs, &dest_path) {
            fs::copy(&source_abs, &dest_path).map_err(|e| format!("复制文件失败：{e}"))?;
            let _ = fs::remove_file(&source_abs);
        }
    }

    // Commit deletion in source repo
    let source_repo_path = repository_path(&source_repo)?;
    if let Ok(s_repo) = git2::Repository::open(&source_repo_path) {
        let _ = commit_all(&s_repo, &format!("mg-node: migrate [{}] to vault [{}]", file_name, target_repo));
    }

    // Commit addition in target repo
    let target_repo_path = repository_path(&target_repo)?;
    if let Ok(t_repo) = git2::Repository::open(&target_repo_path) {
        let _ = commit_all(&t_repo, &format!("mg-node: receive [{}] from vault [{}]", final_filename, source_repo));
    }

    let final_rel_path = if target_folder.is_empty() {
        final_filename
    } else {
        format!("{}/{}", target_folder, final_filename)
    };

    Ok(final_rel_path)
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    crate::ALLOW_EXIT.store(true, std::sync::atomic::Ordering::SeqCst);
    app.exit(0);
    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_import_local_files_and_collision() {
        let temp_test_dir = std::env::temp_dir().join(format!("mg_test_import_{}", ulid::Ulid::new()));
        let _ = fs::create_dir_all(&temp_test_dir);
        let repo_dir = get_repos_dir().join("test_import_repo");
        let _ = fs::remove_dir_all(&repo_dir);
        let notebook_dir = repo_dir.join("notebooks");
        fs::create_dir_all(&notebook_dir).expect("create notebooks");

        let src_file1 = temp_test_dir.join("demo.md");
        fs::write(&src_file1, "# Hello World").expect("write src");

        let res = import_local_files(
            "test_import_repo".into(),
            vec![src_file1.to_string_lossy().to_string()],
            "subfolder".into(),
        ).expect("import files");

        assert_eq!(res.success_count, 1);
        assert_eq!(res.imported_files[0], "subfolder/demo.md");
        assert!(notebook_dir.join("subfolder/demo.md").exists());
        assert!(notebook_dir.join("subfolder/_folder.json").exists());

        // Import again to test collision
        let res2 = import_local_files(
            "test_import_repo".into(),
            vec![src_file1.to_string_lossy().to_string()],
            "subfolder".into(),
        ).expect("import collision");

        assert_eq!(res2.success_count, 1);
        assert_eq!(res2.imported_files[0], "subfolder/demo (1).md");
        assert!(notebook_dir.join("subfolder/demo (1).md").exists());

        let _ = fs::remove_dir_all(&repo_dir);
        let _ = fs::remove_dir_all(&temp_test_dir);
    }

    #[test]
    fn test_import_local_folder_recursive() {
        let temp_test_dir = std::env::temp_dir().join(format!("mg_test_folder_{}", ulid::Ulid::new()));
        let _ = fs::create_dir_all(&temp_test_dir);
        let repo_dir = get_repos_dir().join("test_import_folder_repo");
        let _ = fs::remove_dir_all(&repo_dir);
        let notebook_dir = repo_dir.join("notebooks");
        fs::create_dir_all(&notebook_dir).expect("create notebooks");

        let src_folder = temp_test_dir.join("MyNotes");
        let sub_folder = src_folder.join("Nested");
        fs::create_dir_all(&sub_folder).expect("create sub_folder");
        fs::write(src_folder.join("root_note.md"), "Root note content").expect("write note");
        fs::write(sub_folder.join("nested_note.txt"), "Nested note content").expect("write txt");

        let res = import_local_folder(
            "test_import_folder_repo".into(),
            src_folder.to_string_lossy().to_string(),
            "".into(),
        ).expect("import folder");

        assert_eq!(res.folder_name, "MyNotes");
        assert_eq!(res.file_count, 2);
        assert!(notebook_dir.join("MyNotes/root_note.md").exists());
        assert!(notebook_dir.join("MyNotes/Nested/nested_note.txt").exists());
        assert!(notebook_dir.join("MyNotes/_folder.json").exists());
        assert!(notebook_dir.join("MyNotes/Nested/_folder.json").exists());

        let _ = fs::remove_dir_all(&repo_dir);
        let _ = fs::remove_dir_all(&temp_test_dir);
    }
}
