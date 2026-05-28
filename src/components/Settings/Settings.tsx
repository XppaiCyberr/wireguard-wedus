import { useState } from 'react';
import './Settings.css';

export default function Settings() {
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [defaultDns, setDefaultDns] = useState('1.1.1.1, 8.8.8.8');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date'>('idle');

  const handleCheckUpdates = () => {
    setUpdateStatus('checking');
    setTimeout(() => {
      setUpdateStatus('up-to-date');
    }, 2000);
  };

  return (
    <div className="settings">
      <h2 className="settings-title">Settings</h2>

      {/* General */}
      <div className="settings-card">
        <div className="settings-card-header">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.421-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.116l.094-.318z" />
          </svg>
          General
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Launch on startup</div>
            <div className="settings-row-desc">Start WireGuard Wedus when you log in</div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={launchOnStartup}
              onChange={(e) => setLaunchOnStartup(e.target.checked)}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Start minimized</div>
            <div className="settings-row-desc">Start in the system tray</div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={startMinimized}
              onChange={(e) => setStartMinimized(e.target.checked)}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Auto-connect last tunnel</div>
            <div className="settings-row-desc">Reconnect to the last active tunnel on launch</div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>
      </div>


      {/* Connection */}
      <div className="settings-card">
        <div className="settings-card-header">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM8 4a.75.75 0 01.75.75v2.5h2.5a.75.75 0 010 1.5h-2.5v2.5a.75.75 0 01-1.5 0v-2.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4z" />
          </svg>
          Connection
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Default DNS servers</div>
            <div className="settings-row-desc">Applied to new tunnels by default</div>
          </div>
          <input
            className="settings-input"
            type="text"
            value={defaultDns}
            onChange={(e) => setDefaultDns(e.target.value)}
          />
        </div>
      </div>

      {/* About */}
      <div className="settings-card">
        <div className="settings-card-header">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM7.25 4.75a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM6.5 7.25a.75.75 0 000 1.5h.75V11a.75.75 0 001.5 0V7.25H6.5z" />
          </svg>
          About
        </div>

        <div className="settings-about-row">
          <span className="settings-about-label">Version</span>
          <span className="settings-about-value">0.1.0</span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-label">WireGuard</span>
          <span className="settings-status-badge settings-status-badge--ok">
            <span className="settings-status-badge-dot" />
            Installed
          </span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-label">Updates</span>
          <div className="settings-update-container">
            {updateStatus === 'idle' && (
              <button className="settings-update-btn" onClick={handleCheckUpdates}>
                Check for Updates
              </button>
            )}
            {updateStatus === 'checking' && (
              <div className="settings-update-status settings-update-status--checking">
                <svg className="spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2a6 6 0 105.29 3.15" />
                </svg>
                Checking for updates…
              </div>
            )}
            {updateStatus === 'up-to-date' && (
              <div className="settings-update-status settings-update-status--success">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="3.5,8.5 6.5,11.5 12.5,4.5" />
                </svg>
                Up to date (v0.1.0)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
