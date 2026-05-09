# Quick Start Guide

Get the Roadmap Dashboard running in 5 minutes!

## Option 1: Docker Compose (Recommended for Local)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your Notion credentials
nano .env  # or use your favorite editor

# 3. Start everything
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Open browser
open http://localhost:3000
```

**That's it!** PostgreSQL and the app are running.

## Option 2: Local Development

```bash
# 1. Start PostgreSQL only
docker compose up -d postgres

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your credentials
nano .env

# 4. Install dependencies
npm install

# 5. Initialize database schema
npm run db:init

# 6. Start development server
npm run dev

# 7. Open browser
open http://localhost:3000
```

**Note**: Due to Prisma 7 compatibility issues, we use a Docker container to initialize the database schema. The `npm run db:init` script handles this automatically.

## Initial Setup

### Get Notion Credentials

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Copy the "Internal Integration Token"
4. Share your databases with the integration

### Find Database IDs

In Notion, open your database and copy the ID from the URL:
```
https://notion.so/workspace/DATABASE_ID?v=...
                          ^^^^^^^^^^^^
```

### Configure .env

```bash
NOTION_API_KEY=secret_your_key_here
NOTION_TASKS_DB_ID=your_tasks_db_id
NOTION_PROJECTS_DB_ID=your_projects_db_id
NOTION_MEMBERS_DB_ID=your_members_db_id
NOTION_EVENTS_DB_ID=your_events_db_id
```

## First Sync

Trigger initial sync from Notion:

```bash
curl -X POST http://localhost:3000/api/sync/manual
```

Or use the UI: Click "Refresh" button in the dashboard.

## Common Commands

### Docker Compose

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Database shell
docker-compose exec postgres psql -U roadmap -d roadmap
```

### Local Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Regenerate Prisma client
```

## Troubleshooting

### "Connection refused" error

PostgreSQL isn't ready yet. Wait 10 seconds and try again.

### "Invalid API key" error

Check your `NOTION_API_KEY` in `.env` file.

### "Database not found" or "Table does not exist" error

Initialize the database schema:
```bash
# If using Docker Compose (full stack)
docker compose restart app

# If using local dev (postgres only)
npm run db:init
```

### Port 3000 already in use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### App is slow

Check if initial sync is running:
```bash
docker-compose logs -f app | grep sync
```

## Next Steps

- **View Mode**: Browse your roadmap timeline
- **Edit Mode**: Click "Edit" to drag & drop tasks
- **Filters**: Use project and time range filters
- **Dark Mode**: Toggle with the moon/sun icon
- **Undo/Redo**: Use Ctrl+Z / Ctrl+Y in Edit mode

## Production Deployment

For production deployment to K3s:
- See `DEPLOYMENT.md` for Kubernetes setup
- See `PHASE5_COMPLETE.md` for complete DevOps guide

## Need Help?

- Check `DOCKER_COMPOSE.md` for detailed Docker guide
- Check `SETUP.md` for Notion database setup
- Check `ARCHITECTURE.md` for system overview
- Check logs: `docker-compose logs -f`

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f app` | View app logs |
| `docker-compose restart app` | Restart app |
| `npm run dev` | Local development |
| `npm run build` | Build for production |
| `npm run db:init` | Initialize database schema |

---

**Ready to go!** 🚀 Open http://localhost:3000 and start planning your roadmap!
