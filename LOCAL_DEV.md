# Local Development Setup

This guide is for running the app locally with `npm run dev` while using Docker only for PostgreSQL.

## Why This Approach?

- **Faster development**: Hot reload with Next.js dev server
- **Better debugging**: Direct access to Node.js debugger
- **Lighter resource usage**: Only PostgreSQL runs in Docker

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

## Setup Steps

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

This starts only the PostgreSQL container on port 5434.

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your Notion credentials:
```env
DATABASE_URL="postgresql://roadmap:roadmap@localhost:5434/roadmap?schema=public"
NOTION_API_KEY="ntn_your_key_here"
NOTION_MEMBERS_DB_ID="your-members-db-id"
NOTION_PROJECTS_DB_ID="your-projects-db-id"
NOTION_EVENTS_DB_ID="your-events-db-id"
NOTION_TASKS_DB_ID="your-tasks-db-id"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Initialize Database

```bash
npm run db:init
```

This script:
- Checks if PostgreSQL is running
- Uses a temporary Docker container to run Prisma migrations
- Creates all necessary tables

**Why not use Prisma directly?** Prisma 7 has compatibility issues with local CLI commands. Using the Docker container ensures consistent behavior.

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

### 6. Sync Data from Notion

```bash
curl -X POST http://localhost:3000/api/sync/manual
```

Or click the "Refresh" button in the UI.

## Development Workflow

### Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npm run db:init` to apply changes
3. Restart dev server if needed

### Viewing Database

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U roadmap -d roadmap

# List tables
\dt

# Query data
SELECT * FROM tasks LIMIT 5;
```

### Debugging

The Next.js dev server provides:
- Hot reload on file changes
- Detailed error messages
- React DevTools support
- API route debugging

### Resetting Database

```bash
# Stop and remove postgres container
docker compose down postgres

# Remove volume
docker volume rm roadmap_postgres_data

# Start fresh
docker compose up -d postgres
npm run db:init
```

## Common Issues

### Port 5434 already in use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "5435:5432"  # Use different port
```

Then update `.env`:
```env
DATABASE_URL="postgresql://roadmap:roadmap@localhost:5435/roadmap?schema=public"
```

### "Cannot connect to database"

Check if PostgreSQL is running:
```bash
docker compose ps postgres
```

Should show "Up" status. If not:
```bash
docker compose up -d postgres
```

### "Table does not exist"

Run the initialization script:
```bash
npm run db:init
```

### Prisma errors

If you see Prisma-related errors, use the Docker-based initialization:
```bash
npm run db:init
```

This bypasses local Prisma CLI issues by using the working Docker setup.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:init` | Initialize/update database schema |
| `docker compose up -d postgres` | Start PostgreSQL only |
| `docker compose down` | Stop all containers |
| `docker compose logs postgres` | View PostgreSQL logs |

## Production Build Testing

Test the production build locally:

```bash
# Build
npm run build

# Start production server
npm start
```

## Switching to Full Docker

To switch back to full Docker Compose:

```bash
# Stop dev server (Ctrl+C)

# Start full stack
docker compose up -d

# View logs
docker compose logs -f app
```

## Tips

1. **Use environment variables**: Never commit `.env` file
2. **Keep postgres running**: No need to stop it between dev sessions
3. **Check logs**: `docker compose logs postgres` for database issues
4. **Use Prisma Studio**: Visual database browser (coming soon)
5. **Hot reload**: Changes to code auto-reload, no restart needed

## Next Steps

- See `QUICK_START.md` for Docker Compose setup
- See `DEPLOYMENT.md` for production deployment
- See `ARCHITECTURE.md` for system design

---

Happy coding! 🚀
