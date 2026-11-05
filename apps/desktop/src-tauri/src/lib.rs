pub mod commands;
pub mod git_ops;
pub mod keychain;
pub mod models;
pub mod storage;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

pub static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "macos")]
fn setup_macos_dock_icon() {
    use cocoa::appkit::NSImage;
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSData;
    use objc::{msg_send, sel, sel_impl};

    let icon_bytes: &[u8] = include_bytes!("../icons/icon.png");

    unsafe {
        let ns_data = NSData::dataWithBytes_length_(
            nil,
            icon_bytes.as_ptr() as *const std::ffi::c_void,
            icon_bytes.len() as u64,
        );

        if ns_data != nil {
            let ns_image: id = msg_send![NSImage::alloc(nil), initWithData: ns_data];
            if ns_image != nil {
                let app: id = msg_send![objc::class!(NSApplication), sharedApplication];
                let _: () = msg_send![app, setApplicationIconImage: ns_image];
                let dock_tile: id = msg_send![app, dockTile];
                if dock_tile != nil {
                    let _: () = msg_send![dock_tile, display];
                }
                let _: () = msg_send![app, activateIgnoringOtherApps: true];
                eprintln!("[DockIcon] Successfully set ApplicationIconImage, dockTile and activated NSApp");
            } else {
                eprintln!("[DockIcon] ns_image was nil");
            }
        } else {
            eprintln!("[DockIcon] ns_data was nil");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            setup_macos_dock_icon();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("exit-requested", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::store_keychain_token,
            commands::read_keychain_token,
            commands::remove_keychain_token,
            commands::list_keychain_accounts,
            commands::remember_keychain_account,
            commands::clone_remote_repository,
            commands::list_local_repos,
            commands::list_notebooks_tree,
            commands::read_note_content,
            commands::save_note_content,
            commands::create_new_folder,
            commands::move_notebook_item,
            commands::read_docx_html,
            commands::save_docx_html,
            commands::open_note_in_external,
            commands::perform_git_sync,
            commands::preview_git_sync,
            commands::get_repo_sync_status,
            commands::set_repository_remote,
            commands::get_repository_remote,
            commands::import_file_bytes,
            commands::import_local_files,
            commands::import_local_folder,
            commands::read_file_bytes,
            commands::save_file_bytes,
            commands::check_git_environment,
            commands::install_git_environment,
            commands::list_repository_branches,
            commands::switch_repository_branch,
            commands::exit_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::Ready => {
                #[cfg(target_os = "macos")]
                setup_macos_dock_icon();
            }
            tauri::RunEvent::ExitRequested { api, .. } => {
                if ALLOW_EXIT.load(Ordering::SeqCst) {
                    return;
                }
                // Intercept exit to let UI show Quit-Sync sheet
                api.prevent_exit();
                let _ = app_handle.emit("exit-requested", ());
            }
            tauri::RunEvent::Reopen { .. } => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                #[cfg(target_os = "macos")]
                setup_macos_dock_icon();
            }
            _ => {}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    fn test_setup_macos_dock_icon() {
        setup_macos_dock_icon();
    }
}

