# Multi-stage Dockerfile optimized for <1GB RAM deployment
# Uses Next.js standalone output for minimal memory footprint

# Stage 1: Dependencies
FROM node:26-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy Prisma schema and generate client in deps stage
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Set Prisma engine type for cross-platform builds
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x,linux-arm64-openssl-3.0.x,debian-openssl-3.0.x"
ENV CHECKPOINT_DISABLE=1

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:26-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependencies and generated Prisma client from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts
COPY . .

# Build Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (Production)
FROM node:26-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install only production dependencies for runtime
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm install -g prisma@latest && \
    npm cache clean --force

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/dashboard || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
