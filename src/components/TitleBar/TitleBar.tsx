import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

const appWindow = getCurrentWindow();

export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <svg
          className="titlebar-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5zm0 2.18L19 8.3v4.7c0 4.28-3.12 8.26-7 9.24-3.88-.98-7-4.96-7-9.24V8.3l7-4.12z" />
          <path d="M12 7l-4 2.3v3.7c0 2.57 1.72 4.96 4 5.54 2.28-.58 4-2.97 4-5.54V9.3L12 7z" opacity="0.6" />
        </svg>
        <span className="titlebar-text">WireGuard Wedus</span>
      </div>

      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          onClick={() => appWindow.minimize()}
          aria-label="Minimize"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="7" x2="11" y2="7" />
          </svg>
        </button>

        <button
          className="titlebar-btn"
          onClick={() => appWindow.toggleMaximize()}
          aria-label="Maximize"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="8" height="8" rx="1" />
          </svg>
        </button>

        <button
          className="titlebar-btn titlebar-btn--close"
          onClick={() => appWindow.hide()}
          aria-label="Close"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
            <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
