# Escar

Personal webhook workbench for receiving, inspecting, copying, forwarding, and replaying webhook traffic.

Escar is useful when you are building integrations and need a local, self-hosted place to send webhook requests. Create a hook, copy its URL, send traffic to it, inspect every request, and replay captured payloads against another endpoint.

## Features

- Create unique webhook URLs
- Capture any HTTP method sent to `/hooks/:hookId`
- Inspect method, path, headers, body, content type, and timestamps
- Search captured events by path, headers, or body
- Filter captured events by HTTP method
- View local payload insights such as body size, JSON key count, and sensitive-header count
- Copy captured events as ready-to-run cURL commands
- Replay captured events to any target URL
- Forward incoming webhooks to another endpoint
- Configure custom webhook response status, headers, and body
- Validate common webhook signatures: Stripe, GitHub, Shopify, Slack, Twilio
- Monitor hooks and alert via Slack, Discord, or SendGrid email when traffic stops
- Store data in SQLite with no external database requirement

## Stack

- Backend: Fastify, Bun SQLite, undici
- Backend runtime: Bun with TypeScript source in development
- Frontend: React 18, Vite, TypeScript
- Shared: Zod schemas and TypeScript types
- Deployment: Docker Compose with Nginx frontend proxy

## Project Structure

```text
escar/
  shared/       Zod schemas and shared TypeScript types
  backend/      Fastify API, SQLite storage, replay/forwarding/monitor logic
  frontend/     React debugger UI
  landing/      Static landing page
  compose.yaml  Docker Compose deployment
```

## Local Development

```bash
bun install
bun run --cwd shared build
bun run dev:backend
bun run dev:frontend
```

Open `http://localhost:5173`.

## Docker

```bash
docker compose up -d
```

Open `http://localhost:8080`.

## Environment

```env
DATABASE_PATH=../data/escar.db
MAX_EVENTS_PER_HOOK=100
SENDGRID_API_KEY=
EMAIL_FROM=alerts@escar.local
DEMO_MODE=false
```

## API

- `GET /health`
- `GET /api/config`
- `POST /api/hooks`
- `GET /api/hooks`
- `GET /api/hooks/:hookId`
- `PATCH /api/hooks/:hookId`
- `DELETE /api/hooks/:hookId`
- `GET /api/hooks/:hookId/events`
- `GET /api/events/:eventId`
- `DELETE /api/events/:eventId`
- `POST /api/events/:eventId/replay`
- `GET /api/events/:eventId/replays`
- `* /hooks/:hookId`

## Example

```bash
curl -X POST http://localhost:8080/hooks/YOUR_HOOK_ID \
  -H "Content-Type: application/json" \
  --data '{"event":"user.created","id":123}'
```

## Advanced Demo

Run backend and frontend first:

```bash
bun run dev:backend
bun run dev:frontend
```

Open `http://localhost:5173`, then run this in PowerShell. It creates two hooks, sends a webhook, replays it into the second hook, enables a custom response, and sends a GitHub-style signed event.

```powershell
$api = "http://localhost:3000"

$source = Invoke-RestMethod `
  -Method Post `
  -Uri "$api/api/hooks" `
  -ContentType "application/json" `
  -Body '{"name":"Demo source"}'

$target = Invoke-RestMethod `
  -Method Post `
  -Uri "$api/api/hooks" `
  -ContentType "application/json" `
  -Body '{"name":"Replay target"}'

$payload = '{"event":"checkout.completed","orderId":"ord_123","total":4200}'
$received = Invoke-RestMethod `
  -Method Post `
  -Uri "$api/hooks/$($source.id)?provider=demo" `
  -ContentType "application/json" `
  -Headers @{ "X-Demo-Trace" = "esc-demo-001" } `
  -Body $payload

Invoke-RestMethod `
  -Method Post `
  -Uri "$api/api/events/$($received.eventId)/replay" `
  -ContentType "application/json" `
  -Body (@{ targetUrl = "$api/hooks/$($target.id)" } | ConvertTo-Json)

Invoke-RestMethod `
  -Method Patch `
  -Uri "$api/api/hooks/$($source.id)" `
  -ContentType "application/json" `
  -Body (@{
    responseStatusCode = 202
    responseHeaders = @{ "X-Escar-Demo" = "custom-response" }
    responseBody = '{"accepted":true}'
    signatureSecret = "demo-secret"
  } | ConvertTo-Json -Depth 4)

$body = '{"event":"repo.push","repository":"escar","ok":true}'
$hmac = [System.Security.Cryptography.HMACSHA256]::new(
  [Text.Encoding]::UTF8.GetBytes("demo-secret")
)
$sig = ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body)) |
  ForEach-Object { $_.ToString("x2") }) -join ""

Invoke-WebRequest `
  -Method Post `
  -Uri "$api/hooks/$($source.id)" `
  -ContentType "application/json" `
  -Headers @{ "X-Hub-Signature-256" = "sha256=$sig" } `
  -Body $body
```

In the UI, show:

- source hook receives original and signed events
- target hook receives replayed event
- signed event shows valid GitHub signature
- source hook returns custom `202` response with `X-Escar-Demo`
- event detail can copy the request as cURL

## Feature Inspiration

Small GitHub projects with similar webhook workflows informed the current feature set:

- [Swift-Tech-Co/webhook-debugger](https://github.com/Swift-Tech-Co/webhook-debugger) - inspect, replay, and signature validation
- [bellum19/webcatch](https://github.com/bellum19/webcatch) - self-hosted inspection with payload analysis ideas
- [farico/webhookstash-cli](https://github.com/farico/webhookstash-cli) - terminal-style capture, inspect, replay, and cURL workflows
- [dev3mike/webhook.nu](https://github.com/dev3mike/webhook.nu) - proxy/redirect workflow for local integration testing

## License

MIT. See `LICENSE`.
