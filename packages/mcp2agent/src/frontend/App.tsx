import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, RefreshCw, Trash2, X, ChevronRight, Wrench, Zap } from 'lucide-react';

// Types
interface ServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  toolCount?: number;
  transport?: 'stdio' | 'http';
  package?: string;
  url?: string;
  serverVersion?: {
    name: string;
    version: string;
  };
  hasHeaders?: boolean;
  hasEnv?: boolean;
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

// API base URL
const API_BASE = import.meta.env.DEV ? 'http://localhost:28888' : '';

// API functions
async function fetchServers(): Promise<ServerInfo[]> {
  const res = await fetch(`${API_BASE}/servers`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch servers');
  return data.data;
}

async function fetchServerTools(serverName: string): Promise<Tool[]> {
  const res = await fetch(`${API_BASE}/servers/${serverName}/tools`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch tools');
  return data.data;
}

async function addServer(params: { name: string; package?: string; url?: string; args?: string[] }): Promise<void> {
  const res = await fetch(`${API_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to add server');
}

async function removeServer(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${name}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to remove server');
}

// Components
function StatusDot({ status }: { status: string }) {
  const colorClass = status === 'connected' ? 'connected' : 'disconnected';
  return <span className={`status-dot ${colorClass}`} />;
}

function ServerCard({
  server,
  selected,
  onClick,
}: {
  server: ServerInfo;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`server-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="server-card-header">
        <Server size={16} />
        <span className="server-name">{server.name}</span>
        {server.serverVersion?.version && (
          <span className="server-version">v{server.serverVersion.version}</span>
        )}
      </div>
      <div className="server-meta">
        <span className="server-status">
          <StatusDot status={server.status} />
          {server.status}
        </span>
        <span>{server.toolCount || 0} tools</span>
        <span>{server.transport}</span>
      </div>
    </div>
  );
}

function AddServerModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: { name: string; package?: string; url?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [packageOrUrl, setPackageOrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isUrl = packageOrUrl.startsWith('http://') || packageOrUrl.startsWith('https://');
    const params = isUrl
      ? { name, url: packageOrUrl }
      : { name, package: packageOrUrl };

    try {
      await onAdd(params);
      setName('');
      setPackageOrUrl('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add MCP Server</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Server Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., chrome-devtools"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Package or URL</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., chrome-devtools-mcp@latest or https://..."
                value={packageOrUrl}
                onChange={(e) => setPackageOrUrl(e.target.value)}
                required
              />
              <p className="text-sm text-muted mt-4">
                Enter an npm package name for stdio servers, or a URL for HTTP servers.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name || !packageOrUrl || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToolsList({ serverName }: { serverName: string }) {
  const { data: tools, isLoading, error } = useQuery({
    queryKey: ['tools', serverName],
    queryFn: () => fetchServerTools(serverName),
    enabled: !!serverName,
  });

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <p>Failed to load tools</p>
      </div>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <div className="empty-state">
        <Wrench size={48} className="empty-state-icon" />
        <h3 className="empty-state-title">No Tools Available</h3>
        <p className="empty-state-description">
          This server doesn't expose any tools, or it's not connected.
        </p>
      </div>
    );
  }

  return (
    <div className="tools-list">
      {tools.map((tool) => (
        <div key={tool.name} className="tool-item">
          <div className="tool-name">{tool.name}</div>
          {tool.description && <div className="tool-description">{tool.description}</div>}
        </div>
      ))}
    </div>
  );
}

function ServerDetails({
  server,
  onRemove,
}: {
  server: ServerInfo;
  onRemove: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'tools' | 'generate' | 'skill'>('tools');

  return (
    <div>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <h2 className="card-title">{server.name}</h2>
          {server.serverVersion?.version && (
            <span className="badge badge-success">v{server.serverVersion.version}</span>
          )}
        </div>
        <button className="btn btn-danger btn-sm" onClick={onRemove}>
          <Trash2 size={14} />
          Remove
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <Wrench size={16} />
          Tools ({server.toolCount || 0})
        </button>
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <Zap size={16} />
          Generate Scripts
        </button>
        <button
          className={`tab ${activeTab === 'skill' ? 'active' : ''}`}
          onClick={() => setActiveTab('skill')}
        >
          <ChevronRight size={16} />
          Create Skill
        </button>
      </div>

      {activeTab === 'tools' && <ToolsList serverName={server.name} />}

      {activeTab === 'generate' && (
        <div className="empty-state">
          <Zap size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">Generate Scripts</h3>
          <p className="empty-state-description">
            Generate JavaScript CLI scripts for all tools in this server.
          </p>
          <button className="btn btn-primary" disabled>
            Coming Soon
          </button>
        </div>
      )}

      {activeTab === 'skill' && (
        <div className="empty-state">
          <Server size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">Create Skill with LLM</h3>
          <p className="empty-state-description">
            Use AI to generate enhanced skill documentation with examples and workflows.
          </p>
          <button className="btn btn-primary" disabled>
            Coming Soon
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch servers
  const {
    data: servers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Add server mutation
  const addMutation = useMutation({
    mutationFn: addServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  // Remove server mutation
  const removeMutation = useMutation({
    mutationFn: removeServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setSelectedServer(null);
    },
  });

  const selectedServerData = servers.find((s) => s.name === selectedServer);
  const connectedCount = servers.filter((s) => s.status === 'connected').length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <Server size={24} />
          mcp2agent
        </div>
        <div className="header-status">
          <StatusDot status={connectedCount > 0 ? 'connected' : 'disconnected'} />
          {connectedCount} / {servers.length} servers connected
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">MCP Servers</span>
            <div className="flex gap-2">
              <button
                className="btn btn-icon btn-secondary"
                onClick={() => refetch()}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="btn btn-icon btn-primary"
                onClick={() => setShowAddModal(true)}
                title="Add Server"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="server-list">
            {isLoading && (
              <div className="loading">
                <div className="spinner" />
              </div>
            )}

            {error && (
              <div className="empty-state">
                <p>Failed to load servers</p>
                <button className="btn btn-secondary btn-sm mt-4" onClick={() => refetch()}>
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && servers.length === 0 && (
              <div className="empty-state">
                <Server size={32} className="empty-state-icon" />
                <p className="empty-state-title">No Servers</p>
                <p className="empty-state-description">Add your first MCP server to get started.</p>
              </div>
            )}

            {servers.map((server) => (
              <ServerCard
                key={server.name}
                server={server}
                selected={selectedServer === server.name}
                onClick={() => setSelectedServer(server.name)}
              />
            ))}
          </div>
        </aside>

        <section className="content">
          {selectedServerData ? (
            <ServerDetails
              server={selectedServerData}
              onRemove={() => {
                if (confirm(`Remove server "${selectedServerData.name}"?`)) {
                  removeMutation.mutate(selectedServerData.name);
                }
              }}
            />
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <Server size={64} className="empty-state-icon" />
              <h2 className="empty-state-title">Select a Server</h2>
              <p className="empty-state-description">
                Choose a server from the sidebar to view its tools and manage skills.
              </p>
            </div>
          )}
        </section>
      </main>

      <AddServerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(params) => addMutation.mutateAsync(params)}
      />
    </div>
  );
}
