#!/bin/sh
set -e

echo "🚀 Starting Roadmap Dashboard..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db push --accept-data-loss 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "⏳ PostgreSQL is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ PostgreSQL is ready and schema is synced!"

# Start the application
echo "🎯 Starting Next.js server..."
exec node server.js
