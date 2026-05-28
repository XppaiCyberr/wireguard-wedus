// ============================================
// WireGuard Wedus — Type Definitions
// ============================================

export interface InterfaceConfig {
  private_key: string;
  address: string[];
  dns: string[];
  listen_port?: number;
  mtu?: number;
}

export interface PeerConfig {
  public_key: string;
  endpoint?: string;
  allowed_ips: string[];
  preshared_key?: string;
  persistent_keepalive?: number;
}

export interface WireGuardConfig {
  interface_config: InterfaceConfig;
  peers: PeerConfig[];
}

export interface PeerStats {
  public_key: string;
  endpoint: string;
  allowed_ips: string[];
  latest_handshake: number;
  transfer_rx: number;
  transfer_tx: number;
}

export interface InterfaceStats {
  public_key: string;
  listen_port: number;
  fwmark: string;
  peers: PeerStats[];
}

export type TunnelStatus =
  | 'Connected'
  | 'Connecting'
  | 'Disconnected'
  | { Error: string };

export interface TunnelInfo {
  name: string;
  status: TunnelStatus;
  config?: WireGuardConfig;
}

export interface KeyPair {
  private_key: string;
  public_key: string;
}

// UI-specific types

export type ViewMode = 'status' | 'editor' | 'settings';

export interface SpeedDataPoint {
  timestamp: number;
  download: number;
  upload: number;
}
