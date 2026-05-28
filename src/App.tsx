import { useRef, useCallback, useMemo } from 'react';
import type { ViewMode, WireGuardConfig } from './lib/types';
import { useTunnels } from './hooks/useTunnels';
import { useStats } from './hooks/useStats';
import { useState } from 'react';
import TitleBar from './components/TitleBar/TitleBar';
import Sidebar from './components/Sidebar/Sidebar';
import EmptyState from './components/EmptyState/EmptyState';
import StatusPanel from './components/StatusPanel/StatusPanel';
import StatsPanel from './components/StatsPanel/StatsPanel';
import ConfigEditor from './components/ConfigEditor/ConfigEditor';
import Settings from './components/Settings/Settings';
import './App.css';

export default function App() {
  const {
    tunnels,
    selectedTunnel,
    loading,
    selectTunnel,
    createTunnel,
    importTunnel,
    deleteTunnel,
    connectTunnel,
    disconnectTunnel,
    updateTunnel,
  } = useTunnels();

  const [currentView, setCurrentView] = useState<ViewMode>('status');
  const [isNewTunnel, setIsNewTunnel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find selected tunnel info
  const activeTunnel = useMemo(
    () => tunnels.find((t) => t.name === selectedTunnel) ?? null,
    [tunnels, selectedTunnel]
  );

  const isConnected = activeTunnel?.status === 'Connected';

  // Stats hook
  const { stats, speedHistory, connectionStartTime } = useStats(
    selectedTunnel,
    isConnected
  );

  // --- Handlers ---

  const handleNewTunnel = useCallback(() => {
    setIsNewTunnel(true);
    setCurrentView('editor');
  }, []);

  const handleImportTunnel = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const content = await file.text();
      const name = file.name.replace(/\.conf$/i, '');
      try {
        await importTunnel(name, content);
        setCurrentView('status');
      } catch (err) {
        console.error('Import failed:', err);
      }
      // Reset input
      e.target.value = '';
    },
    [importTunnel]
  );

  const handleSaveConfig = useCallback(
    async (name: string, config: WireGuardConfig) => {
      try {
        if (isNewTunnel) {
          await createTunnel(name, config);
        } else {
          await updateTunnel(name, config);
        }
        setIsNewTunnel(false);
        setCurrentView('status');
      } catch (err) {
        console.error('Save failed:', err);
      }
    },
    [isNewTunnel, createTunnel, updateTunnel]
  );

  const handleCancelEdit = useCallback(() => {
    setIsNewTunnel(false);
    setCurrentView('status');
  }, []);

  const handleEdit = useCallback(() => {
    setIsNewTunnel(false);
    setCurrentView('editor');
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedTunnel) return;
    try {
      await deleteTunnel(selectedTunnel);
      setCurrentView('status');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [selectedTunnel, deleteTunnel]);

  const handleConnect = useCallback(async () => {
    if (!selectedTunnel) return;
    try {
      await connectTunnel(selectedTunnel);
    } catch (err) {
      console.error('Connect failed:', err);
    }
  }, [selectedTunnel, connectTunnel]);

  const handleDisconnect = useCallback(async () => {
    if (!selectedTunnel) return;
    try {
      await disconnectTunnel(selectedTunnel);
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  }, [selectedTunnel, disconnectTunnel]);

  const handleViewChange = useCallback((view: ViewMode) => {
    setIsNewTunnel(false);
    setCurrentView(view);
  }, []);

  // --- Render Main Content ---
  const renderMain = () => {
    if (loading) {
      return (
        <div className="app-loading">
          <div className="app-loading-spinner" />
          Loading…
        </div>
      );
    }

    if (currentView === 'settings') {
      return <Settings />;
    }

    if (currentView === 'editor') {
      return (
        <ConfigEditor
          config={isNewTunnel ? null : activeTunnel?.config ?? null}
          tunnelName={isNewTunnel ? undefined : selectedTunnel ?? undefined}
          onSave={handleSaveConfig}
          onCancel={handleCancelEdit}
          isNew={isNewTunnel}
        />
      );
    }

    // Status view
    if (tunnels.length === 0) {
      return (
        <EmptyState
          onCreateTunnel={handleNewTunnel}
          onImportConfig={handleImportTunnel}
        />
      );
    }

    if (!activeTunnel) {
      return (
        <EmptyState
          onCreateTunnel={handleNewTunnel}
          onImportConfig={handleImportTunnel}
        />
      );
    }

    return (
      <>
        <StatusPanel
          tunnel={activeTunnel}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onEdit={handleEdit}
          onDelete={handleDelete}
          connectionStartTime={connectionStartTime}
        />
        {isConnected && (
          <StatsPanel
            stats={stats}
            speedHistory={speedHistory}
            connectionStartTime={connectionStartTime}
          />
        )}
      </>
    );
  };

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar
          tunnels={tunnels}
          selectedTunnel={selectedTunnel}
          onSelectTunnel={selectTunnel}
          onNewTunnel={handleNewTunnel}
          onImportTunnel={handleImportTunnel}
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        <main className="app-main">{renderMain()}</main>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".conf"
        className="app-file-input"
        onChange={handleFileSelect}
      />
    </div>
  );
}
