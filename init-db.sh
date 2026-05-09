#!/usr/bin/env bash
# Initialize database using Docker (NixOS-compatible)

set -e

echo "🐳 Initializing database using Docker..."

# Check if PostgreSQL is running
if ! docker ps | grep -q roadmap-postgres; then
  echo "Starting PostgreSQL..."
  npm run docker:up
  sleep 3
fi

# Run Prisma commands in a Docker container with Node.js
echo "📦 Running Prisma db push in Docker container..."

docker run --rm \
  --network roadmap_default \
  -v "$(pwd)":/app \
  -w /app \
  -e DATABASE_URL="postgresql://roadmap:roadmap@roadmap-postgres:5432/roadmap?schema=public" \
  node:20-alpine \
  sh -c "npm install --silent && npx prisma db push --accept-data-loss"

echo "✅ Database initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your Notion API key in .env"
echo "2. Run: npm run dev"
echo "3. Test sync: curl http://localhost:3000/api/sync/manual"
