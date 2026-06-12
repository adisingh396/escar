FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY bun.lock ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build shared and frontend
RUN bun run --cwd shared build
RUN bun run --cwd frontend build

# Production stage with nginx
FROM nginx:alpine

# Copy built frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
