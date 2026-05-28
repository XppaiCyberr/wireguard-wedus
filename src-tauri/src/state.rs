use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::wireguard::cli;
use crate::wireguard::config_parser;
use crate::wireguard::types::{TunnelInfo, TunnelStatus, WireGuardConfig};

/// Application state holding the list of managed tunnels and the config directory.
pub struct AppState {
    pub tunnels: Arc<Mutex<Vec<TunnelInfo>>>,
    pub config_dir: PathBuf,
}

impl AppState {
    /// Create a new AppState with the given config directory.
    ///
    /// Creates the config directory if it doesn't exist.
    pub fn new(config_dir: PathBuf) -> Self {
        if !config_dir.exists() {
            let _ = std::fs::create_dir_all(&config_dir);
        }

        let state = Self {
            tunnels: Arc::new(Mutex::new(Vec::new())),
            config_dir,
        };

        state.load_tunnels();
        state
    }

    /// Scan the config directory for .conf files and populate the tunnel list.
    ///
    /// For each .conf file found, parses the config and checks if the
    /// corresponding tunnel service is currently active.
    pub fn load_tunnels(&self) {
        let mut tunnels = self.tunnels.lock().unwrap();
        tunnels.clear();

        let entries = match std::fs::read_dir(&self.config_dir) {
            Ok(entries) => entries,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("conf") {
                continue;
            }

            let name = match path.file_stem().and_then(|s| s.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            let config = match std::fs::read_to_string(&path) {
                Ok(content) => config_parser::parse_config(&content).ok(),
                Err(_) => None,
            };

            let status = match cli::is_tunnel_active(&name) {
                Ok(true) => TunnelStatus::Connected,
                _ => TunnelStatus::Disconnected,
            };

            tunnels.push(TunnelInfo {
                name,
                status,
                config,
            });
        }
    }

    /// Save a tunnel configuration to a .conf file in the config directory.
    pub fn save_tunnel_config(
        &self,
        name: &str,
        config: &WireGuardConfig,
    ) -> Result<PathBuf, String> {
        let path = self.config_dir.join(format!("{}.conf", name));
        let content = config_parser::serialize_config(config);
        std::fs::write(&path, &content)
            .map_err(|e| format!("Failed to save config for '{}': {}", name, e))?;
        Ok(path)
    }

    /// Remove a tunnel's config file from the config directory.
    pub fn remove_tunnel_config(&self, name: &str) -> Result<(), String> {
        let path = self.config_dir.join(format!("{}.conf", name));
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove config for '{}': {}", name, e))?;
        }
        Ok(())
    }

    /// Get the config file path for a tunnel.
    #[allow(dead_code)]
    pub fn config_path(&self, name: &str) -> PathBuf {
        self.config_dir.join(format!("{}.conf", name))
    }
}
