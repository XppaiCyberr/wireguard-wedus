import { useState, useEffect, useRef, useCallback } from 'react';
import type { PeerStats, SpeedDataPoint } from '../lib/types';
import * as api from '../lib/api';

interface UseStatsReturn {
  stats: PeerStats | null;
  speedHistory: SpeedDataPoint[];
  connectionStartTime: number | null;
}

export function useStats(
  tunnelName: string | null,
  isConnected: boolean
): UseStatsReturn {
  const [stats, setStats] = useState<PeerStats | null>(null);
  const [speedHistory, setSpeedHistory] = useState<SpeedDataPoint[]>([]);
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const prevStatsRef = useRef<PeerStats | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Track connection start
  useEffect(() => {
    if (isConnected) {
      setConnectionStartTime((prev) => prev ?? Math.floor(Date.now() / 1000));
    } else {
      setConnectionStartTime(null);
      setStats(null);
      setSpeedHistory([]);
      prevStatsRef.current = null;
    }
  }, [isConnected]);

  const pollStats = useCallback(async () => {
    if (!tunnelName || !isConnected) return;

    try {
      const result = await api.getTunnelStats(tunnelName);
      if (!result || !result.peers || result.peers.length === 0) return;

      const peer = result.peers[0];
      setStats(peer);

      // Compute speed delta
      const prev = prevStatsRef.current;
      let downloadSpeed = 0;
      let uploadSpeed = 0;

      if (prev) {
        downloadSpeed = Math.max(0, peer.transfer_rx - prev.transfer_rx);
        uploadSpeed = Math.max(0, peer.transfer_tx - prev.transfer_tx);
      }

      prevStatsRef.current = peer;

      setSpeedHistory((h) => {
        const next = [
          ...h,
          {
            timestamp: Date.now(),
            download: downloadSpeed,
            upload: uploadSpeed,
          },
        ];
        // Keep last 60 data points
        if (next.length > 60) return next.slice(-60);
        return next;
      });
    } catch (err) {
      console.error('Failed to poll stats:', err);
    }
  }, [tunnelName, isConnected]);

  // Poll every second when connected
  useEffect(() => {
    if (!isConnected || !tunnelName) return;

    // Initial poll
    pollStats();

    intervalRef.current = setInterval(pollStats, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isConnected, tunnelName, pollStats]);

  return {
    stats,
    speedHistory,
    connectionStartTime,
  };
}
