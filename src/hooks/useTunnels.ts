import { useState, useEffect, useCallback, useRef } from 'react';
import type { TunnelInfo, WireGuardConfig } from '../lib/types';
import * as api from '../lib/api';

interface UseTunnelsReturn {
  tunnels: TunnelInfo[];
  selectedTunnel: string | null;
  loading: boolean;
  error: string | null;
  loadTunnels: () => Promise<void>;
  selectTunnel: (name: string) => void;
  createTunnel: (name: string, config: WireGuardConfig) => Promise<void>;
  importTunnel: (name: string, content: string) => Promise<string>;
  deleteTunnel: (name: string) => Promise<void>;
  connectTunnel: (name: string) => Promise<void>;
  disconnectTunnel: (name: string) => Promise<void>;
  updateTunnel: (name: string, config: WireGuardConfig) => Promise<void>;
}

export function useTunnels(): UseTunnelsReturn {
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [selectedTunnel, setSelectedTunnel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadTunnels = useCallback(async () => {
    try {
      const list = await api.listTunnels();
      setTunnels(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTunnels();
  }, [loadTunnels]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    intervalRef.current = setInterval(loadTunnels, 3000);
    return () => clearInterval(intervalRef.current);
  }, [loadTunnels]);

  const selectTunnel = useCallback((name: string) => {
    setSelectedTunnel(name);
  }, []);

  const createTunnel = useCallback(
    async (name: string, config: WireGuardConfig) => {
      await api.createTunnel(name, config);
      await loadTunnels();
      setSelectedTunnel(name);
    },
    [loadTunnels]
  );

  const importTunnel = useCallback(
    async (name: string, content: string) => {
      const importedName = await api.importTunnel(name, content);
      await loadTunnels();
      setSelectedTunnel(importedName);
      return importedName;
    },
    [loadTunnels]
  );

  const deleteTunnel = useCallback(
    async (name: string) => {
      await api.deleteTunnel(name);
      if (selectedTunnel === name) {
        setSelectedTunnel(null);
      }
      await loadTunnels();
    },
    [loadTunnels, selectedTunnel]
  );

  const connectTunnel = useCallback(
    async (name: string) => {
      await api.connectTunnel(name);
      await loadTunnels();
    },
    [loadTunnels]
  );

  const disconnectTunnel = useCallback(
    async (name: string) => {
      await api.disconnectTunnel(name);
      await loadTunnels();
    },
    [loadTunnels]
  );

  const updateTunnel = useCallback(
    async (name: string, config: WireGuardConfig) => {
      await api.updateTunnel(name, config);
      await loadTunnels();
    },
    [loadTunnels]
  );

  return {
    tunnels,
    selectedTunnel,
    loading,
    error,
    loadTunnels,
    selectTunnel,
    createTunnel,
    importTunnel,
    deleteTunnel,
    connectTunnel,
    disconnectTunnel,
    updateTunnel,
  };
}
