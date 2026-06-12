# Contributing to Escar

Escar is a TypeScript webhook workbench. Keep changes focused, small, and easy to verify.

## Setup

```bash
bun install
bun run --cwd shared build
bun run dev:backend
bun run dev:frontend
```

Open `http://localhost:5173`.

## Structure

```text
escar/
  shared/       Zod schemas and TypeScript types
  backend/      Fastify API, Drizzle ORM, SQLite
  frontend/     React and Vite UI
  landing/      Static project page
```

## Guidelines

- Use TypeScript for new code.
- Match existing patterns before adding new abstractions.
- Keep UI changes dense, clear, and useful for repeated debugging.
- Add or update tests when changing shared behavior or backend contracts.
- Run `bun run build` before opening a pull request.

## Commit Format

```text
type: short description
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
