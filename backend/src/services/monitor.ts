import { listMonitoredHooks, updateHook } from "../db/client.js";
import { config } from "../config.js";

async function sendSlackNotification(
  webhookUrl: string,
  hookName: string,
  hookId: string,
  timeoutMinutes: number
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Escar alert: webhook endpoint *"${hookName}"* has not received any webhooks in the last *${timeoutMinutes} minutes*.\n\nHook ID: \`${hookId}\`\nTimeout: ${timeoutMinutes} minutes\n\nCheck the upstream integration and delivery settings.`,
      }),
    });

    if (!response.ok) {
      console.error(`[Monitor] Slack error: ${response.status}`);
      return false;
    }

    console.log(`[Monitor] Slack notification sent for hook "${hookName}"`);
    return true;
  } catch (err) {
    console.error("[Monitor] Failed to send Slack notification:", err);
    return false;
  }
}

async function sendDiscordNotification(
  webhookUrl: string,
  hookName: string,
  hookId: string,
  timeoutMinutes: number
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "Escar webhook alert",
            description: `Your webhook endpoint **"${hookName}"** has not received any webhooks in the last **${timeoutMinutes} minutes**.`,
            color: 15158332, // Red color
            fields: [
              { name: "Hook ID", value: `\`${hookId}\``, inline: true },
              { name: "Timeout", value: `${timeoutMinutes} minutes`, inline: true },
            ],
            footer: {
              text: "Escar - Webhook Workbench",
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[Monitor] Discord error: ${response.status}`);
      return false;
    }

    console.log(`[Monitor] Discord notification sent for hook "${hookName}"`);
    return true;
  } catch (err) {
    console.error("[Monitor] Failed to send Discord notification:", err);
    return false;
  }
}

async function sendAlertEmail(
  to: string,
  hookName: string,
  hookId: string,
  timeoutMinutes: number
): Promise<boolean> {
  // If no SendGrid API key is configured, log to console
  if (!config.sendgridApiKey) {
    console.log(
      `[Monitor Alert] Hook "${hookName}" (${hookId}) has not received webhooks for ${timeoutMinutes} minutes. Would send email to: ${to}`
    );
    return true;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.sendgridApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: `[Escar] Alert: No webhooks received for "${hookName}"`,
          },
        ],
        from: { email: config.emailFrom },
        content: [
          {
            type: "text/plain",
            value: `Your webhook endpoint "${hookName}" has not received any webhooks in the last ${timeoutMinutes} minutes.

Hook ID: ${hookId}
Timeout: ${timeoutMinutes} minutes

This could indicate:
- The external service stopped sending webhooks
- Network connectivity issues
- Configuration changes on the sending side

Please check your integration to ensure everything is working correctly.

---
Escar - Webhook Workbench`,
          },
          {
            type: "text/html",
            value: `
<h2>Webhook Alert</h2>
<p>Your webhook endpoint <strong>"${hookName}"</strong> has not received any webhooks in the last <strong>${timeoutMinutes} minutes</strong>.</p>

<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hook ID</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;"><code>${hookId}</code></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timeout</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${timeoutMinutes} minutes</td>
  </tr>
</table>

<p>This could indicate:</p>
<ul>
  <li>The external service stopped sending webhooks</li>
  <li>Network connectivity issues</li>
  <li>Configuration changes on the sending side</li>
</ul>

<p>Please check your integration to ensure everything is working correctly.</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
<p style="color: #666; font-size: 12px;">
  Escar - Webhook Workbench
</p>`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Monitor] SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`[Monitor] Alert sent to ${to} for hook "${hookName}"`);
    return true;
  } catch (err) {
    console.error("[Monitor] Failed to send email:", err);
    return false;
  }
}

export async function checkMonitors(): Promise<void> {
  const now = new Date();

  const monitoredHooks = listMonitoredHooks();

  for (const hook of monitoredHooks) {
    if (!hook.monitorTimeoutMinutes) continue;

    // Must have at least one notification method configured
    const hasNotificationMethod =
      hook.monitorNotifyEmail ||
      hook.monitorSlackWebhook ||
      hook.monitorDiscordWebhook;
    if (!hasNotificationMethod) continue;

    const timeoutMs = hook.monitorTimeoutMinutes * 60 * 1000;
    const lastEvent = hook.lastEventAt ? new Date(hook.lastEventAt) : null;
    const lastAlert = hook.monitorLastAlertAt
      ? new Date(hook.monitorLastAlertAt)
      : null;

    // Check if we should alert
    let shouldAlert = false;

    if (!lastEvent) {
      // Never received an event - alert if hook is older than timeout
      const hookCreated = new Date(hook.createdAt);
      if (now.getTime() - hookCreated.getTime() > timeoutMs) {
        shouldAlert = true;
      }
    } else {
      // Check if last event is older than timeout
      if (now.getTime() - lastEvent.getTime() > timeoutMs) {
        shouldAlert = true;
      }
    }

    // Don't alert again if we already alerted recently (within timeout period)
    if (shouldAlert && lastAlert) {
      if (now.getTime() - lastAlert.getTime() < timeoutMs) {
        shouldAlert = false;
      }
    }

    if (shouldAlert) {
      const results: boolean[] = [];

      // Send to all configured notification channels
      if (hook.monitorSlackWebhook) {
        results.push(
          await sendSlackNotification(
            hook.monitorSlackWebhook,
            hook.name,
            hook.id,
            hook.monitorTimeoutMinutes
          )
        );
      }

      if (hook.monitorDiscordWebhook) {
        results.push(
          await sendDiscordNotification(
            hook.monitorDiscordWebhook,
            hook.name,
            hook.id,
            hook.monitorTimeoutMinutes
          )
        );
      }

      if (hook.monitorNotifyEmail) {
        results.push(
          await sendAlertEmail(
            hook.monitorNotifyEmail,
            hook.name,
            hook.id,
            hook.monitorTimeoutMinutes
          )
        );
      }

      // Update last alert time if at least one notification succeeded
      if (results.some((r) => r)) {
        updateHook(hook.id, { monitorLastAlertAt: now.toISOString() });
      }
    }
  }
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startMonitorService(): void {
  // Run every minute
  const intervalMs = 60 * 1000;

  console.log("[Monitor] Starting monitor service (checking every 1 minute)");

  // Run immediately on start
  checkMonitors().catch((err) => {
    console.error("[Monitor] Error checking monitors:", err);
  });

  // Then run periodically
  monitorInterval = setInterval(() => {
    checkMonitors().catch((err) => {
      console.error("[Monitor] Error checking monitors:", err);
    });
  }, intervalMs);
}

export function stopMonitorService(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[Monitor] Stopped monitor service");
  }
}
