import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { request as httpRequest } from "undici";
import {
  countAllEventsForHook,
  deleteEvent,
  getHook,
  insertEvent,
  listOldestEventIds,
  updateHook,
} from "../db/client.js";
import { config } from "../config.js";
import { validateSignature } from "../services/signature.js";

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

function toHeaderMap(headers: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      result[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
  }
  return result;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.all<{
    Params: { hookId: string };
  }>("/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;
    const hook = getHook(hookId);

    if (!hook) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    let body: string | null = null;
    if (request.body !== undefined && request.body !== null) {
      if (typeof request.body === "string") {
        body = request.body;
      } else if (Buffer.isBuffer(request.body)) {
        body = request.body.toString("utf-8");
      } else {
        body = JSON.stringify(request.body);
      }
    }

    let signatureProvider: string | null = null;
    let signatureValid: boolean | null = null;
    const headersObj = toHeaderMap(request.headers);

    if (hook.signatureSecret && body) {
      const result = validateSignature(
        headersObj,
        body,
        hook.signatureSecret,
        request.url
      );

      if (result) {
        signatureProvider = result.provider;
        signatureValid = result.valid;
      }
    }

    let forwardStatusCode: number | null = null;
    let forwardResponseBody: string | null = null;
    let forwardError: string | null = null;

    if (hook.forwardUrl) {
      try {
        const filteredHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headersObj)) {
          if (!hopByHopHeaders.has(key.toLowerCase())) {
            filteredHeaders[key] = value;
          }
        }

        const response = await httpRequest(hook.forwardUrl, {
          method: request.method as
            | "GET"
            | "POST"
            | "PUT"
            | "DELETE"
            | "PATCH"
            | "HEAD"
            | "OPTIONS",
          headers: filteredHeaders,
          body: body || undefined,
        });

        forwardStatusCode = response.statusCode;
        forwardResponseBody = await response.body.text();
      } catch (err) {
        forwardError = err instanceof Error ? err.message : String(err);
      }
    }

    const eventId = ulid();
    const now = new Date().toISOString();
    insertEvent({
      id: eventId,
      hookId,
      method: request.method,
      path: request.url,
      headers: JSON.stringify(request.headers),
      body,
      contentType: (request.headers["content-type"] as string) || null,
      signatureProvider,
      signatureValid,
      forwardStatusCode,
      forwardResponseBody,
      forwardError,
      createdAt: now,
    });

    updateHook(hookId, { lastEventAt: now });

    const eventCount = countAllEventsForHook(hookId);
    if (eventCount > config.maxEventsPerHook) {
      const excess = eventCount - config.maxEventsPerHook;
      for (const oldEventId of listOldestEventIds(hookId, excess)) {
        deleteEvent(oldEventId);
      }
    }

    const responseHeaders = JSON.parse(hook.responseHeaders);
    for (const [key, value] of Object.entries(responseHeaders)) {
      reply.header(key, value as string);
    }

    if (hook.responseBody) {
      return reply.status(hook.responseStatusCode).send(hook.responseBody);
    }

    return reply.status(hook.responseStatusCode).send({
      success: true,
      eventId,
    });
  });
}
