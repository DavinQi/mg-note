use crate::git_ops::{
    check_git_environment as ops_check_git_environment, clone_or_open_remote_repo, commit_all,
    get_sync_status, install_git_environment as ops_install_git_environment,
    list_repository_branches as ops_list_repository_branches, open_or_init_repo, preview_sync,
    remove_http_userinfo, set_remote_origin,
    switch_repository_branch as ops_switch_repository_branch, sync_with_remote,
};
use crate::keychain::{delete_token, get_token, save_token};
use crate::models::{
    GitBranchItem, GitEnvironmentStatus, ImportFilesResult, ImportFolderResult, NoteFileItem,
    SavedCredential, Settings, SyncPreview, SyncStatus,
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
