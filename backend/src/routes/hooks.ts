import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import {
  createHook,
  deleteHook,
  getHook,
  listHooks,
  updateHook,
  type HookRecord,
} from "../db/client.js";
import {
  CreateHookRequestSchema,
  UpdateHookRequestSchema,
  type Hook,
} from "@escar/shared";

function toHook(record: HookRecord): Hook {
  return {
    ...record,
    responseHeaders: JSON.parse(record.responseHeaders),
  };
}

export async function hookRoutes(fastify: FastifyInstance) {
  fastify.post("/api/hooks", async (request, reply) => {
    const parseResult = CreateHookRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

    const data = parseResult.data;
    const now = new Date().toISOString();
    const record: HookRecord = {
      id: ulid(),
      name: data.name,
      responseStatusCode: data.responseStatusCode ?? 200,
      responseHeaders: JSON.stringify(data.responseHeaders ?? {}),
      responseBody: data.responseBody ?? "",
      forwardUrl: data.forwardUrl ?? null,
      signatureSecret: data.signatureSecret ?? null,
      monitorEnabled: data.monitorEnabled ?? false,
      monitorTimeoutMinutes: data.monitorTimeoutMinutes ?? null,
      monitorNotifyEmail: data.monitorNotifyEmail ?? null,
      monitorSlackWebhook: data.monitorSlackWebhook ?? null,
      monitorDiscordWebhook: data.monitorDiscordWebhook ?? null,
      monitorLastAlertAt: null,
      lastEventAt: null,
      createdAt: now,
    };

    createHook(record);
    return reply.status(201).send(toHook(record));
  });

  fastify.get("/api/hooks", async (_request, reply) => {
    return reply.send(listHooks().map(toHook));
  });

  fastify.get<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const hook = getHook(request.params.hookId);

    if (!hook) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    return reply.send(toHook(hook));
  });

  fastify.patch<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;
    const parseResult = UpdateHookRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

    if (!getHook(hookId)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    const data = parseResult.data;
    updateHook(hookId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.responseStatusCode !== undefined
        ? { responseStatusCode: data.responseStatusCode }
        : {}),
      ...(data.responseHeaders !== undefined
        ? { responseHeaders: JSON.stringify(data.responseHeaders) }
        : {}),
      ...(data.responseBody !== undefined
        ? { responseBody: data.responseBody }
        : {}),
      ...(data.forwardUrl !== undefined ? { forwardUrl: data.forwardUrl } : {}),
      ...(data.signatureSecret !== undefined
        ? { signatureSecret: data.signatureSecret }
        : {}),
      ...(data.monitorEnabled !== undefined
        ? { monitorEnabled: data.monitorEnabled }
        : {}),
      ...(data.monitorTimeoutMinutes !== undefined
        ? { monitorTimeoutMinutes: data.monitorTimeoutMinutes }
        : {}),
      ...(data.monitorNotifyEmail !== undefined
        ? { monitorNotifyEmail: data.monitorNotifyEmail }
        : {}),
      ...(data.monitorSlackWebhook !== undefined
        ? { monitorSlackWebhook: data.monitorSlackWebhook }
        : {}),
      ...(data.monitorDiscordWebhook !== undefined
        ? { monitorDiscordWebhook: data.monitorDiscordWebhook }
        : {}),
    });

    const updatedHook = getHook(hookId);
    return reply.send(toHook(updatedHook!));
  });

  fastify.delete<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;

    if (!getHook(hookId)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    deleteHook(hookId);
    return reply.status(204).send();
  });
}
