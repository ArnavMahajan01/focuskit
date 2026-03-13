mod commands;
mod hosts;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            start_focus,
            end_focus,
            get_focus_status,
            verify_license,
            get_tier,
            scan_cleanup,
            run_cleanup,
            get_session_history,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
