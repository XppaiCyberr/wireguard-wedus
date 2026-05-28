use crate::wireguard::config_parser;
use crate::wireguard::types::WireGuardConfig;

/// Parse raw WireGuard config text into a structured `WireGuardConfig`.
#[tauri::command]
pub fn parse_config_text(text: String) -> Result<WireGuardConfig, String> {
    config_parser::parse_config(&text).map_err(|e| e.to_string())
}

/// Validate a WireGuard configuration, checking for required fields and
/// reasonable values.
#[tauri::command]
pub fn validate_config(config: WireGuardConfig) -> Result<(), String> {
    // Validate interface
    if config.interface.private_key.is_empty() {
        return Err("Interface PrivateKey is required".to_string());
    }

    if config.interface.private_key.len() < 40 {
        return Err("Interface PrivateKey appears invalid (too short)".to_string());
    }

    if config.interface.address.is_empty() {
        return Err("Interface Address is required".to_string());
    }

    // Validate addresses look like CIDR notation
    for addr in &config.interface.address {
        if !addr.contains('/') {
            return Err(format!(
                "Interface Address '{}' should be in CIDR notation (e.g. 10.0.0.1/24)",
                addr
            ));
        }
    }

    // Validate MTU range
    if let Some(mtu) = config.interface.mtu {
        if !(1280..=65535).contains(&mtu) {
            return Err(format!("MTU {} is out of valid range (1280-65535)", mtu));
        }
    }

    // Validate peers
    if config.peers.is_empty() {
        return Err("At least one Peer is required".to_string());
    }

    for (i, peer) in config.peers.iter().enumerate() {
        if peer.public_key.is_empty() {
            return Err(format!("Peer {} PublicKey is required", i + 1));
        }

        if peer.public_key.len() < 40 {
            return Err(format!(
                "Peer {} PublicKey appears invalid (too short)",
                i + 1
            ));
        }

        if peer.allowed_ips.is_empty() {
            return Err(format!("Peer {} AllowedIPs is required", i + 1));
        }

        // Validate endpoint format if provided
        if let Some(ref endpoint) = peer.endpoint {
            if !endpoint.is_empty() && !endpoint.contains(':') {
                return Err(format!(
                    "Peer {} Endpoint '{}' should include a port (e.g. host:51820)",
                    i + 1,
                    endpoint
                ));
            }
        }

        // Validate persistent keepalive range
        if let Some(keepalive) = peer.persistent_keepalive {
            if keepalive == 0 {
                return Err(format!(
                    "Peer {} PersistentKeepalive must be greater than 0",
                    i + 1
                ));
            }
        }
    }

    Ok(())
}
