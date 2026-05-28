import './EmptyState.css';

interface EmptyStateProps {
  onCreateTunnel: () => void;
  onImportConfig: () => void;
}

export default function EmptyState({ onCreateTunnel, onImportConfig }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5zm0 2.18L19 8.3v4.7c0 4.28-3.12 8.26-7 9.24-3.88-.98-7-4.96-7-9.24V8.3l7-4.12z" />
        <path d="M12 7l-4 2.3v3.7c0 2.57 1.72 4.96 4 5.54 2.28-.58 4-2.97 4-5.54V9.3L12 7z" opacity="0.4" />
      </svg>

      <h2 className="empty-state-heading">No tunnels configured</h2>
      <p className="empty-state-subtext">
        Create a new WireGuard tunnel or import an existing <code>.conf</code> file to get started.
      </p>

      <div className="empty-state-actions">
        <button className="empty-state-btn empty-state-btn--primary" onClick={onCreateTunnel}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Create Tunnel
        </button>
        <button className="empty-state-btn empty-state-btn--ghost" onClick={onImportConfig}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
            <polyline points="5,6 8,9 11,6" />
            <line x1="8" y1="2" x2="8" y2="9" />
          </svg>
          Import Config
        </button>
      </div>
    </div>
  );
}
