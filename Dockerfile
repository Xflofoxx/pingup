FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

COPY server/package.json server/bun.lockb* ./
RUN bun install --frozen-lockfile --production

COPY agent/package.json agent/bun.lockb* ./
WORKDIR /app/agent
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.1-alpine

WORKDIR /app

COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/agent/node_modules ./agent/node_modules
COPY . .

WORKDIR /app/server

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
