use std::path::{Path, PathBuf};
use std::process::Command;

use super::types::{InterfaceStats, KeyPair, PeerStats};

/// Helper to create a process command that suppresses console window flashing on Windows.
fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}

/// Errors from CLI operations.
#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("WireGuard executable not found. Is WireGuard installed?")]
    WireGuardNotFound,
    #[error("wg.exe not found. Is WireGuard installed?")]
    WgNotFound,
    #[error("Command failed: {0}")]
    CommandFailed(String),
    #[error("Failed to execute command: {0}")]
    IoError(#[from] std::io::Error),

}

/// Locate wireguard.exe, checking the default install path first, then PATH.
fn find_wireguard_exe() -> Result<PathBuf, CliError> {
    let default_path = PathBuf::from(r"C:\Program Files\WireGuard\wireguard.exe");
    if default_path.exists() {
        return Ok(default_path);
    }

    // Try to find in PATH
    which_in_path("wireguard.exe").ok_or(CliError::WireGuardNotFound)
}

/// Locate wg.exe, checking the default install path first, then PATH.
fn find_wg_exe() -> Result<PathBuf, CliError> {
    let default_path = PathBuf::from(r"C:\Program Files\WireGuard\wg.exe");
    if default_path.exists() {
        return Ok(default_path);
    }

    which_in_path("wg.exe").ok_or(CliError::WgNotFound)
}

/// Simple PATH-based executable lookup.
fn which_in_path(exe_name: &str) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(';') {
            let candidate = PathBuf::from(dir).join(exe_name);
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    None
}

/// Install a WireGuard tunnel as a Windows service.
///
/// Runs: `wireguard.exe /installtunnelservice <config_path>`
pub fn install_tunnel(config_path: &Path) -> Result<(), CliError> {
    let wireguard = find_wireguard_exe()?;
    let output = create_command(&wireguard)
        .arg("/installtunnelservice")
        .arg(config_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(CliError::CommandFailed(format!(
            "Failed to install tunnel service: {} {}",
            stderr, stdout
        )));
    }

    Ok(())
}

/// Uninstall a WireGuard tunnel service.
///
/// Runs: `wireguard.exe /uninstalltunnelservice <name>`
pub fn uninstall_tunnel(name: &str) -> Result<(), CliError> {
    let wireguard = find_wireguard_exe()?;
    let output = create_command(&wireguard)
        .arg("/uninstalltunnelservice")
        .arg(name)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(CliError::CommandFailed(format!(
            "Failed to uninstall tunnel service: {} {}",
            stderr, stdout
        )));
    }

    Ok(())
}

/// Start a WireGuard tunnel service.
///
/// Runs: `net start WireGuardTunnel$<name>`
pub fn start_tunnel(name: &str) -> Result<(), CliError> {
    let service_name = format!("WireGuardTunnel${}", name);
    let output = create_command("net")
        .args(["start", &service_name])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Check if already running
        let combined = format!("{} {}", stdout, stderr);
        if combined.contains("already been started") {
            return Ok(());
        }
        return Err(CliError::CommandFailed(format!(
            "Failed to start tunnel: {} {}",
            stderr, stdout
        )));
    }

    Ok(())
}

/// Stop a WireGuard tunnel service.
///
/// Runs: `net stop WireGuardTunnel$<name>`
pub fn stop_tunnel(name: &str) -> Result<(), CliError> {
    let service_name = format!("WireGuardTunnel${}", name);
    let output = create_command("net")
        .args(["stop", &service_name])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Check if already stopped
        let combined = format!("{} {}", stdout, stderr);
        if combined.contains("is not started") || combined.contains("not been started") {
            return Ok(());
        }
        return Err(CliError::CommandFailed(format!(
            "Failed to stop tunnel: {} {}",
            stderr, stdout
        )));
    }

    Ok(())
}

/// Get real-time interface statistics by parsing `wg show <name>` output.
pub fn get_interface_stats(name: &str) -> Result<InterfaceStats, CliError> {
    let wg = find_wg_exe()?;
    let output = create_command(&wg)
        .args(["show", name])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CliError::CommandFailed(format!(
            "Failed to get stats for '{}': {}",
            name, stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_wg_show_output(&stdout)
}

/// List all active WireGuard interfaces.
///
/// Runs: `wg show interfaces`
#[allow(dead_code)]
pub fn list_interfaces() -> Result<Vec<String>, CliError> {
    let wg = find_wg_exe()?;
    let output = create_command(&wg)
        .args(["show", "interfaces"])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CliError::CommandFailed(format!(
            "Failed to list interfaces: {}",
            stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let interfaces: Vec<String> = stdout
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    Ok(interfaces)
}

/// Generate a new WireGuard key pair.
///
/// Runs `wg genkey` and pipes the result through `wg pubkey`.
pub fn generate_keypair() -> Result<KeyPair, CliError> {
    let wg = find_wg_exe()?;

    // Generate private key
    let genkey_output = create_command(&wg)
        .arg("genkey")
        .output()?;

    if !genkey_output.status.success() {
        return Err(CliError::CommandFailed(
            "Failed to generate private key".to_string(),
        ));
    }

    let private_key = String::from_utf8_lossy(&genkey_output.stdout)
        .trim()
        .to_string();

    // Derive public key
    let mut pubkey_cmd = create_command(&wg);
    pubkey_cmd.arg("pubkey");

    // On Windows we need to pipe stdin
    use std::process::Stdio;
    let mut child = create_command(&wg)
        .arg("pubkey")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    if let Some(ref mut stdin) = child.stdin {
        use std::io::Write;
        stdin.write_all(private_key.as_bytes())?;
    }

    let pubkey_output = child.wait_with_output()?;

    if !pubkey_output.status.success() {
        return Err(CliError::CommandFailed(
            "Failed to derive public key".to_string(),
        ));
    }

    let public_key = String::from_utf8_lossy(&pubkey_output.stdout)
        .trim()
        .to_string();

    Ok(KeyPair {
        private_key,
        public_key,
    })
}

/// Generate a preshared key.
///
/// Runs: `wg genpsk`
pub fn generate_preshared_key() -> Result<String, CliError> {
    let wg = find_wg_exe()?;
    let output = create_command(&wg).arg("genpsk").output()?;

    if !output.status.success() {
        return Err(CliError::CommandFailed(
            "Failed to generate preshared key".to_string(),
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Check if a WireGuard tunnel service is currently running.
///
/// Queries `sc query WireGuardTunnel$<name>` and checks for RUNNING state.
pub fn is_tunnel_active(name: &str) -> Result<bool, CliError> {
    let service_name = format!("WireGuardTunnel${}", name);
    let output = create_command("sc")
        .args(["query", &service_name])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // If the service exists and is running, the output will contain "RUNNING"
    Ok(stdout.contains("RUNNING"))
}

/// Parse the output of `wg show <interface>` into `InterfaceStats`.
fn parse_wg_show_output(output: &str) -> Result<InterfaceStats, CliError> {
    let mut stats = InterfaceStats {
        public_key: String::new(),
        listen_port: None,
        fwmark: None,
        peers: Vec::new(),
    };

    let mut current_peer: Option<PeerStats> = None;

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim();
            let value = value.trim();

            match key {
                "interface" => {
                    // Interface name line, skip
                }
                "public key" => {
                    if current_peer.is_some() {
                        // This is a peer's public key — but peer sections
                        // start with "peer:" not "public key:", so this
                        // is the interface public key
                        stats.public_key = value.to_string();
                    } else {
                        stats.public_key = value.to_string();
                    }
                }
                "private key" => {
                    // Skip, we don't store the private key in stats
                }
                "listening port" => {
                    if current_peer.is_none() {
                        stats.listen_port = value.parse().ok();
                    }
                }
                "fwmark" => {
                    if value != "off" {
                        stats.fwmark = Some(value.to_string());
                    }
                }
                "peer" => {
                    // Finalize previous peer if any
                    if let Some(peer) = current_peer.take() {
                        stats.peers.push(peer);
                    }
                    current_peer = Some(PeerStats {
                        public_key: value.to_string(),
                        endpoint: None,
                        allowed_ips: Vec::new(),
                        latest_handshake: 0,
                        transfer_rx: 0,
                        transfer_tx: 0,
                    });
                }
                "endpoint" => {
                    if let Some(ref mut peer) = current_peer {
                        peer.endpoint = Some(value.to_string());
                    }
                }
                "allowed ips" => {
                    if let Some(ref mut peer) = current_peer {
                        peer.allowed_ips = value
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                    }
                }
                "latest handshake" => {
                    if let Some(ref mut peer) = current_peer {
                        // Parse relative time like "1 minute, 30 seconds ago"
                        // or it might be a timestamp. For simplicity, try to
                        // extract seconds from relative format.
                        peer.latest_handshake = parse_handshake_time(value);
                    }
                }
                "transfer" => {
                    if let Some(ref mut peer) = current_peer {
                        // Format: "X.XX MiB received, Y.YY MiB sent"
                        parse_transfer(value, &mut peer.transfer_rx, &mut peer.transfer_tx);
                    }
                }
                "persistent keepalive" => {
                    // Stats only, we don't need to store this separately
                }
                _ => {}
            }
        }
    }

    // Finalize last peer
    if let Some(peer) = current_peer.take() {
        stats.peers.push(peer);
    }

    Ok(stats)
}

/// Parse a handshake time string into a unix timestamp approximation.
///
/// The `wg show` output formats this as relative time like
/// "1 minute, 30 seconds ago". We convert to approximate seconds ago,
/// then subtract from current time.
fn parse_handshake_time(value: &str) -> u64 {
    if value == "none" || value.is_empty() {
        return 0;
    }

    let mut total_seconds: u64 = 0;

    // Try to parse as a timestamp number first
    if let Ok(ts) = value.parse::<u64>() {
        return ts;
    }

    // Parse relative time: "1 minute, 30 seconds ago"
    let parts: Vec<&str> = value.split_whitespace().collect();
    let mut i = 0;
    while i < parts.len() {
        if let Ok(num) = parts[i].parse::<u64>() {
            if i + 1 < parts.len() {
                let unit = parts[i + 1].trim_end_matches(',');
                match unit {
                    "second" | "seconds" => total_seconds += num,
                    "minute" | "minutes" => total_seconds += num * 60,
                    "hour" | "hours" => total_seconds += num * 3600,
                    "day" | "days" => total_seconds += num * 86400,
                    _ => {}
                }
                i += 2;
                continue;
            }
        }
        i += 1;
    }

    if total_seconds > 0 {
        // Convert to approximate unix timestamp
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        now.saturating_sub(total_seconds)
    } else {
        0
    }
}

/// Parse the transfer line from `wg show` output.
///
/// Format: "X.XX KiB received, Y.YY MiB sent"
fn parse_transfer(value: &str, rx: &mut u64, tx: &mut u64) {
    // Split on comma to get received and sent parts
    let parts: Vec<&str> = value.split(',').collect();

    if let Some(received_part) = parts.first() {
        *rx = parse_size_to_bytes(received_part.trim());
    }

    if let Some(sent_part) = parts.get(1) {
        *tx = parse_size_to_bytes(sent_part.trim());
    }
}

/// Parse a size string like "1.23 MiB" into bytes.
fn parse_size_to_bytes(s: &str) -> u64 {
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() < 2 {
        return 0;
    }

    let value: f64 = match parts[0].parse() {
        Ok(v) => v,
        Err(_) => return 0,
    };

    let unit = parts[1].to_lowercase();
    let multiplier: f64 = match unit.as_str() {
        "b" | "bytes" => 1.0,
        "kib" | "received," => 1024.0,
        "mib" => 1024.0 * 1024.0,
        "gib" => 1024.0 * 1024.0 * 1024.0,
        "tib" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => 1.0,
    };

    (value * multiplier) as u64
}
