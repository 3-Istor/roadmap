# Roadmap Dashboard

A high-performance, read-optimized roadmap dashboard that syncs with Notion and displays project timelines in a custom CSS Grid-based Gantt view.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)

### Local Development Setup

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Start PostgreSQL:**
```bash
docker-compose up -d
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Notion API credentials
```

4. **Initialize database:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Run development server:**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## 🏗️ Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components (timeline, filters, charts)
- `/lib` - Utilities, Notion integration, Zustand stores
- `/prisma` - Database schema and migrations
- `/helm` - Kubernetes deployment manifests

## 🔄 Sync Architecture

The app uses a dual-sync strategy:
1. **Webhooks** - Real-time updates from Notion
2. **Cron Jobs** - Hourly safety net sync

All dashboard reads come from PostgreSQL for sub-3-second load times.

## 🎨 Key Features

- Custom CSS Grid timeline (no rigid libraries)
- Drag-and-drop task editing with @dnd-kit
- Dependency visualization with react-xarrows
- Capacity pressure charts
- 16:9 PNG export for presentations
- Light/Dark theme toggle

## 📊 Tech Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS + Shadcn UI
- Zustand for state management
- Docker + K3s + Helm

## 🐳 Deployment

See `/helm` directory for Kubernetes deployment configuration.

Memory target: < 1GB RAM per container

## 📝 License

MIT
