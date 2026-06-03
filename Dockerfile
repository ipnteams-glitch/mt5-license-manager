# ── Build Stage ──
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Run Stage ──
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy .env และ service account file
COPY --from=builder /app/.env.local ./.env.local
COPY --from=builder /app/sunny-lightning-*.json ./

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
