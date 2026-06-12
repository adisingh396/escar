import { z } from "zod";

// Custom response configuration schema
export const CustomResponseSchema = z.object({
  statusCode: z.number().min(100).max(599).default(200),
  headers: z.record(z.string()).default({}),
  body: z.string().default(""),
});

export type CustomResponse = z.infer<typeof CustomResponseSchema>;

// Hook schema
export const HookSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Custom response configuration
  responseStatusCode: z.number(),
  responseHeaders: z.record(z.string()),
  responseBody: z.string(),
  // Forwarding configuration
  forwardUrl: z.string().nullable(),
  // Signature validation
  signatureSecret: z.string().nullable(),
  // Monitor configuration
  monitorEnabled: z.boolean(),
  monitorTimeoutMinutes: z.number().nullable(),
  monitorNotifyEmail: z.string().nullable(),
  monitorSlackWebhook: z.string().nullable(),
  monitorDiscordWebhook: z.string().nullable(),
  monitorLastAlertAt: z.string().nullable(),
  lastEventAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Hook = z.infer<typeof HookSchema>;

// Signature validation providers
export const SignatureProviderSchema = z.enum([
  "stripe",
  "github",
  "shopify",
  "slack",
  "twilio",
  "unknown",
]);

export type SignatureProvider = z.infer<typeof SignatureProviderSchema>;

// Event schema
export const EventSchema = z.object({
  id: z.string(),
  hookId: z.string(),
  method: z.string(),
  path: z.string(),
  headers: z.record(z.string()),
  body: z.string().nullable(),
  contentType: z.string().nullable(),
  // Signature validation
  signatureProvider: SignatureProviderSchema.nullable(),
  signatureValid: z.boolean().nullable(),
  // Forward response data
  forwardStatusCode: z.number().nullable(),
  forwardResponseBody: z.string().nullable(),
  forwardError: z.string().nullable(),
  createdAt: z.string(),
});

export type Event = z.infer<typeof EventSchema>;

// Replay schema
export const ReplaySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  targetUrl: z.string(),
  statusCode: z.number().nullable(),
  responseBody: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

export type Replay = z.infer<typeof ReplaySchema>;

// API Request/Response schemas
export const CreateHookRequestSchema = z.object({
  name: z.string().min(1).max(100),
  responseStatusCode: z.number().min(100).max(599).optional().default(200),
  responseHeaders: z.record(z.string()).optional().default({}),
  responseBody: z.string().optional().default(""),
  forwardUrl: z.string().url().nullable().optional().default(null),
  // Signature validation
  signatureSecret: z.string().nullable().optional().default(null),
  // Monitor configuration
  monitorEnabled: z.boolean().optional().default(false),
  monitorTimeoutMinutes: z.number().min(1).max(1440).nullable().optional().default(null),
  monitorNotifyEmail: z.string().email().nullable().optional().default(null),
  monitorSlackWebhook: z.string().url().nullable().optional().default(null),
  monitorDiscordWebhook: z.string().url().nullable().optional().default(null),
});

// Use z.input for the request type (allows optional fields)
export type CreateHookRequest = z.input<typeof CreateHookRequestSchema>;

export const UpdateHookRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  responseStatusCode: z.number().min(100).max(599).optional(),
  responseHeaders: z.record(z.string()).optional(),
  responseBody: z.string().optional(),
  forwardUrl: z.string().url().nullable().optional(),
  // Signature validation
  signatureSecret: z.string().nullable().optional(),
  // Monitor configuration
  monitorEnabled: z.boolean().optional(),
  monitorTimeoutMinutes: z.number().min(1).max(1440).nullable().optional(),
  monitorNotifyEmail: z.string().email().nullable().optional(),
  monitorSlackWebhook: z.string().url().nullable().optional(),
  monitorDiscordWebhook: z.string().url().nullable().optional(),
});

export type UpdateHookRequest = z.infer<typeof UpdateHookRequestSchema>;

export const CreateHookResponseSchema = HookSchema;

export type CreateHookResponse = z.infer<typeof CreateHookResponseSchema>;

export const ListHooksResponseSchema = z.array(HookSchema);

export type ListHooksResponse = z.infer<typeof ListHooksResponseSchema>;

export const ListEventsResponseSchema = z.object({
  events: z.array(EventSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListEventsResponse = z.infer<typeof ListEventsResponseSchema>;

export const GetEventResponseSchema = EventSchema;

export type GetEventResponse = z.infer<typeof GetEventResponseSchema>;

export const CreateReplayRequestSchema = z.object({
  targetUrl: z.string().url(),
});

export type CreateReplayRequest = z.infer<typeof CreateReplayRequestSchema>;

export const CreateReplayResponseSchema = ReplaySchema;

export type CreateReplayResponse = z.infer<typeof CreateReplayResponseSchema>;

export const ListReplaysResponseSchema = z.array(ReplaySchema);

export type ListReplaysResponse = z.infer<typeof ListReplaysResponseSchema>;

// API Error schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
