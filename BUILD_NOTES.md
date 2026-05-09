# Build Notes

## Build Scripts

The project has two build scripts to support different environments:

### Standard Build (Docker, CI/CD, Production)

```bash
npm run build
```

This runs: `next build`

Use this for:
- Docker builds
- CI/CD pipelines
- Production deployments
- Any environment without Nix

### Nix Build (Local Development with Nix)

```bash
npm run build:nix
```

This runs: `nix-shell --run 'npx prisma generate' && next build`

Use this for:
- Local development with Nix shell
- Environments where Prisma needs Nix dependencies

## Why Two Scripts?

The Dockerfile and CI/CD environments don't have `nix-shell` available, so we need a standard build script that works everywhere. The Nix-specific script is kept for local development environments that use Nix.

## Prisma Generation

In Docker builds, Prisma client generation happens in the builder stage:

```dockerfile
# Generate Prisma Client
RUN npx prisma generate
```

This ensures the Prisma client is available before the Next.js build runs.

## Docker Build Process

The multi-stage Dockerfile handles Prisma automatically:

1. **Deps stage**: Install production dependencies
2. **Builder stage**: 
   - Copy dependencies
   - Generate Prisma client
   - Build Next.js app
3. **Runner stage**: Copy built artifacts and run

No manual Prisma generation needed!

## Local Development

For local development without Docker:

```bash
# First time setup
npm install
npx prisma generate
npm run dev

# Or with Nix
npm install
npm run build:nix
npm run dev
```

## Troubleshooting

### "nix-shell: not found" in Docker

You're using the wrong build script. Use `npm run build` instead of `npm run build:nix`.

### Prisma Client not generated

Run manually:
```bash
npx prisma generate
```

Or in Docker:
```bash
docker-compose exec app npx prisma generate
```

### Build fails with "Cannot find module '@prisma/client'"

Prisma client wasn't generated. Check that the builder stage in Dockerfile includes:
```dockerfile
RUN npx prisma generate
```
