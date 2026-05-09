set -e

echo "🔧 Initializing database schema..."

# Check if postgres container is running
if ! docker compose ps postgres | grep -q "Up"; then
  echo "❌ PostgreSQL container is not running"
  echo "   Run: docker compose up -d postgres"
  exit 1
fi

# Use the app container to run migrations (it has working Prisma setup)
echo "📦 Starting temporary container to run migrations..."
docker compose run --rm \
  -e DATABASE_URL="postgresql://roadmap:roadmap@postgres:5432/roadmap" \
  app \
  sh -c "npx prisma db push --accept-data-loss"

echo "✅ Database schema initialized!"
echo ""
echo "You can now run: npm run dev"
