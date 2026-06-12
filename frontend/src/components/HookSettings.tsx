import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Hook } from "../types";

interface HookSettingsProps {
  hook: Hook;
  onClose: () => void;
  onUpdate: (hook: Hook) => void;
}

export function HookSettings({ hook, onClose, onUpdate }: HookSettingsProps) {
  const [name, setName] = useState(hook.name);
  const [responseStatusCode, setResponseStatusCode] = useState(
    hook.responseStatusCode.toString()
  );
  const [responseBody, setResponseBody] = useState(hook.responseBody);
  const [responseHeaders, setResponseHeaders] = useState(
    JSON.stringify(hook.responseHeaders, null, 2)
  );
  const [forwardUrl, setForwardUrl] = useState(hook.forwardUrl || "");

  // Signature validation
  const [signatureSecret, setSignatureSecret] = useState(hook.signatureSecret || "");

  // Monitor settings
  const [monitorEnabled, setMonitorEnabled] = useState(hook.monitorEnabled);
  const [monitorTimeoutMinutes, setMonitorTimeoutMinutes] = useState(
    hook.monitorTimeoutMinutes?.toString() || "60"
  );
  const [monitorNotifyEmail, setMonitorNotifyEmail] = useState(
    hook.monitorNotifyEmail || ""
  );
  const [monitorSlackWebhook, setMonitorSlackWebhook] = useState(
    hook.monitorSlackWebhook || ""
  );
  const [monitorDiscordWebhook, setMonitorDiscordWebhook] = useState(
    hook.monitorDiscordWebhook || ""
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(hook.name);
    setResponseStatusCode(hook.responseStatusCode.toString());
    setResponseBody(hook.responseBody);
    setResponseHeaders(JSON.stringify(hook.responseHeaders, null, 2));
    setForwardUrl(hook.forwardUrl || "");
    setSignatureSecret(hook.signatureSecret || "");
    setMonitorEnabled(hook.monitorEnabled);
    setMonitorTimeoutMinutes(hook.monitorTimeoutMinutes?.toString() || "60");
    setMonitorNotifyEmail(hook.monitorNotifyEmail || "");
    setMonitorSlackWebhook(hook.monitorSlackWebhook || "");
    setMonitorDiscordWebhook(hook.monitorDiscordWebhook || "");
  }, [hook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let parsedHeaders = {};
      if (responseHeaders.trim()) {
        try {
          parsedHeaders = JSON.parse(responseHeaders);
        } catch {
          setError("Invalid JSON in response headers");
          setIsLoading(false);
          return;
        }
      }

      const statusCode = parseInt(responseStatusCode, 10);
      if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
        setError("Status code must be between 100 and 599");
        setIsLoading(false);
        return;
      }

      const timeoutMins = parseInt(monitorTimeoutMinutes, 10);
      if (monitorEnabled && (isNaN(timeoutMins) || timeoutMins < 1 || timeoutMins > 1440)) {
        setError("Timeout must be between 1 and 1440 minutes");
        setIsLoading(false);
        return;
      }

      const hasNotificationMethod =
        monitorNotifyEmail.trim() ||
        monitorSlackWebhook.trim() ||
        monitorDiscordWebhook.trim();

      if (monitorEnabled && !hasNotificationMethod) {
        setError("At least one notification method (Email, Slack, or Discord) is required");
        setIsLoading(false);
        return;
      }

      const updatedHook = await api.updateHook(hook.id, {
        name,
        responseStatusCode: statusCode,
        responseBody,
        responseHeaders: parsedHeaders,
        forwardUrl: forwardUrl.trim() || null,
        signatureSecret: signatureSecret.trim() || null,
        monitorEnabled,
        monitorTimeoutMinutes: monitorEnabled ? timeoutMins : null,
        monitorNotifyEmail: monitorEnabled && monitorNotifyEmail.trim() ? monitorNotifyEmail.trim() : null,
        monitorSlackWebhook: monitorEnabled && monitorSlackWebhook.trim() ? monitorSlackWebhook.trim() : null,
        monitorDiscordWebhook: monitorEnabled && monitorDiscordWebhook.trim() ? monitorDiscordWebhook.trim() : null,
      });

      onUpdate(updatedHook);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update hook");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Hook Settings</h2>
          <button className="btn btn-icon" onClick={onClose}>
            X
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  color: "#f87171",
                  marginBottom: "16px",
                  padding: "8px",
                  background: "rgba(248, 113, 113, 0.1)",
                  borderRadius: "4px",
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <h3 style={{ marginTop: "24px", marginBottom: "16px", color: "#888", fontSize: "14px" }}>
              Custom Response
            </h3>

            <div className="form-group">
              <label>Status Code</label>
              <input
                type="number"
                className="input"
                value={responseStatusCode}
                onChange={(e) => setResponseStatusCode(e.target.value)}
                min="100"
                max="599"
                style={{ width: "120px" }}
              />
            </div>

            <div className="form-group">
              <label>Response Headers (JSON)</label>
              <textarea
                className="input"
                value={responseHeaders}
                onChange={(e) => setResponseHeaders(e.target.value)}
                rows={4}
                placeholder='{"X-Custom-Header": "value"}'
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>

            <div className="form-group">
              <label>Response Body</label>
              <textarea
                className="input"
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                rows={4}
                placeholder='{"success": true}'
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>

            <h3 style={{ marginTop: "24px", marginBottom: "16px", color: "#888", fontSize: "14px" }}>
              Webhook Forwarding
            </h3>

            <div className="form-group">
              <label>Forward URL</label>
              <input
                type="url"
                className="input"
                value={forwardUrl}
                onChange={(e) => setForwardUrl(e.target.value)}
                placeholder="http://localhost:3000/webhook"
              />
              <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                Incoming webhooks will be forwarded to this URL (like ngrok)
              </small>
            </div>

            <h3 style={{ marginTop: "24px", marginBottom: "16px", color: "#3b82f6", fontSize: "14px" }}>
              Signature Validation (Verify webhook authenticity)
            </h3>

            <div className="form-group">
              <label>Webhook Secret</label>
              <input
                type="password"
                className="input"
                value={signatureSecret}
                onChange={(e) => setSignatureSecret(e.target.value)}
                placeholder="whsec_... or your webhook signing secret"
                style={{ fontFamily: "monospace" }}
              />
              <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                Auto-detects: Stripe, GitHub, Shopify, Slack, Twilio
              </small>
            </div>

            <h3 style={{ marginTop: "24px", marginBottom: "16px", color: "#22c55e", fontSize: "14px" }}>
              Monitor (Get alerted when webhooks stop)
            </h3>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={monitorEnabled}
                  onChange={(e) => setMonitorEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                Enable Monitoring
              </label>
              <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                Get notified when no webhooks are received within the timeout period
              </small>
            </div>

            {monitorEnabled && (
              <>
                <div className="form-group">
                  <label>Timeout (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={monitorTimeoutMinutes}
                    onChange={(e) => setMonitorTimeoutMinutes(e.target.value)}
                    min="1"
                    max="1440"
                    style={{ width: "120px" }}
                  />
                  <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                    Alert if no webhook received within this time (1-1440 minutes)
                  </small>
                </div>

                <div style={{ marginTop: "16px", marginBottom: "8px", color: "#888", fontSize: "12px" }}>
                  Configure at least one notification channel:
                </div>

                <div className="form-group">
                  <label>Slack Webhook URL</label>
                  <input
                    type="url"
                    className="input"
                    value={monitorSlackWebhook}
                    onChange={(e) => setMonitorSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>

                <div className="form-group">
                  <label>Discord Webhook URL</label>
                  <input
                    type="url"
                    className="input"
                    value={monitorDiscordWebhook}
                    onChange={(e) => setMonitorDiscordWebhook(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </div>

                <div className="form-group">
                  <label>Email (optional, requires SendGrid)</label>
                  <input
                    type="email"
                    className="input"
                    value={monitorNotifyEmail}
                    onChange={(e) => setMonitorNotifyEmail(e.target.value)}
                    placeholder="alerts@example.com"
                  />
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
