import { useState, useMemo } from 'react';
import type { TunnelInfo, ViewMode } from '../../lib/types';
import { getStatusLabel, getStatusKey } from '../../lib/utils';
import './Sidebar.css';

interface SidebarProps {
  tunnels: TunnelInfo[];
  selectedTunnel: string | null;
  onSelectTunnel: (name: string) => void;
  onNewTunnel: () => void;
  onImportTunnel: () => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function Sidebar({
  tunnels,
  selectedTunnel,
  onSelectTunnel,
  onNewTunnel,
  onImportTunnel,
  currentView,
  onViewChange,
}: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return tunnels;
    const q = search.toLowerCase();
    return tunnels.filter((t) => t.name.toLowerCase().includes(q));
  }, [tunnels, search]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Tunnels</span>
        <span className="sidebar-count">{tunnels.length}</span>
      </div>

      <div className="sidebar-search">
        <div className="sidebar-search-wrap">
          <svg
            className="sidebar-search-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            className="sidebar-search-input"
            type="text"
            placeholder="Search tunnels…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-list">
        {filtered.map((tunnel) => {
          const statusKey = getStatusKey(tunnel.status);
          const isActive = tunnel.name === selectedTunnel && currentView !== 'settings';
          return (
            <div
              key={tunnel.name}
              className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              onClick={() => {
                onSelectTunnel(tunnel.name);
                if (currentView === 'settings') onViewChange('status');
              }}
            >
              <div className={`sidebar-item-dot sidebar-item-dot--${statusKey}`} />
              <div className="sidebar-item-info">
                <div className="sidebar-item-name">{tunnel.name}</div>
                <div className="sidebar-item-status">{getStatusLabel(tunnel.status)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-settings">
        <button
          className={`sidebar-settings-btn ${currentView === 'settings' ? 'sidebar-settings-btn--active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.421-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.116l.094-.318z" />
          </svg>
          Settings
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-btn-new" onClick={onNewTunnel}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="7" y1="3" x2="7" y2="11" />
            <line x1="3" y1="7" x2="11" y2="7" />
          </svg>
          New Tunnel
        </button>
        <button className="sidebar-btn-import" onClick={onImportTunnel} title="Import .conf">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 9v2.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V9" />
            <polyline points="4.5,5.5 7,8 9.5,5.5" />
            <line x1="7" y1="2" x2="7" y2="8" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
