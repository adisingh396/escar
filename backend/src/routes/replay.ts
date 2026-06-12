import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { request as httpRequest } from "undici";
import {
  getEvent,
  insertReplay,
  listReplaysForEvent,
  type ReplayRecord,
} from "../db/client.js";
import { CreateReplayRequestSchema, type Replay } from "@escar/shared";

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function toReplay(record: ReplayRecord): Replay {
  return record;
}

export async function replayRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Params: { eventId: string };
  }>("/api/events/:eventId/replay", async (request, reply) => {
    const { eventId } = request.params;
    const parseResult = CreateReplayRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

    const event = getEvent(eventId);
    if (!event) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    const replayId = ulid();
    const now = new Date().toISOString();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const originalHeaders = JSON.parse(event.headers);
      const filteredHeaders: Record<string, string> = {};

      for (const [key, value] of Object.entries(originalHeaders)) {
        if (!hopByHopHeaders.has(key.toLowerCase())) {
          filteredHeaders[key] = String(value);
        }
      }

      const response = await httpRequest(parseResult.data.targetUrl, {
        method: event.method as
          | "GET"
          | "POST"
          | "PUT"
          | "DELETE"
          | "PATCH"
          | "HEAD"
          | "OPTIONS",
        headers: filteredHeaders,
        body: event.body || undefined,
      });

      statusCode = response.statusCode;
      responseBody = await response.body.text();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const replay: ReplayRecord = {
      id: replayId,
      eventId,
      targetUrl: parseResult.data.targetUrl,
      statusCode,
      responseBody,
      error,
      createdAt: now,
    };

    insertReplay(replay);
    return reply.status(201).send(toReplay(replay));
  });

  fastify.get<{
    Params: { eventId: string };
  }>("/api/events/:eventId/replays", async (request, reply) => {
    const { eventId } = request.params;

    if (!getEvent(eventId)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    return reply.send(listReplaysForEvent(eventId).map(toReplay));
  });
}
