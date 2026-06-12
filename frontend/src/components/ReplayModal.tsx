import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Event, Replay } from "../types";

interface ReplayModalProps {
  event: Event;
  onClose: () => void;
}

export function ReplayModal({ event, onClose }: ReplayModalProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Replay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replays, setReplays] = useState<Replay[]>([]);

  useEffect(() => {
    loadReplays();
  }, [event.id]);

  const loadReplays = async () => {
    try {
      const data = await api.listReplays(event.id);
      setReplays(data);
    } catch (err) {
      console.error("Failed to load replays:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const replay = await api.createReplay(event.id, {
        targetUrl: targetUrl.trim(),
      });
      setResult(replay);
      loadReplays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to replay");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  };

  const formatJson = (str: string | null): string => {
    if (!str) return "";
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Replay Event</h2>
          <button className="btn btn-icon" onClick={onClose}>
            X
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Target URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://example.com/webhook"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Replay"}
            </button>
          </form>

          {error && (
            <div className="replay-result">
              <h4>Error</h4>
              <p className="status-error">{error}</p>
            </div>
          )}

          {result && (
            <div className="replay-result">
              <h4>Result</h4>
              {result.error ? (
                <p className="status-error">{result.error}</p>
              ) : (
                <>
                  <p className="status-success">
                    Status: {result.statusCode}
                  </p>
                  {result.responseBody && (
                    <div className="detail-content" style={{ marginTop: "12px" }}>
                      <pre>{formatJson(result.responseBody)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {replays.length > 0 && (
            <div className="replay-history">
              <h4 style={{ marginBottom: "12px", color: "#888" }}>
                Replay History
              </h4>
              {replays.map((replay) => (
                <div key={replay.id} className="replay-item">
                  <div className="replay-item-header">
                    <span
                      className={
                        replay.error ? "status-error" : "status-success"
                      }
                    >
                      {replay.error
                        ? "Error"
                        : `Status: ${replay.statusCode}`}
                    </span>
                    <span style={{ color: "#666", fontSize: "12px" }}>
                      {formatDate(replay.createdAt)}
                    </span>
                  </div>
                  <div className="replay-item-url">{replay.targetUrl}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
