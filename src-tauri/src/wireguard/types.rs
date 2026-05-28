use serde::{Deserialize, Serialize};

/// A complete WireGuard configuration with interface and peer sections.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireGuardConfig {
    #[serde(rename = "interface_config")]
    pub interface: InterfaceConfig,
    pub peers: Vec<PeerConfig>,
}

/// The [Interface] section of a WireGuard configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceConfig {
    pub private_key: String,
    pub address: Vec<String>,
    pub dns: Vec<String>,
    pub listen_port: Option<u16>,
    pub mtu: Option<u16>,
}

/// A [Peer] section of a WireGuard configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerConfig {
    pub public_key: String,
    pub endpoint: Option<String>,
    pub allowed_ips: Vec<String>,
    pub preshared_key: Option<String>,
    pub persistent_keepalive: Option<u16>,
}

/// Real-time statistics for a WireGuard interface, parsed from `wg show`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceStats {
    pub public_key: String,
    pub listen_port: Option<u16>,
    pub fwmark: Option<String>,
    pub peers: Vec<PeerStats>,
}

/// Real-time statistics for a single peer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerStats {
    pub public_key: String,
    pub endpoint: Option<String>,
    pub allowed_ips: Vec<String>,
    /// Unix timestamp of the latest handshake, 0 if none.
    pub latest_handshake: u64,
    /// Total bytes received.
    pub transfer_rx: u64,
    /// Total bytes transmitted.
    pub transfer_tx: u64,
}

/// Information about a managed tunnel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelInfo {
    pub name: String,
    pub status: TunnelStatus,
    pub config: Option<WireGuardConfig>,
}

/// The connection status of a tunnel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TunnelStatus {
    Connected,
    Connecting,
    Disconnected,
    Error(String),
}

/// A WireGuard key pair (private + public).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyPair {
    pub private_key: String,
    pub public_key: String,
}
