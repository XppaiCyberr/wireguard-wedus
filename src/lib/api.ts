// ============================================
// WireGuard Wedus — Backend API
// ============================================

import { invoke } from '@tauri-apps/api/core';
import type {
  TunnelInfo,
  WireGuardConfig,
  InterfaceStats,
  KeyPair,
} from './types';

// --- Tunnel Management ---

export async function listTunnels(): Promise<TunnelInfo[]> {
  return invoke<TunnelInfo[]>('list_tunnels');
}

export async function createTunnel(
  name: string,
  config: WireGuardConfig
): Promise<void> {
  return invoke('create_tunnel', { name, config });
}

export async function importTunnel(
  name: string,
  content: string
): Promise<string> {
  const tunnel = await invoke<TunnelInfo>('import_tunnel', { name, content });
  return tunnel.name;
}

export async function deleteTunnel(name: string): Promise<void> {
  return invoke('delete_tunnel', { name });
}

export async function connectTunnel(name: string): Promise<void> {
  return invoke('connect_tunnel', { name });
}

export async function disconnectTunnel(name: string): Promise<void> {
  return invoke('disconnect_tunnel', { name });
}

export async function exportTunnel(name: string): Promise<string> {
  return invoke<string>('export_tunnel', { name });
}

export async function updateTunnel(
  name: string,
  config: WireGuardConfig
): Promise<void> {
  return invoke('update_tunnel', { name, config });
}

// --- Statistics ---

export async function getTunnelStats(
  name: string
): Promise<InterfaceStats | null> {
  return invoke<InterfaceStats | null>('get_tunnel_stats', { name });
}

// --- Key Generation ---

export async function generateKeypair(): Promise<KeyPair> {
  return invoke<KeyPair>('generate_keypair');
}

export async function generatePsk(): Promise<string> {
  return invoke<string>('generate_psk');
}

// --- Config Utilities ---

export async function parseConfigText(
  content: string
): Promise<WireGuardConfig> {
  return invoke<WireGuardConfig>('parse_config_text', { content });
}

export async function validateConfig(
  config: WireGuardConfig
): Promise<string | null> {
  return invoke<string | null>('validate_config', { config });
}
