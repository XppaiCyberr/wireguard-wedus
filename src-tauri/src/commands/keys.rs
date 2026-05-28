use crate::wireguard::cli;
use crate::wireguard::types::KeyPair;

/// Generate a new WireGuard key pair (private + public key).
#[tauri::command]
pub fn generate_keypair() -> Result<KeyPair, String> {
    cli::generate_keypair().map_err(|e| e.to_string())
}

/// Generate a new WireGuard preshared key.
#[tauri::command]
pub fn generate_psk() -> Result<String, String> {
    cli::generate_preshared_key().map_err(|e| e.to_string())
}
