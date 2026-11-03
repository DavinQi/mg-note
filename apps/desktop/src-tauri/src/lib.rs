pub mod models;
pub mod keychain;
pub mod storage;
pub mod git_ops;
pub mod commands;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::store_keychain_token,
            commands::read_keychain_token,
            commands::remove_keychain_token,
            commands::clone_remote_repository,
            commands::list_local_repos,
            commands::list_notebooks_tree,
            commands::read_note_content,
            commands::save_note_content,
            commands::create_new_folder,
            commands::open_note_in_external,
            commands::perform_git_sync,
            commands::get_repo_sync_status,
            commands::exit_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            // Intercept exit to let UI show Quit-Sync sheet
            api.prevent_exit();
            let _ = app_handle.emit("exit-requested", ());
        }
    });
}
