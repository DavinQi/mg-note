use std::fs;
use tauri::AppHandle;
use crate::models::{NoteFileItem, Settings, SyncStatus};
use crate::storage::{get_repos_dir, load_settings, open_external, save_settings, scan_notebooks_tree};
use crate::keychain::{delete_token, get_token, save_token};
use crate::git_ops::{clone_or_open_remote_repo, commit_all, get_sync_status, open_or_init_repo, sync_with_remote};

#[tauri::command]
pub fn get_settings() -> Settings {
    load_settings()
}

#[tauri::command]
pub fn update_settings(settings: Settings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
pub fn store_keychain_token(provider: String, username: String, token: String) -> Result<(), String> {
    save_token(&provider, &username, &token)
}

#[tauri::command]
pub fn read_keychain_token(provider: String, username: String) -> Result<Option<String>, String> {
    get_token(&provider, &username)
}

#[tauri::command]
pub fn remove_keychain_token(provider: String, username: String) -> Result<(), String> {
    delete_token(&provider, &username)
}

#[tauri::command]
pub fn clone_remote_repository(remote_url: String, repo_name: String, token: Option<String>) -> Result<(), String> {
    let repo_path = get_repos_dir().join(&repo_name);
    clone_or_open_remote_repo(&remote_url, &repo_path, token.as_deref())?;
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
    let repo_path = get_repos_dir().join(&repo_name);
    if !repo_path.exists() {
        let _ = fs::create_dir_all(&repo_path);
        let _ = open_or_init_repo(&repo_path);
    }
    scan_notebooks_tree(&repo_path)
}

#[tauri::command]
pub fn read_note_content(repo_name: String, rel_path: String) -> Result<String, String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let file_path = repo_path.join("notebooks").join(&rel_path);
    if !file_path.exists() {
        return Err("Note file not found".into());
    }
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_note_content(repo_name: String, rel_path: String, content: String) -> Result<(), String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let file_path = repo_path.join("notebooks").join(&rel_path);
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_new_folder(repo_name: String, parent_folder: Option<String>, folder_name: String) -> Result<(), String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let base_dir = repo_path.join("notebooks");
    let target_dir = match parent_folder {
        Some(ref p) if !p.is_empty() => base_dir.join(p).join(&folder_name),
        _ => base_dir.join(&folder_name),
    };
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    
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
pub fn open_note_in_external(repo_name: String, rel_path: String) -> Result<(), String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let file_path = repo_path.join("notebooks").join(&rel_path);
    open_external(&file_path)
}

#[tauri::command]
pub fn perform_git_sync(repo_name: String) -> Result<SyncStatus, String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let repo = open_or_init_repo(&repo_path)?;
    let msg = format!("mg-node: auto sync {}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
    let _ = commit_all(&repo, &msg);
    let _ = sync_with_remote(&repo_path);
    get_sync_status(&repo)
}

#[tauri::command]
pub fn get_repo_sync_status(repo_name: String) -> Result<SyncStatus, String> {
    let repo_path = get_repos_dir().join(&repo_name);
    let repo = open_or_init_repo(&repo_path)?;
    get_sync_status(&repo)
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
