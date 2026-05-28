// ============================================
// WireGuard Wedus — Utilities
// ============================================

import type { TunnelStatus } from './types';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format speed in bytes/sec to human-readable string
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const k = 1024;
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  const value = bytesPerSec / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Format unix timestamp to relative time string
 */
export function formatTimestamp(epoch: number): string {
  if (epoch === 0) return 'Never';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - epoch;

  if (diff < 0) return 'Just now';
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Get CSS custom property name for a tunnel status
 */
export function getStatusColor(status: TunnelStatus): string {
  if (status === 'Connected') return 'var(--status-connected)';
  if (status === 'Connecting') return 'var(--status-connecting)';
  if (status === 'Disconnected') return 'var(--status-disconnected)';
  return 'var(--status-disconnected)'; // Error state
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: TunnelStatus): string {
  if (status === 'Connected') return 'Connected';
  if (status === 'Connecting') return 'Connecting…';
  if (status === 'Disconnected') return 'Disconnected';
  if (typeof status === 'object' && 'Error' in status) return `Error: ${status.Error}`;
  return 'Unknown';
}

/**
 * Get a simple status key for CSS class usage
 */
export function getStatusKey(status: TunnelStatus): string {
  if (status === 'Connected') return 'connected';
  if (status === 'Connecting') return 'connecting';
  if (status === 'Disconnected') return 'disconnected';
  return 'disconnected';
}

/**
 * Check if a tunnel is connected
 */
export function isConnected(status: TunnelStatus): boolean {
  return status === 'Connected';
}

/**
 * Convert WireGuardConfig to .conf file format text
 */
export function configToText(config: {
  interface_config: {
    private_key: string;
    address: string[];
    dns: string[];
    listen_port?: number;
    mtu?: number;
  };
  peers: Array<{
    public_key: string;
    endpoint?: string;
    allowed_ips: string[];
    preshared_key?: string;
    persistent_keepalive?: number;
  }>;
}): string {
  const lines: string[] = ['[Interface]'];
  lines.push(`PrivateKey = ${config.interface_config.private_key}`);
  if (config.interface_config.address.length > 0) {
    lines.push(`Address = ${config.interface_config.address.join(', ')}`);
  }
  if (config.interface_config.dns.length > 0) {
    lines.push(`DNS = ${config.interface_config.dns.join(', ')}`);
  }
  if (config.interface_config.listen_port) {
    lines.push(`ListenPort = ${config.interface_config.listen_port}`);
  }
  if (config.interface_config.mtu) {
    lines.push(`MTU = ${config.interface_config.mtu}`);
  }

  for (const peer of config.peers) {
    lines.push('');
    lines.push('[Peer]');
    lines.push(`PublicKey = ${peer.public_key}`);
    if (peer.endpoint) {
      lines.push(`Endpoint = ${peer.endpoint}`);
    }
    if (peer.allowed_ips.length > 0) {
      lines.push(`AllowedIPs = ${peer.allowed_ips.join(', ')}`);
    }
    if (peer.preshared_key) {
      lines.push(`PresharedKey = ${peer.preshared_key}`);
    }
    if (peer.persistent_keepalive) {
      lines.push(`PersistentKeepalive = ${peer.persistent_keepalive}`);
    }
  }

  return lines.join('\n');
}
