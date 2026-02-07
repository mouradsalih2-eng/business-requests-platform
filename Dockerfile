# ── Stage 1: Build client ─────────────────────────────────────
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Install server production deps ───────────────────
FROM node:18-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 3: Final slim image ─────────────────────────────────
FROM node:18-alpine
WORKDIR /app

# Copy server source + production node_modules
COPY server/src/ ./server/src/
COPY server/package.json ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built client (static files only)
COPY --from=client-build /app/client/dist ./client/dist

# Root package.json for the start script
COPY package.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/src/index.js"]
