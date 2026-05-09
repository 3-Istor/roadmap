# Docker Compose Setup Guide

This guide covers running the Roadmap Dashboard locally using Docker Compose.

## Quick Start

### 1. Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Notion API key and database IDs

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update:

```bash
# Notion API Configuration
NOTION_API_KEY=secret_your_actual_key_here
NOTION_MEMBERS_DB_ID=your_members_db_id
NOTION_PROJECTS_DB_ID=your_projects_db_id
NOTION_EVENTS_DB_ID=your_events_db_id
NOTION_TASKS_DB_ID=your_tasks_db_id

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=your_random_secret_here
```

### 3. Start Services

```bash
# Start PostgreSQL and the app
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Initialize Database

The app will automatically run Prisma migrations on startup. If you need to run them manually:

```bash
docker-compose exec app npx prisma migrate deploy
```

### 5. Initial Sync

Trigger the first sync from Notion:

```bash
curl -X POST http://localhost:3000/api/sync/manual \
  -H "Content-Type: application/json"
```

### 6. Access the Dashboard

Open your browser to: http://localhost:3000

## Services

### PostgreSQL

- **Image**: postgres:16-alpine
- **Port**: 5434 (host) → 5432 (container)
- **Credentials**:
  - User: `roadmap`
  - Password: `roadmap`
  - Database: `roadmap`
- **Data**: Persisted in `postgres_data` volume

### Roadmap App

- **Build**: Uses multi-stage Dockerfile
- **Port**: 3000
- **Memory**: ~256-768MB
- **Health Check**: `/api/dashboard` endpoint

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just PostgreSQL
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart just the app
docker-compose restart app
```

### Stop Services

```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

### Rebuild App

After code changes:

```bash
# Rebuild and restart
docker-compose up -d --build app

# Force rebuild without cache
docker-compose build --no-cache app
docker-compose up -d app
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U roadmap -d roadmap

# Backup database
docker-compose exec postgres pg_dump -U roadmap roadmap > backup.sql

# Restore database
docker-compose exec -T postgres psql -U roadmap roadmap < backup.sql

# Reset database
docker-compose down -v
docker-compose up -d
```

### Shell Access

```bash
# App container shell
docker-compose exec app sh

# PostgreSQL shell
docker-compose exec postgres sh
```

## Development Workflow

### 1. Local Development (without Docker)

For faster development, run the app locally:

```bash
# Start only PostgreSQL
docker-compose up -d postgres

# Run app locally
npm run dev
```

### 2. Test Docker Build

```bash
# Build and run
docker-compose up --build

# Check memory usage
docker stats roadmap-app
```

### 3. Production Simulation

```bash
# Use production environment
NODE_ENV=production docker-compose up --build
```

## Troubleshooting

### App Won't Start

Check logs:
```bash
docker-compose logs app
```

Common issues:
- Database not ready: Wait for PostgreSQL health check
- Missing environment variables: Check `.env` file
- Port 3000 in use: Change port in `docker-compose.yml`

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U roadmap
```

### Out of Memory

Check memory usage:
```bash
docker stats roadmap-app
```

If using >768MB, check for:
- Memory leaks in code
- Too many concurrent requests
- Large Notion databases

### Slow Performance

1. Check database queries:
```bash
docker-compose exec postgres psql -U roadmap -d roadmap -c "SELECT * FROM pg_stat_activity;"
```

2. Check app logs for slow API calls

3. Consider adding Redis cache

### Prisma Issues

```bash
# Regenerate Prisma client
docker-compose exec app npx prisma generate

# Reset database
docker-compose exec app npx prisma migrate reset

# View database schema
docker-compose exec app npx prisma studio
```

## Production Deployment

**⚠️ Docker Compose is for development only!**

For production, use:
- Kubernetes/K3s (see `DEPLOYMENT.md`)
- Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Container orchestration for high availability

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NOTION_API_KEY` | Notion integration key | `secret_xxx` |
| `NOTION_MEMBERS_DB_ID` | Notion members database ID | `xxx-xxx-xxx` |
| `NOTION_PROJECTS_DB_ID` | Notion projects database ID | `xxx-xxx-xxx` |
| `NOTION_EVENTS_DB_ID` | Notion events database ID | `xxx-xxx-xxx` |
| `NOTION_TASKS_DB_ID` | Notion tasks database ID | `xxx-xxx-xxx` |
| `CRON_SECRET` | Secret for cron endpoint | Random string |
| `WEBHOOK_SECRET` | Secret for webhooks | Random string |
| `NODE_ENV` | Environment mode | `production` |

## Docker Compose Configuration

### Resource Limits

To add resource limits, update `docker-compose.yml`:

```yaml
services:
  app:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 768M
        reservations:
          cpus: '0.1'
          memory: 256M
```

### Custom Network

The services use a custom bridge network `roadmap-network` for isolation.

### Volumes

- `postgres_data`: PostgreSQL data persistence
- Located in Docker's volume directory

To inspect:
```bash
docker volume inspect roadmap_postgres_data
```

## Health Checks

Both services have health checks:

**PostgreSQL**:
- Command: `pg_isready -U roadmap`
- Interval: 10s
- Timeout: 5s
- Retries: 5

**App**:
- Command: `curl -f http://localhost:3000/api/dashboard`
- Interval: 30s
- Timeout: 5s
- Retries: 3
- Start period: 40s

Check health status:
```bash
docker-compose ps
```

## Automated Sync

To set up automated hourly sync (like in production):

### Option 1: Host Cron

Add to your crontab:
```bash
0 * * * * curl -X POST http://localhost:3000/api/sync/cron -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Docker Cron Container

Add to `docker-compose.yml`:
```yaml
  cron:
    image: curlimages/curl:latest
    container_name: roadmap-cron
    restart: unless-stopped
    command: >
      sh -c "while true; do
        sleep 3600;
        curl -X POST http://app:3000/api/sync/cron
          -H 'Authorization: Bearer ${CRON_SECRET}';
      done"
    depends_on:
      - app
    networks:
      - roadmap-network
```

## Monitoring

### Logs

```bash
# Follow all logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

### Metrics

```bash
# Real-time stats
docker stats roadmap-app roadmap-postgres

# One-time stats
docker stats --no-stream
```

### Database Size

```bash
docker-compose exec postgres psql -U roadmap -d roadmap -c "
  SELECT pg_size_pretty(pg_database_size('roadmap')) as size;
"
```

## Backup and Restore

### Automated Backup Script

Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U roadmap roadmap > \
  $BACKUP_DIR/backup_$TIMESTAMP.sql

echo "Backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql"
```

### Restore from Backup

```bash
docker-compose exec -T postgres psql -U roadmap roadmap < backups/backup_20240101_120000.sql
```

## Security Notes

1. **Change default passwords** in production
2. **Use strong CRON_SECRET** (generate with `openssl rand -hex 32`)
3. **Don't expose PostgreSQL port** in production
4. **Use environment variables** for secrets, never commit `.env`
5. **Keep Docker images updated** (`docker-compose pull`)

## Next Steps

- Set up automated backups
- Configure monitoring (Prometheus/Grafana)
- Add Redis for caching
- Set up log aggregation
- Deploy to production (see `DEPLOYMENT.md`)
