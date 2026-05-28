import { useState, useMemo, useCallback } from 'react';
import type { WireGuardConfig, InterfaceConfig, PeerConfig } from '../../lib/types';
import { configToText } from '../../lib/utils';
import * as api from '../../lib/api';
import './ConfigEditor.css';

interface ConfigEditorProps {
  config: WireGuardConfig | null;
  tunnelName?: string;
  onSave: (name: string, config: WireGuardConfig) => void;
  onCancel: () => void;
  isNew: boolean;
}

const emptyInterface: InterfaceConfig = {
  private_key: '',
  address: [],
  dns: [],
};

const emptyPeer: PeerConfig = {
  public_key: '',
  allowed_ips: [],
};

export default function ConfigEditor({
  config,
  tunnelName,
  onSave,
  onCancel,
  isNew,
}: ConfigEditorProps) {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [name, setName] = useState(tunnelName ?? '');

  // Interface state
  const [iface, setIface] = useState<InterfaceConfig>(
    config?.interface_config ?? { ...emptyInterface }
  );
  const [peers, setPeers] = useState<PeerConfig[]>(
    config?.peers ?? [{ ...emptyPeer }]
  );

  // Key visibility
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [showPskMap, setShowPskMap] = useState<Record<number, boolean>>({});

  // Raw text
  const builtConfig = useMemo(
    () => ({ interface_config: iface, peers }),
    [iface, peers]
  );
  const [rawText, setRawText] = useState(() => configToText(builtConfig));

  // Sync visual → raw when switching modes
  const handleModeChange = (m: 'visual' | 'raw') => {
    if (m === 'raw') {
      setRawText(configToText({ interface_config: iface, peers }));
    }
    setMode(m);
  };

  // Interface field helpers
  const updateIface = useCallback(
    (patch: Partial<InterfaceConfig>) => setIface((prev) => ({ ...prev, ...patch })),
    []
  );

  // Peer helpers
  const updatePeer = useCallback((index: number, patch: Partial<PeerConfig>) => {
    setPeers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }, []);

  const addPeer = () => setPeers((prev) => [...prev, { ...emptyPeer }]);
  const removePeer = (index: number) =>
    setPeers((prev) => prev.filter((_, i) => i !== index));

  // Generate keys
  const handleGenerateKeys = async () => {
    try {
      const kp = await api.generateKeypair();
      updateIface({ private_key: kp.private_key });
    } catch (err) {
      console.error('Failed to generate keypair:', err);
    }
  };

  const handleGeneratePsk = async (index: number) => {
    try {
      const psk = await api.generatePsk();
      updatePeer(index, { preshared_key: psk });
    } catch (err) {
      console.error('Failed to generate PSK:', err);
    }
  };

  // Save
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (mode === 'raw') {
      try {
        const parsed = await api.parseConfigText(rawText);
        onSave(trimmedName, parsed);
      } catch (err) {
        console.error('Failed to parse raw config:', err);
      }
    } else {
      onSave(trimmedName, { interface_config: iface, peers });
    }
  };

  // Raw mode line numbers
  const lineCount = rawText.split('\n').length;

  return (
    <div className="config-editor">
      {/* Header */}
      <div className="config-editor-header">
        <h2 className="config-editor-title">
          {isNew ? 'New Tunnel' : `Edit: ${tunnelName}`}
        </h2>
        <div className="config-tabs">
          <button
            className={`config-tab ${mode === 'visual' ? 'config-tab--active' : ''}`}
            onClick={() => handleModeChange('visual')}
          >
            Visual
          </button>
          <button
            className={`config-tab ${mode === 'raw' ? 'config-tab--active' : ''}`}
            onClick={() => handleModeChange('raw')}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Tunnel Name */}
      {isNew && (
        <div className="config-name-field">
          <input
            className="config-name-input"
            type="text"
            placeholder="Tunnel name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {mode === 'visual' ? (
        <>
          {/* Interface Section */}
          <div className="config-section">
            <div className="config-section-header">
              <span className="config-section-title">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="5" width="10" height="6" rx="1" />
                  <line x1="5" y1="5" x2="5" y2="2" />
                  <line x1="9" y1="5" x2="9" y2="2" />
                </svg>
                Interface
              </span>
              <button className="config-generate-btn" onClick={handleGenerateKeys}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 5a3 3 0 11-4.24-4.24" />
                  <path d="M7 7l-4.5 4.5M4 10l1.5 1.5M2 12l1.5-1.5" />
                </svg>
                Generate Keys
              </button>
            </div>

            {/* Private Key */}
            <div className="config-field">
              <label className="config-label">Private Key</label>
              <div className="config-input-wrap">
                <input
                  className="config-input"
                  type={showPrivKey ? 'text' : 'password'}
                  value={iface.private_key}
                  onChange={(e) => updateIface({ private_key: e.target.value })}
                  placeholder="Base64 encoded private key"
                />
                <div className="config-key-actions">
                  <button
                    className="config-key-btn"
                    onClick={() => setShowPrivKey(!showPrivKey)}
                    title={showPrivKey ? 'Hide' : 'Reveal'}
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {showPrivKey ? (
                        <>
                          <path d="M1.5 7s2.5-4 5.5-4 5.5 4 5.5 4-2.5 4-5.5 4-5.5-4-5.5-4z" />
                          <circle cx="7" cy="7" r="1.5" />
                        </>
                      ) : (
                        <>
                          <path d="M2 2l10 10" />
                          <path d="M6.5 4.6A4.8 4.8 0 0112.5 7c-.4.6-1 1.4-2 2.1M9.3 9.3A2.5 2.5 0 014.7 4.7" />
                          <path d="M1.5 7a9 9 0 012.3-2.5" />
                        </>
                      )}
                    </svg>
                  </button>
                  <button
                    className="config-key-btn"
                    onClick={() => navigator.clipboard.writeText(iface.private_key)}
                    title="Copy"
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="4" y="4" width="8" height="8" rx="1" />
                      <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="config-field">
              <label className="config-label">Address</label>
              <input
                className="config-input"
                type="text"
                value={iface.address.join(', ')}
                onChange={(e) =>
                  updateIface({
                    address: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="10.0.0.1/24, fd00::1/128"
              />
            </div>

            {/* DNS */}
            <div className="config-field">
              <label className="config-label">DNS Servers</label>
              <input
                className="config-input"
                type="text"
                value={iface.dns.join(', ')}
                onChange={(e) =>
                  updateIface({
                    dns: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="1.1.1.1, 8.8.8.8"
              />
            </div>

            {/* Listen Port + MTU */}
            <div className="config-row">
              <div className="config-field">
                <label className="config-label">Listen Port</label>
                <input
                  className="config-input config-input--number"
                  type="number"
                  value={iface.listen_port ?? ''}
                  onChange={(e) =>
                    updateIface({
                      listen_port: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Random"
                />
              </div>
              <div className="config-field">
                <label className="config-label">MTU</label>
                <input
                  className="config-input config-input--number"
                  type="number"
                  value={iface.mtu ?? ''}
                  onChange={(e) =>
                    updateIface({
                      mtu: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>

          {/* Peer Sections */}
          {peers.map((peer, idx) => (
            <div className="config-section" key={idx}>
              <div className="config-section-header">
                <span className="config-section-title">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="4" r="2.5" />
                    <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" />
                  </svg>
                  Peer {peers.length > 1 ? `#${idx + 1}` : ''}
                </span>
                <div className="config-peer-actions">
                  {idx === peers.length - 1 && (
                    <button className="config-peer-btn config-peer-btn--add" onClick={addPeer}>
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="6" y1="2" x2="6" y2="10" />
                        <line x1="2" y1="6" x2="10" y2="6" />
                      </svg>
                      Add Peer
                    </button>
                  )}
                  {peers.length > 1 && (
                    <button
                      className="config-peer-btn config-peer-btn--remove"
                      onClick={() => removePeer(idx)}
                    >
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="3" y1="3" x2="9" y2="9" />
                        <line x1="9" y1="3" x2="3" y2="9" />
                      </svg>
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Public Key */}
              <div className="config-field">
                <label className="config-label">Public Key</label>
                <input
                  className="config-input"
                  type="text"
                  value={peer.public_key}
                  onChange={(e) => updatePeer(idx, { public_key: e.target.value })}
                  placeholder="Base64 encoded public key"
                />
              </div>

              {/* Endpoint */}
              <div className="config-field">
                <label className="config-label">Endpoint</label>
                <input
                  className="config-input"
                  type="text"
                  value={peer.endpoint ?? ''}
                  onChange={(e) =>
                    updatePeer(idx, { endpoint: e.target.value || undefined })
                  }
                  placeholder="vpn.example.com:51820"
                />
              </div>

              {/* Allowed IPs */}
              <div className="config-field">
                <label className="config-label">Allowed IPs</label>
                <input
                  className="config-input"
                  type="text"
                  value={peer.allowed_ips.join(', ')}
                  onChange={(e) =>
                    updatePeer(idx, {
                      allowed_ips: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="0.0.0.0/0, ::/0"
                />
              </div>

              {/* Preshared Key */}
              <div className="config-field">
                <label className="config-label">Preshared Key (optional)</label>
                <div className="config-input-wrap">
                  <input
                    className="config-input"
                    type={showPskMap[idx] ? 'text' : 'password'}
                    value={peer.preshared_key ?? ''}
                    onChange={(e) =>
                      updatePeer(idx, { preshared_key: e.target.value || undefined })
                    }
                    placeholder="Base64 encoded preshared key"
                  />
                  <div className="config-key-actions">
                    <button
                      className="config-key-btn"
                      onClick={() =>
                        setShowPskMap((m) => ({ ...m, [idx]: !m[idx] }))
                      }
                      title={showPskMap[idx] ? 'Hide' : 'Reveal'}
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1.5 7s2.5-4 5.5-4 5.5 4 5.5 4-2.5 4-5.5 4-5.5-4-5.5-4z" />
                        <circle cx="7" cy="7" r="1.5" />
                      </svg>
                    </button>
                    <button
                      className="config-key-btn"
                      onClick={() => handleGeneratePsk(idx)}
                      title="Generate PSK"
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M10 5a3 3 0 11-4.24-4.24" />
                        <path d="M7 7l-4.5 4.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Persistent Keepalive */}
              <div className="config-field">
                <label className="config-label">Persistent Keepalive (seconds)</label>
                <input
                  className="config-input config-input--number"
                  type="number"
                  value={peer.persistent_keepalive ?? ''}
                  onChange={(e) =>
                    updatePeer(idx, {
                      persistent_keepalive: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="25"
                />
              </div>
            </div>
          ))}
        </>
      ) : (
        /* Raw Mode */
        <div className="config-raw-wrap">
          <div className="config-raw-lines">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            className="config-raw-textarea"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="[Interface]&#10;PrivateKey = ...&#10;Address = 10.0.0.1/24&#10;&#10;[Peer]&#10;PublicKey = ...&#10;Endpoint = vpn.example.com:51820&#10;AllowedIPs = 0.0.0.0/0"
            spellCheck={false}
          />
        </div>
      )}

      {/* Footer */}
      <div className="config-footer">
        <button className="config-footer-btn config-footer-btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="config-footer-btn config-footer-btn--save" onClick={handleSave}>
          {isNew ? 'Create Tunnel' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
