use tauri::State;

use crate::state::AppState;
use crate::wireguard::cli;
use crate::wireguard::config_parser;
use crate::wireguard::types::{TunnelInfo, TunnelStatus, WireGuardConfig};

/// List all known tunnels with their current status.
#[tauri::command]
pub fn list_tunnels(state: State<'_, AppState>) -> Result<Vec<TunnelInfo>, String> {
    // Refresh status for each tunnel
    let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;

    for tunnel in tunnels.iter_mut() {
        tunnel.status = match cli::is_tunnel_active(&tunnel.name) {
            Ok(true) => TunnelStatus::Connected,
            Ok(false) => TunnelStatus::Disconnected,
            Err(e) => TunnelStatus::Error(e.to_string()),
        };
    }

    Ok(tunnels.clone())
}

/// Create a new tunnel with the given name and configuration.
///
/// Saves the config file and installs it as a Windows service.
#[tauri::command]
pub fn create_tunnel(
    name: String,
    config: WireGuardConfig,
    state: State<'_, AppState>,
) -> Result<TunnelInfo, String> {
    // Check for duplicate names
    {
        let tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        if tunnels.iter().any(|t| t.name == name) {
            return Err(format!("Tunnel '{}' already exists", name));
        }
    }

    // Save config file
    let config_path = state.save_tunnel_config(&name, &config)?;

    // Install as Windows service
    cli::install_tunnel(&config_path).map_err(|e| e.to_string())?;

    let tunnel_info = TunnelInfo {
        name: name.clone(),
        status: TunnelStatus::Disconnected,
        config: Some(config),
    };

    // Add to state
    {
        let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        tunnels.push(tunnel_info.clone());
    }

    Ok(tunnel_info)
}

/// Import a tunnel from configuration text.
///
/// Parses the configuration, copies it to the config directory, and installs it as a service.
#[tauri::command]
pub fn import_tunnel(
    name: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<TunnelInfo, String> {
    // Check for duplicate names
    {
        let tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        if tunnels.iter().any(|t| t.name == name) {
            return Err(format!("Tunnel '{}' already exists", name));
        }
    }

    // Parse the config
    let config = config_parser::parse_config(&content).map_err(|e| e.to_string())?;

    // Save to our config directory
    let config_path = state.save_tunnel_config(&name, &config)?;

    // Install as service
    cli::install_tunnel(&config_path).map_err(|e| e.to_string())?;

    let tunnel_info = TunnelInfo {
        name: name.clone(),
        status: TunnelStatus::Disconnected,
        config: Some(config),
    };

    {
        let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        tunnels.push(tunnel_info.clone());
    }

    Ok(tunnel_info)
}

/// Delete a tunnel — uninstalls the service and removes the config file.
#[tauri::command]
pub fn delete_tunnel(name: String, state: State<'_, AppState>) -> Result<(), String> {
    // Try to stop first (ignore errors if not running)
    let _ = cli::stop_tunnel(&name);

    // Uninstall service
    cli::uninstall_tunnel(&name).map_err(|e| e.to_string())?;

    // Remove config file
    state.remove_tunnel_config(&name)?;

    // Remove from state
    {
        let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        tunnels.retain(|t| t.name != name);
    }

    Ok(())
}

/// Connect (start) a tunnel.
#[tauri::command]
pub fn connect_tunnel(name: String, state: State<'_, AppState>) -> Result<(), String> {
    // Update status to Connecting
    {
        let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        if let Some(tunnel) = tunnels.iter_mut().find(|t| t.name == name) {
            tunnel.status = TunnelStatus::Connecting;
        } else {
            return Err(format!("Tunnel '{}' not found", name));
        }
    }

    // Start the tunnel
    match cli::start_tunnel(&name) {
        Ok(()) => {
            let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
            if let Some(tunnel) = tunnels.iter_mut().find(|t| t.name == name) {
                tunnel.status = TunnelStatus::Connected;
            }
            Ok(())
        }
        Err(e) => {
            let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
            if let Some(tunnel) = tunnels.iter_mut().find(|t| t.name == name) {
                tunnel.status = TunnelStatus::Error(e.to_string());
            }
            Err(e.to_string())
        }
    }
}

/// Disconnect (stop) a tunnel.
#[tauri::command]
pub fn disconnect_tunnel(name: String, state: State<'_, AppState>) -> Result<(), String> {
    cli::stop_tunnel(&name).map_err(|e| e.to_string())?;

    let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
    if let Some(tunnel) = tunnels.iter_mut().find(|t| t.name == name) {
        tunnel.status = TunnelStatus::Disconnected;
    }

    Ok(())
}

/// Export a tunnel's config to a .conf file at the given path.
#[tauri::command]
pub fn export_tunnel(name: String, path: String, state: State<'_, AppState>) -> Result<(), String> {
    let tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
    let tunnel = tunnels
        .iter()
        .find(|t| t.name == name)
        .ok_or_else(|| format!("Tunnel '{}' not found", name))?;

    let config = tunnel
        .config
        .as_ref()
        .ok_or_else(|| format!("No config available for tunnel '{}'", name))?;

    let content = config_parser::serialize_config(config);
    std::fs::write(&path, &content)
        .map_err(|e| format!("Failed to export config: {}", e))?;

    Ok(())
}

/// Update an existing tunnel's configuration.
///
/// Stops the tunnel if running, updates the config, and reinstalls.
#[tauri::command]
pub fn update_tunnel(
    name: String,
    config: WireGuardConfig,
    state: State<'_, AppState>,
) -> Result<TunnelInfo, String> {
    let was_connected = cli::is_tunnel_active(&name).unwrap_or(false);

    // Stop if running
    if was_connected {
        cli::stop_tunnel(&name).map_err(|e| e.to_string())?;
    }

    // Uninstall old service
    let _ = cli::uninstall_tunnel(&name);

    // Save new config
    let config_path = state.save_tunnel_config(&name, &config)?;

    // Reinstall service
    cli::install_tunnel(&config_path).map_err(|e| e.to_string())?;

    // Restart if it was connected
    if was_connected {
        cli::start_tunnel(&name).map_err(|e| e.to_string())?;
    }

    let status = if was_connected {
        TunnelStatus::Connected
    } else {
        TunnelStatus::Disconnected
    };

    let tunnel_info = TunnelInfo {
        name: name.clone(),
        status,
        config: Some(config),
    };

    // Update state
    {
        let mut tunnels = state.tunnels.lock().map_err(|e| e.to_string())?;
        if let Some(tunnel) = tunnels.iter_mut().find(|t| t.name == name) {
            *tunnel = tunnel_info.clone();
        }
    }

    Ok(tunnel_info)
}
