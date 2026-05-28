mod commands;
mod state;
mod wireguard;

use state::AppState;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// Register all Tauri commands with the app builder.
fn register_commands(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![
        // Tunnel management
        commands::tunnel::list_tunnels,
        commands::tunnel::create_tunnel,
        commands::tunnel::import_tunnel,
        commands::tunnel::delete_tunnel,
        commands::tunnel::connect_tunnel,
        commands::tunnel::disconnect_tunnel,
        commands::tunnel::export_tunnel,
        commands::tunnel::update_tunnel,
        // Stats
        commands::stats::get_tunnel_stats,
        // Keys
        commands::keys::generate_keypair,
        commands::keys::generate_psk,
        // Config
        commands::config::parse_config_text,
        commands::config::validate_config,
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    let builder = builder.plugin(tauri_plugin_opener::init());

    let builder = builder.setup(|app| {
        // Initialize config directory using Tauri's app data dir
        let config_dir = app
            .path()
            .app_data_dir()
            .expect("Failed to resolve app data dir")
            .join("tunnels");

        // Initialize application state
        let app_state = AppState::new(config_dir);
        app.manage(app_state);

        // Build system tray menu
        let show_item = MenuItemBuilder::with_id("show", "Show")
            .build(app)?;
        let quit_item = MenuItemBuilder::with_id("quit", "Quit")
            .build(app)?;

        let tray_menu = MenuBuilder::new(app)
            .item(&show_item)
            .separator()
            .item(&quit_item)
            .build()?;

        // Create system tray icon
        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .tooltip("WireGuard Wedus")
            .menu(&tray_menu)
            .on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                }
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

        // Handle close-to-tray: hide window instead of quitting
        if let Some(window) = app.get_webview_window("main") {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });
        }

        Ok(())
    });

    let builder = register_commands(builder);

    builder
        .run(tauri::generate_context!())
        .expect("error while running WireGuard Wedus");
}
