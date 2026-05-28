use crate::wireguard::cli;
use crate::wireguard::types::InterfaceStats;

/// Get real-time statistics for an active tunnel.
#[tauri::command]
pub fn get_tunnel_stats(name: String) -> Result<InterfaceStats, String> {
    cli::get_interface_stats(&name).map_err(|e| e.to_string())
}
