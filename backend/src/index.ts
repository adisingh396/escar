import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { initDatabase } from "./db/client.js";
import { webhookRoutes } from "./routes/webhook.js";
import { hookRoutes } from "./routes/hooks.js";
import { eventRoutes } from "./routes/events.js";
import { replayRoutes } from "./routes/replay.js";
import { startMonitorService } from "./services/monitor.js";

const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Register content type parsers for raw body access
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(null, body);
    }
  }
);

fastify.addContentTypeParser(
  "text/plain",
  { parseAs: "string" },
  (req, body, done) => {
    done(null, body);
  }
);

fastify.addContentTypeParser(
  "application/x-www-form-urlencoded",
  { parseAs: "string" },
  (req, body, done) => {
    done(null, body);
  }
);

fastify.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => {
  done(null, body);
});

// Initialize database
initDatabase();

// Register routes
await fastify.register(webhookRoutes);
await fastify.register(hookRoutes);
await fastify.register(eventRoutes);
await fastify.register(replayRoutes);

// Health check
fastify.get("/health", async () => {
  return { status: "ok" };
});

// App config (for frontend)
fastify.get("/api/config", async () => {
  return {
    demoMode: config.demoMode,
  };
});

// Start server
try {
  await fastify.listen({ port: config.port, host: config.host });
  console.log(`
  Escar
  Webhook Workbench
  Server running at http://${config.host}:${config.port}
  Health check: http://${config.host}:${config.port}/health
  `);

  // Start background monitor service
  startMonitorService();
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

