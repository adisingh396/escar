export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  databasePath: process.env.DATABASE_PATH || "../data/escar.db",
  maxEventsPerHook: parseInt(process.env.MAX_EVENTS_PER_HOOK || "100", 10),
  // Demo mode (for public demo sites)
  demoMode: process.env.DEMO_MODE === "true",
  // Email notification settings (SendGrid)
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "alerts@escar.local",
};
