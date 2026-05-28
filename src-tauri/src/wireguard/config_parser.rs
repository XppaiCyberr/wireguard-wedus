use super::types::{InterfaceConfig, PeerConfig, WireGuardConfig};

/// Errors that can occur during config parsing.
#[derive(Debug, thiserror::Error)]
pub enum ConfigParseError {
    #[error("Missing [Interface] section")]
    MissingInterface,
    #[error("Missing PrivateKey in [Interface]")]
    MissingPrivateKey,
    #[error("Missing PublicKey in [Peer] section {0}")]
    MissingPublicKey(usize),
    #[error("Unknown section: [{0}]")]
    UnknownSection(String),
    #[error("Key-value pair outside of any section: {0}")]
    OrphanedKeyValue(String),
}

#[derive(Debug, PartialEq)]
enum Section {
    None,
    Interface,
    Peer(usize),
}

/// Parse a WireGuard .conf file content into a `WireGuardConfig`.
///
/// Handles comments (lines starting with `#` or `;`), blank lines,
/// and case-insensitive key matching.
pub fn parse_config(content: &str) -> Result<WireGuardConfig, ConfigParseError> {
    let mut interface = None::<InterfaceConfig>;
    let mut peers: Vec<PeerConfig> = Vec::new();
    let mut current_section = Section::None;

    // Temporary storage for interface fields
    let mut iface_private_key = None::<String>;
    let mut iface_address = Vec::<String>::new();
    let mut iface_dns = Vec::<String>::new();
    let mut iface_listen_port = None::<u16>;
    let mut iface_mtu = None::<u16>;

    for line in content.lines() {
        let line = line.trim();

        // Skip empty lines and comments
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }

        // Check for section headers
        if line.starts_with('[') && line.ends_with(']') {
            // Before switching sections, finalize the previous one
            if current_section == Section::Interface {
                let private_key = iface_private_key
                    .take()
                    .ok_or(ConfigParseError::MissingPrivateKey)?;
                interface = Some(InterfaceConfig {
                    private_key,
                    address: std::mem::take(&mut iface_address),
                    dns: std::mem::take(&mut iface_dns),
                    listen_port: iface_listen_port.take(),
                    mtu: iface_mtu.take(),
                });
            }

            let section_name = &line[1..line.len() - 1];
            match section_name.to_lowercase().as_str() {
                "interface" => {
                    current_section = Section::Interface;
                }
                "peer" => {
                    peers.push(PeerConfig {
                        public_key: String::new(),
                        endpoint: None,
                        allowed_ips: Vec::new(),
                        preshared_key: None,
                        persistent_keepalive: None,
                    });
                    current_section = Section::Peer(peers.len() - 1);
                }
                other => {
                    return Err(ConfigParseError::UnknownSection(other.to_string()));
                }
            }
            continue;
        }

        // Parse key = value
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();

            match &current_section {
                Section::None => {
                    return Err(ConfigParseError::OrphanedKeyValue(line.to_string()));
                }
                Section::Interface => match key.as_str() {
                    "privatekey" => {
                        iface_private_key = Some(value);
                    }
                    "address" => {
                        for addr in value.split(',') {
                            let addr = addr.trim().to_string();
                            if !addr.is_empty() {
                                iface_address.push(addr);
                            }
                        }
                    }
                    "dns" => {
                        for dns in value.split(',') {
                            let dns = dns.trim().to_string();
                            if !dns.is_empty() {
                                iface_dns.push(dns);
                            }
                        }
                    }
                    "listenport" => {
                        iface_listen_port = value.parse().ok();
                    }
                    "mtu" => {
                        iface_mtu = value.parse().ok();
                    }
                    _ => {
                        // Ignore unknown keys for forward compatibility
                    }
                },
                Section::Peer(idx) => {
                    let peer = &mut peers[*idx];
                    match key.as_str() {
                        "publickey" => {
                            peer.public_key = value;
                        }
                        "endpoint" => {
                            peer.endpoint = Some(value);
                        }
                        "allowedips" => {
                            for ip in value.split(',') {
                                let ip = ip.trim().to_string();
                                if !ip.is_empty() {
                                    peer.allowed_ips.push(ip);
                                }
                            }
                        }
                        "presharedkey" => {
                            peer.preshared_key = Some(value);
                        }
                        "persistentkeepalive" => {
                            peer.persistent_keepalive = value.parse().ok();
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    // Finalize last section if it was Interface
    if current_section == Section::Interface {
        let private_key = iface_private_key
            .take()
            .ok_or(ConfigParseError::MissingPrivateKey)?;
        interface = Some(InterfaceConfig {
            private_key,
            address: std::mem::take(&mut iface_address),
            dns: std::mem::take(&mut iface_dns),
            listen_port: iface_listen_port.take(),
            mtu: iface_mtu.take(),
        });
    }

    let interface = interface.ok_or(ConfigParseError::MissingInterface)?;

    // Validate peers have public keys
    for (i, peer) in peers.iter().enumerate() {
        if peer.public_key.is_empty() {
            return Err(ConfigParseError::MissingPublicKey(i + 1));
        }
    }

    Ok(WireGuardConfig { interface, peers })
}

/// Serialize a `WireGuardConfig` back into .conf file format.
pub fn serialize_config(config: &WireGuardConfig) -> String {
    let mut output = String::new();

    // [Interface] section
    output.push_str("[Interface]\n");
    output.push_str(&format!("PrivateKey = {}\n", config.interface.private_key));

    if !config.interface.address.is_empty() {
        output.push_str(&format!(
            "Address = {}\n",
            config.interface.address.join(", ")
        ));
    }

    if !config.interface.dns.is_empty() {
        output.push_str(&format!("DNS = {}\n", config.interface.dns.join(", ")));
    }

    if let Some(port) = config.interface.listen_port {
        output.push_str(&format!("ListenPort = {}\n", port));
    }

    if let Some(mtu) = config.interface.mtu {
        output.push_str(&format!("MTU = {}\n", mtu));
    }

    // [Peer] sections
    for peer in &config.peers {
        output.push('\n');
        output.push_str("[Peer]\n");
        output.push_str(&format!("PublicKey = {}\n", peer.public_key));

        if let Some(ref endpoint) = peer.endpoint {
            output.push_str(&format!("Endpoint = {}\n", endpoint));
        }

        if !peer.allowed_ips.is_empty() {
            output.push_str(&format!(
                "AllowedIPs = {}\n",
                peer.allowed_ips.join(", ")
            ));
        }

        if let Some(ref psk) = peer.preshared_key {
            output.push_str(&format!("PresharedKey = {}\n", psk));
        }

        if let Some(keepalive) = peer.persistent_keepalive {
            output.push_str(&format!("PersistentKeepalive = {}\n", keepalive));
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_config() {
        let conf = r#"
[Interface]
PrivateKey = yAnz5TF+lXXJte14tji3zlMNq+hd2rYUIgJBgB3fBmk=
Address = 10.0.0.1/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = xTIBA5rboUvnH4htodjb6e697QjLERt1NAB4mZqp8Dg=
Endpoint = 192.168.1.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
"#;
        let config = parse_config(conf).unwrap();
        assert_eq!(config.interface.private_key, "yAnz5TF+lXXJte14tji3zlMNq+hd2rYUIgJBgB3fBmk=");
        assert_eq!(config.interface.address, vec!["10.0.0.1/24"]);
        assert_eq!(config.interface.dns, vec!["1.1.1.1", "8.8.8.8"]);
        assert_eq!(config.peers.len(), 1);
        assert_eq!(config.peers[0].public_key, "xTIBA5rboUvnH4htodjb6e697QjLERt1NAB4mZqp8Dg=");
        assert_eq!(config.peers[0].persistent_keepalive, Some(25));
    }

    #[test]
    fn test_roundtrip() {
        let config = WireGuardConfig {
            interface: InterfaceConfig {
                private_key: "testkey123=".to_string(),
                address: vec!["10.0.0.1/24".to_string()],
                dns: vec!["1.1.1.1".to_string()],
                listen_port: Some(51820),
                mtu: Some(1420),
            },
            peers: vec![PeerConfig {
                public_key: "peerpubkey=".to_string(),
                endpoint: Some("1.2.3.4:51820".to_string()),
                allowed_ips: vec!["0.0.0.0/0".to_string()],
                preshared_key: None,
                persistent_keepalive: Some(25),
            }],
        };

        let serialized = serialize_config(&config);
        let parsed = parse_config(&serialized).unwrap();

        assert_eq!(parsed.interface.private_key, config.interface.private_key);
        assert_eq!(parsed.interface.address, config.interface.address);
        assert_eq!(parsed.peers[0].public_key, config.peers[0].public_key);
    }
}
