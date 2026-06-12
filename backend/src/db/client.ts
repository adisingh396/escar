import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { config } from "../config.js";

const dbDir = dirname(config.databasePath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(config.databasePath);
sqlite.exec("PRAGMA foreign_keys = ON");

type SqlBinding = string | number | bigint | boolean | null | Uint8Array;

export interface HookRecord {
  id: string;
  name: string;
  responseStatusCode: number;
  responseHeaders: string;
  responseBody: string;
  forwardUrl: string | null;
  signatureSecret: string | null;
  monitorEnabled: boolean;
  monitorTimeoutMinutes: number | null;
  monitorNotifyEmail: string | null;
  monitorSlackWebhook: string | null;
  monitorDiscordWebhook: string | null;
  monitorLastAlertAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  hookId: string;
  method: string;
  path: string;
  headers: string;
  body: string | null;
  contentType: string | null;
  signatureProvider: string | null;
  signatureValid: boolean | null;
  forwardStatusCode: number | null;
  forwardResponseBody: string | null;
  forwardError: string | null;
  createdAt: string;
}

export interface ReplayRecord {
  id: string;
  eventId: string;
  targetUrl: string;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  createdAt: string;
}

interface RawHookRecord extends Omit<HookRecord, "monitorEnabled"> {
  monitorEnabled: number;
}

interface RawEventRecord extends Omit<EventRecord, "signatureValid"> {
  signatureValid: number | null;
}

interface CountRow {
  count: number;
}

const hookColumns = `
  id,
  name,
  response_status_code as responseStatusCode,
  response_headers as responseHeaders,
  response_body as responseBody,
  forward_url as forwardUrl,
  signature_secret as signatureSecret,
  monitor_enabled as monitorEnabled,
  monitor_timeout_minutes as monitorTimeoutMinutes,
  monitor_notify_email as monitorNotifyEmail,
  monitor_slack_webhook as monitorSlackWebhook,
  monitor_discord_webhook as monitorDiscordWebhook,
  monitor_last_alert_at as monitorLastAlertAt,
  last_event_at as lastEventAt,
  created_at as createdAt
`;

const eventColumns = `
  id,
  hook_id as hookId,
  method,
  path,
  headers,
  body,
  content_type as contentType,
  signature_provider as signatureProvider,
  signature_valid as signatureValid,
  forward_status_code as forwardStatusCode,
  forward_response_body as forwardResponseBody,
  forward_error as forwardError,
  created_at as createdAt
`;

const replayColumns = `
  id,
  event_id as eventId,
  target_url as targetUrl,
  status_code as statusCode,
  response_body as responseBody,
  error,
  created_at as createdAt
`;

function mapHook(row: RawHookRecord): HookRecord {
  return {
    ...row,
    monitorEnabled: Boolean(row.monitorEnabled),
  };
}

function mapEvent(row: RawEventRecord): EventRecord {
  return {
    ...row,
    signatureValid:
      row.signatureValid === null ? null : Boolean(row.signatureValid),
  };
}

function normalizeLike(value: string): string {
  return `%${value.replace(/[%_]/g, "\\$&")}%`;
}

function columnExists(table: string, column: string): boolean {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function addColumnIfNotExists(
  table: string,
  column: string,
  definition: string
) {
  if (!columnExists(table, column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      response_status_code INTEGER NOT NULL DEFAULT 200,
      response_headers TEXT NOT NULL DEFAULT '{}',
      response_body TEXT NOT NULL DEFAULT '',
      forward_url TEXT,
      signature_secret TEXT,
      monitor_enabled INTEGER NOT NULL DEFAULT 0,
      monitor_timeout_minutes INTEGER,
      monitor_notify_email TEXT,
      monitor_slack_webhook TEXT,
      monitor_discord_webhook TEXT,
      monitor_last_alert_at TEXT,
      last_event_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      hook_id TEXT NOT NULL REFERENCES hooks(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      headers TEXT NOT NULL,
      body TEXT,
      content_type TEXT,
      signature_provider TEXT,
      signature_valid INTEGER,
      forward_status_code INTEGER,
      forward_response_body TEXT,
      forward_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replays (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_hook_id ON events(hook_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_method ON events(method);
    CREATE INDEX IF NOT EXISTS idx_replays_event_id ON replays(event_id);
  `);

  addColumnIfNotExists("hooks", "response_status_code", "INTEGER NOT NULL DEFAULT 200");
  addColumnIfNotExists("hooks", "response_headers", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfNotExists("hooks", "response_body", "TEXT NOT NULL DEFAULT ''");
  addColumnIfNotExists("hooks", "forward_url", "TEXT");
  addColumnIfNotExists("hooks", "signature_secret", "TEXT");
  addColumnIfNotExists("hooks", "monitor_enabled", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfNotExists("hooks", "monitor_timeout_minutes", "INTEGER");
  addColumnIfNotExists("hooks", "monitor_notify_email", "TEXT");
  addColumnIfNotExists("hooks", "monitor_slack_webhook", "TEXT");
  addColumnIfNotExists("hooks", "monitor_discord_webhook", "TEXT");
  addColumnIfNotExists("hooks", "monitor_last_alert_at", "TEXT");
  addColumnIfNotExists("hooks", "last_event_at", "TEXT");
  addColumnIfNotExists("events", "signature_provider", "TEXT");
  addColumnIfNotExists("events", "signature_valid", "INTEGER");
  addColumnIfNotExists("events", "forward_status_code", "INTEGER");
  addColumnIfNotExists("events", "forward_response_body", "TEXT");
  addColumnIfNotExists("events", "forward_error", "TEXT");
}

export function createHook(hook: HookRecord): void {
  sqlite
    .prepare(`
      INSERT INTO hooks (
        id, name, response_status_code, response_headers, response_body,
        forward_url, signature_secret, monitor_enabled, monitor_timeout_minutes,
        monitor_notify_email, monitor_slack_webhook, monitor_discord_webhook,
        monitor_last_alert_at, last_event_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      hook.id,
      hook.name,
      hook.responseStatusCode,
      hook.responseHeaders,
      hook.responseBody,
      hook.forwardUrl,
      hook.signatureSecret,
      hook.monitorEnabled ? 1 : 0,
      hook.monitorTimeoutMinutes,
      hook.monitorNotifyEmail,
      hook.monitorSlackWebhook,
      hook.monitorDiscordWebhook,
      hook.monitorLastAlertAt,
      hook.lastEventAt,
      hook.createdAt
    );
}

export function listHooks(): HookRecord[] {
  const rows = sqlite
    .prepare(`SELECT ${hookColumns} FROM hooks ORDER BY created_at DESC`)
    .all() as RawHookRecord[];
  return rows.map(mapHook);
}

export function getHook(id: string): HookRecord | null {
  const row = sqlite
    .prepare(`SELECT ${hookColumns} FROM hooks WHERE id = ?`)
    .get(id) as RawHookRecord | null;
  return row ? mapHook(row) : null;
}

export function updateHook(
  id: string,
  updates: Partial<{
    name: string;
    responseStatusCode: number;
    responseHeaders: string;
    responseBody: string;
    forwardUrl: string | null;
    signatureSecret: string | null;
    monitorEnabled: boolean;
    monitorTimeoutMinutes: number | null;
    monitorNotifyEmail: string | null;
    monitorSlackWebhook: string | null;
    monitorDiscordWebhook: string | null;
    monitorLastAlertAt: string | null;
    lastEventAt: string | null;
  }>
): void {
  const pairs: string[] = [];
  const values: SqlBinding[] = [];
  const columns: Record<keyof typeof updates, string> = {
    name: "name",
    responseStatusCode: "response_status_code",
    responseHeaders: "response_headers",
    responseBody: "response_body",
    forwardUrl: "forward_url",
    signatureSecret: "signature_secret",
    monitorEnabled: "monitor_enabled",
    monitorTimeoutMinutes: "monitor_timeout_minutes",
    monitorNotifyEmail: "monitor_notify_email",
    monitorSlackWebhook: "monitor_slack_webhook",
    monitorDiscordWebhook: "monitor_discord_webhook",
    monitorLastAlertAt: "monitor_last_alert_at",
    lastEventAt: "last_event_at",
  };

  for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
    pairs.push(`${columns[key]} = ?`);
    const value = updates[key];
    values.push((typeof value === "boolean" ? (value ? 1 : 0) : value) ?? null);
  }

  if (pairs.length === 0) return;
  sqlite.prepare(`UPDATE hooks SET ${pairs.join(", ")} WHERE id = ?`).run(
    ...values,
    id
  );
}

export function deleteHook(id: string): void {
  sqlite.prepare("DELETE FROM hooks WHERE id = ?").run(id);
}

export function insertEvent(event: EventRecord): void {
  sqlite
    .prepare(`
      INSERT INTO events (
        id, hook_id, method, path, headers, body, content_type,
        signature_provider, signature_valid, forward_status_code,
        forward_response_body, forward_error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      event.id,
      event.hookId,
      event.method,
      event.path,
      event.headers,
      event.body,
      event.contentType,
      event.signatureProvider,
      event.signatureValid === null ? null : event.signatureValid ? 1 : 0,
      event.forwardStatusCode,
      event.forwardResponseBody,
      event.forwardError,
      event.createdAt
    );
}

function eventFilterSql(
  hookId: string,
  method?: string,
  query?: string
): { where: string; values: SqlBinding[] } {
  const conditions = ["hook_id = ?"];
  const values: SqlBinding[] = [hookId];

  if (method && method !== "ALL") {
    conditions.push("method = ?");
    values.push(method.toUpperCase());
  }

  if (query) {
    const like = normalizeLike(query);
    conditions.push("(path LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' OR headers LIKE ? ESCAPE '\\')");
    values.push(like, like, like);
  }

  return { where: conditions.join(" AND "), values };
}

export function countEventsForHook(
  hookId: string,
  method?: string,
  query?: string
): number {
  const filter = eventFilterSql(hookId, method, query);
  const row = sqlite
    .prepare(`SELECT COUNT(*) as count FROM events WHERE ${filter.where}`)
    .get(...filter.values) as CountRow | null;
  return row?.count ?? 0;
}

export function listEventsForHook(
  hookId: string,
  page: number,
  pageSize: number,
  method?: string,
  query?: string
): EventRecord[] {
  const filter = eventFilterSql(hookId, method, query);
  const offset = (page - 1) * pageSize;
  const rows = sqlite
    .prepare(`
      SELECT ${eventColumns}
      FROM events
      WHERE ${filter.where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...filter.values, pageSize, offset) as RawEventRecord[];
  return rows.map(mapEvent);
}

export function countAllEventsForHook(hookId: string): number {
  const row = sqlite
    .prepare("SELECT COUNT(*) as count FROM events WHERE hook_id = ?")
    .get(hookId) as CountRow | null;
  return row?.count ?? 0;
}

export function listOldestEventIds(hookId: string, limit: number): string[] {
  const rows = sqlite
    .prepare("SELECT id FROM events WHERE hook_id = ? ORDER BY created_at ASC LIMIT ?")
    .all(hookId, limit) as { id: string }[];
  return rows.map((row) => row.id);
}

export function getEvent(id: string): EventRecord | null {
  const row = sqlite
    .prepare(`SELECT ${eventColumns} FROM events WHERE id = ?`)
    .get(id) as RawEventRecord | null;
  return row ? mapEvent(row) : null;
}

export function deleteEvent(id: string): void {
  sqlite.prepare("DELETE FROM events WHERE id = ?").run(id);
}

export function insertReplay(replay: ReplayRecord): void {
  sqlite
    .prepare(`
      INSERT INTO replays (
        id, event_id, target_url, status_code, response_body, error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      replay.id,
      replay.eventId,
      replay.targetUrl,
      replay.statusCode,
      replay.responseBody,
      replay.error,
      replay.createdAt
    );
}

export function listReplaysForEvent(eventId: string): ReplayRecord[] {
  return sqlite
    .prepare(`
      SELECT ${replayColumns}
      FROM replays
      WHERE event_id = ?
      ORDER BY created_at DESC
    `)
    .all(eventId) as ReplayRecord[];
}

export function listMonitoredHooks(): HookRecord[] {
  const rows = sqlite
    .prepare(`
      SELECT ${hookColumns}
      FROM hooks
      WHERE monitor_enabled = 1 AND monitor_timeout_minutes IS NOT NULL
    `)
    .all() as RawHookRecord[];
  return rows.map(mapHook);
}
