import { useState, useEffect } from 'react';
import type { TunnelInfo } from '../../lib/types';
import { getStatusLabel, getStatusKey, formatDuration } from '../../lib/utils';
import './StatusPanel.css';

interface StatusPanelProps {
  tunnel: TunnelInfo;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  connectionStartTime: number | null;
}

export default function StatusPanel({
  tunnel,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  connectionStartTime,
}: StatusPanelProps) {
  const statusKey = getStatusKey(tunnel.status);
  const isConnected = tunnel.status === 'Connected';
  const isConnecting = tunnel.status === 'Connecting';
  const isError = typeof tunnel.status === 'object' && 'Error' in tunnel.status;
  const errorMessage = isError ? (tunnel.status as { Error: string }).Error : '';

  // Live timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isConnected || !connectionStartTime) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor(Date.now() / 1000) - connectionStartTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isConnected, connectionStartTime]);

  const config = tunnel.config;
  const iface = config?.interface_config;
  const peer = config?.peers?.[0];

  return (
    <div className="status-panel">
      {/* Shield Icon */}
      <svg
        className={`status-shield status-shield--${statusKey}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5zm0 2.18L19 8.3v4.7c0 4.28-3.12 8.26-7 9.24-3.88-.98-7-4.96-7-9.24V8.3l7-4.12z" />
        <path d="M12 7l-4 2.3v3.7c0 2.57 1.72 4.96 4 5.54 2.28-.58 4-2.97 4-5.54V9.3L12 7z" opacity="0.5" />
      </svg>

      {/* Tunnel Name */}
      <h1 className="status-tunnel-name">{tunnel.name}</h1>

      {/* Status Badge */}
      <div className={`status-badge status-badge--${statusKey}`}>
        <span className="status-badge-dot" />
        {getStatusLabel(tunnel.status)}
      </div>

      {/* Action Button */}
      {isConnecting ? (
        <button className="status-action-btn status-action-btn--connecting" disabled>
          <svg className="spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2a6 6 0 105.29 3.15" />
          </svg>
          Connecting…
        </button>
      ) : isConnected ? (
        <button
          className="status-action-btn status-action-btn--disconnect"
          onClick={onDisconnect}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="8" height="8" rx="1" />
          </svg>
          Disconnect
        </button>
      ) : (
        <button
          className="status-action-btn status-action-btn--connect"
          onClick={onConnect}
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2.5a.5.5 0 01.77-.42l9 5.5a.5.5 0 010 .84l-9 5.5A.5.5 0 014 13.5v-11z" />
          </svg>
          Connect
        </button>
      )}

      {/* Console log window */}
      {(isConnecting || isError) && (
        <div className="status-console">
          <div className="status-console-header">
            <span className="status-console-dot status-console-dot--red" />
            <span className="status-console-dot status-console-dot--yellow" />
            <span className="status-console-dot status-console-dot--green" />
            <span className="status-console-title">Connection Console</span>
          </div>
          <div className="status-console-body">
            <div className="status-console-line">
              <span className="status-console-tag">[SYSTEM]</span> Initializing tunnel service for "{tunnel.name}"...
            </div>
            <div className="status-console-line">
              <span className="status-console-tag">[SYSTEM]</span> Checking administrative UAC credentials... <span className="status-console-success">OK</span>
            </div>
            <div className="status-console-line">
              <span className="status-console-tag">[SYSTEM]</span> Verifying WireGuard configurations... <span className="status-console-success">OK</span>
            </div>
            <div className="status-console-line">
              <span className="status-console-tag">[SYSTEM]</span> Querying service state "WireGuardTunnel${tunnel.name}"...
            </div>
            {isConnecting && (
              <div className="status-console-line status-console-line--active">
                <span className="status-console-tag">[SYSTEM]</span> net start WireGuardTunnel${tunnel.name} in progress...
                <span className="status-console-cursor" />
              </div>
            )}
            {isError && (
              <>
                <div className="status-console-line">
                  <span className="status-console-tag">[SYSTEM]</span> net start WireGuardTunnel${tunnel.name} failed.
                </div>
                <div className="status-console-line status-console-line--error">
                  <span className="status-console-tag status-console-tag--error">[ERROR]</span> {errorMessage || "Access denied or interface already exists"}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info Grid (shown when connected) */}
      {isConnected && (
        <div className="status-info-grid">
          {peer?.endpoint && (
            <div className="status-info-item">
              <div className="status-info-label">Endpoint</div>
              <div className="status-info-value">{peer.endpoint}</div>
            </div>
          )}
          {iface?.address && iface.address.length > 0 && (
            <div className="status-info-item">
              <div className="status-info-label">Address</div>
              <div className="status-info-value">{iface.address.join(', ')}</div>
            </div>
          )}
          <div className="status-info-item">
            <div className="status-info-label">Duration</div>
            <div className="status-info-value">{formatDuration(elapsed)}</div>
          </div>
          {iface?.dns && iface.dns.length > 0 && (
            <div className="status-info-item">
              <div className="status-info-label">DNS</div>
              <div className="status-info-value">{iface.dns.join(', ')}</div>
            </div>
          )}
        </div>
      )}

      {/* Secondary Actions */}
      {!isConnected && (
        <div className="status-secondary-actions">
          <button className="status-secondary-btn" onClick={onEdit}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" />
            </svg>
            Edit
          </button>
          <button className="status-secondary-btn status-secondary-btn--danger" onClick={onDelete}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" />
              <path d="M5.5 6v4M8.5 6v4M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
