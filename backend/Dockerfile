FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN bun install --frozen-lockfile

COPY shared/ ./shared/
COPY backend/ ./backend/

RUN bun run --cwd shared build
RUN bun run --cwd backend build

FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN bun install --production --frozen-lockfile
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/escar.db
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["bun", "backend/dist/index.js"]
