import { FastifyInstance } from "fastify";
import {
  deleteEvent,
  getEvent,
  getHook,
  listEventsForHook,
  countEventsForHook,
  type EventRecord,
} from "../db/client.js";
import type {
  Event,
  ListEventsResponse,
  SignatureProvider,
} from "@escar/shared";

function toEvent(record: EventRecord): Event {
  return {
    ...record,
    headers: JSON.parse(record.headers),
    signatureProvider: record.signatureProvider as SignatureProvider | null,
  };
}

export async function eventRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { hookId: string };
    Querystring: { page?: string; pageSize?: string; q?: string; method?: string };
  }>("/api/hooks/:hookId/events", async (request, reply) => {
    const { hookId } = request.params;
    const page = Math.max(parseInt(request.query.page || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(request.query.pageSize || "20", 10), 1),
      100
    );
    const query = request.query.q?.trim() || undefined;
    const method = request.query.method?.trim().toUpperCase() || undefined;

    if (!getHook(hookId)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    const total = countEventsForHook(hookId, method, query);
    const events = listEventsForHook(hookId, page, pageSize, method, query);
    const result: ListEventsResponse = {
      events: events.map(toEvent),
      total,
      page,
      pageSize,
    };

    return reply.send(result);
  });

  fastify.get<{
    Params: { eventId: string };
  }>("/api/events/:eventId", async (request, reply) => {
    const event = getEvent(request.params.eventId);

    if (!event) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    return reply.send(toEvent(event));
  });

  fastify.delete<{
    Params: { eventId: string };
  }>("/api/events/:eventId", async (request, reply) => {
    const { eventId } = request.params;

    if (!getEvent(eventId)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    deleteEvent(eventId);
    return reply.status(204).send();
  });
}
