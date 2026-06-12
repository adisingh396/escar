import { useState } from "react";
import type { Hook } from "../types";

interface HookListProps {
  hooks: Hook[];
  selectedHook: Hook | null;
  onSelect: (hook: Hook) => void;
  onCreate: (name: string) => void;
  onDelete: (hookId: string) => void;
  onSettings: () => void;
}

export function HookList({
  hooks,
  selectedHook,
  onSelect,
  onCreate,
  onDelete,
  onSettings,
}: HookListProps) {
  const [newHookName, setNewHookName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHookName.trim()) {
      onCreate(newHookName.trim());
      setNewHookName("");
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getWebhookUrl = (hookId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/hooks/${hookId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="panel hook-list">
      <div className="panel-header">
        <h2>Hooks</h2>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setIsCreating(true)}
        >
          + New
        </button>
      </div>
      <div className="panel-content">
        {isCreating && (
          <form className="create-hook-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="input"
              placeholder="Hook name..."
              value={newHookName}
              onChange={(e) => setNewHookName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-small">
              Create
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setIsCreating(false);
                setNewHookName("");
              }}
            >
              Cancel
            </button>
          </form>
        )}
        {hooks.length === 0 && !isCreating ? (
          <div className="empty-state">
            <p>No hooks yet</p>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
            >
              Create your first hook
            </button>
          </div>
        ) : (
          hooks.map((hook) => (
            <div key={hook.id}>
              <div
                className={`hook-item ${
                  selectedHook?.id === hook.id ? "selected" : ""
                }`}
                onClick={() => onSelect(hook)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hook-name">{hook.name}</div>
                  <div className="hook-date">{formatDate(hook.createdAt)}</div>
                  {hook.forwardUrl && (
                    <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "2px" }}>
                      Forwarding enabled
                    </div>
                  )}
                  {hook.monitorEnabled && (
                    <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px" }}>
                      Monitoring ({hook.monitorTimeoutMinutes}m)
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="btn btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(hook);
                      onSettings();
                    }}
                    title="Settings"
                  >
                    ...
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this hook?")) {
                        onDelete(hook.id);
                      }
                    }}
                    title="Delete"
                  >
                    X
                  </button>
                </div>
              </div>
              {selectedHook?.id === hook.id && (
                <div className="url-display">
                  <code>{getWebhookUrl(hook.id)}</code>
                  <button
                    className="btn btn-icon btn-small"
                    onClick={() => copyToClipboard(getWebhookUrl(hook.id))}
                    title="Copy URL"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
