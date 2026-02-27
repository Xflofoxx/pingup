FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY . .

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "src/index.js"]
