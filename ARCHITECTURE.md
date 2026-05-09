# Roadmap Dashboard - Architecture Documentation

## 🎯 Project Overview

A high-performance, read-optimized roadmap dashboard that syncs with Notion and displays project timelines in a custom CSS Grid-based Gantt view. Designed for weekly team meetings with sub-3-second load times and <1GB RAM consumption.

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 15+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + Shadcn UI components
- **Icons**: Lucide React
- **State Management**: Zustand (global View/Edit mode, optimistic updates)
- **Timeline Rendering**: Custom CSS Grid (no rigid libraries)
- **Drag & Drop**: @dnd-kit/core for task manipulation
- **Dependency Lines**: react-xarrows for SVG arrows between tasks
- **Export**: html-to-image for 16:9 PNG generation

### Backend
- **API Routes**: Next.js API routes (App Router)
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **External API**: Notion API (@notionhq/client)

### DevOps
- **Containerization**: Docker (multi-stage build)
- **Orchestration**: K3s with Helm Charts
- **CI/CD**: GitHub Actions
- **Dependency Management**: Dependabot

## 📁 Project Structure

```
roadmap/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── sync/
│   │   │   └── cron/route.ts    # Scheduled sync endpoint
│   │   ├── webhooks/
│   │   │   └── notion/route.ts  # Notion webhook handler
│   │   └── tasks/
│   │       └── [id]/route.ts    # Task update endpoints
│   ├── layout.tsx                # Root layout with theme provider
│   ├── page.tsx                  # Main dashboard page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # Shadcn UI components
│   ├── timeline/                 # Custom timeline components
│   │   ├── Timeline.tsx          # Main timeline container
│   │   ├── TimelineGrid.tsx      # CSS Grid implementation
│   │   ├── ProjectRow.tsx        # Project grouping
│   │   ├── TrackRow.tsx          # Track lanes (Bug, Design, Doc, Dev)
│   │   ├── TaskBlock.tsx         # Individual task blocks
│   │   └── DependencyArrows.tsx  # react-xarrows wrapper
│   ├── filters/                  # Filter components
│   │   ├── ProjectFilter.tsx
│   │   └── TimeRangeFilter.tsx
│   ├── charts/
│   │   └── CapacityChart.tsx     # Capacity pressure visualization
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ThemeToggle.tsx
│   └── export/
│       └── ExportButton.tsx      # PNG export functionality
├── lib/                          # Utility libraries
│   ├── prisma.ts                 # Prisma client singleton
│   ├── notion/                   # Notion API integration
│   │   ├── client.ts             # Notion client setup
│   │   ├── sync.ts               # Sync orchestration
│   │   ├── parsers/              # Parse Notion JSON to Prisma models
│   │   │   ├── members.ts
│   │   │   ├── projects.ts
│   │   │   ├── events.ts
│   │   │   └── tasks.ts
│   │   └── writers.ts            # Write updates back to Notion
│   ├── utils/                    # Helper functions
│   │   ├── dates.ts              # Date manipulation
│   │   ├── capacity.ts           # Capacity calculation
│   │   └── timeline.ts           # Timeline grid calculations
│   └── store/                    # Zustand stores
│       └── viewStore.ts          # View/Edit mode state
├── prisma/
│   └── schema.prisma             # Database schema
├── public/                       # Static assets
├── helm/                         # Kubernetes Helm Chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       └── cronjob.yaml
├── .github/
│   └── workflows/
│       ├── build.yml             # Build and push Docker image
│       └── deploy.yml            # Deploy to K3s
├── Dockerfile                    # Multi-stage optimized build
├── docker-compose.yml            # Local PostgreSQL
├── .env.example                  # Environment variables template
└── ARCHITECTURE.md               # This file
```

## 🗄️ Database Schema

### Core Models

#### Member
- Maps to Notion Members DB (`3015aa43-1513-8063-9a47-e7763c2665aa`)
- Fields: name, phoneNumber, profilePicture, anniversary
- Relations: assignedTasks, events

#### Project
- Maps to Notion Projects DB (`3015aa43-1513-80e1-9c90-e819d3f8a20f`)
- Fields: name, status (Backlog/Paused/In Progress/Done), dates, priority
- Relations: tasks, events

#### Event
- Maps to Notion Events & Milestones DB (`3595aa43-1513-80e3-a0bc-e7bd489a3151`)
- Fields: name, date range, eventType (Manager Period/Vacation/Key Date/Deliverable/Milestone/Anniversary)
- Relations: persons (Members), projects

#### Task
- Maps to Notion Tasks DB (`3015aa43-1513-80d7-b337-f5cff2e673a4`)
- Fields: title, status, track (Bug/Design/Doc/Dev), priority, dates, estimatedTime, storyPoints
- Relations: project, assignedTo (Member), blocks/blockedBy (self-referential dependencies)

#### SyncLog
- Tracks sync operations for monitoring and debugging
- Fields: source (webhook/cron), status, message, recordCount, duration

## 🔄 Data Flow Architecture

### Sync Strategy (Dual-Path)

```
Notion Databases
       ↓
   ┌───┴───┐
   │       │
Webhook  Cron (Safety Net)
   │       │
   └───┬───┘
       ↓
  Sync Service
       ↓
  PostgreSQL
       ↓
  Dashboard UI
```

#### 1. Webhook Path (Real-time)
- Notion sends webhook to `/api/webhooks/notion`
- Validates webhook signature using `WEBHOOK_SECRET`
- Identifies changed database and triggers targeted sync
- Updates PostgreSQL via Prisma
- Returns 200 OK immediately

#### 2. Cron Path (Safety Net)
- K8s CronJob hits `/api/sync/cron` hourly
- Authenticates using `CRON_SECRET` header
- Performs full sync of all 4 databases
- Logs sync results to `SyncLog` table

### Read Path (Dashboard)
```
User Request → Next.js Page → Prisma Query → PostgreSQL → JSON Response → React Render
```
- All reads are from PostgreSQL (never Notion API)
- Ensures sub-3-second load times
- Supports complex filtering and aggregations

### Write Path (Edit Mode)
```
User Edit → Optimistic UI Update (Zustand) → API Route → PostgreSQL Update → Notion API Write
```
1. User drags/resizes task in Edit Mode
2. Zustand immediately updates UI (optimistic)
3. API route updates PostgreSQL
4. Background job writes to Notion
5. If Notion write fails, revert UI and show error

## 🎨 Timeline Rendering Architecture

### Custom CSS Grid Approach

**Why not frappe-gantt or similar?**
- Rigid libraries don't support our 3-level hierarchy (Project → Track → Task)
- Limited customization for overlays (events, milestones)
- Poor performance with 100+ tasks
- Difficult to integrate drag-and-drop

**Our Solution:**
```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (Sticky)  │  Timeline Grid (Scrollable)         │
├───────────────────┼─────────────────────────────────────┤
│ Project A         │  [===Task 1===]  [==Task 2==]       │
│   ├─ Bug Track    │      [Task 3]                       │
│   ├─ Dev Track    │  [======Task 4======]               │
│   └─ Design Track │                  [Task 5]           │
│ Project B         │  [==Task 6==]                       │
│   └─ Doc Track    │                                     │
└───────────────────┴─────────────────────────────────────┘
```

### Grid Implementation
- **Columns**: Dynamic based on time range (days/weeks/months)
- **Rows**: One per Track within each Project
- **Task Blocks**: Positioned using `grid-column-start` and `grid-column-end`
- **Playhead**: Vertical line at "Today" using absolute positioning
- **Events**: Overlay markers positioned by date

### Drag & Drop with @dnd-kit
- **Horizontal Drag**: Changes task start date
- **Border Resize**: Changes task duration
- **Constraints**: Snap to grid columns (days/weeks)
- **Visual Feedback**: Ghost element during drag

### Dependency Lines with react-xarrows
- Draws SVG arrows from blocker task to blocked task
- Auto-updates on scroll/resize
- Color-coded by dependency type

## 📊 Capacity Pressure Calculation

Formula per time period:
```
Pressure = Σ(Estimated Time × Story Points) / Number of Assigned Members
```

Visualization:
- Bar chart showing pressure over time
- Color-coded thresholds (Green < 40h, Yellow 40-60h, Red > 60h)
- Helps identify bottlenecks and overallocation

## 🎭 View/Edit Mode State Management

### Zustand Store Structure
```typescript
interface ViewStore {
  mode: 'view' | 'edit';
  toggleMode: () => void;
  optimisticUpdates: Map<string, Task>;
  updateTask: (id: string, updates: Partial<Task>) => void;
  commitUpdate: (id: string) => Promise<void>;
  revertUpdate: (id: string) => void;
}
```

### Optimistic Update Flow
1. User drags task → `updateTask()` called
2. Task immediately moves in UI (from `optimisticUpdates` map)
3. API call fires in background
4. On success: clear from `optimisticUpdates`
5. On failure: `revertUpdate()` restores original position + show toast

## 🖼️ Export Functionality

### Requirements
- 16:9 aspect ratio (1920×1080 or 3840×2160)
- High DPI for PowerPoint presentations
- Includes all visible timeline content

### Implementation
```typescript
import { toPng } from 'html-to-image';

// 1. Hide UI controls (filters, buttons)
// 2. Expand timeline to show all content
// 3. Capture DOM element
const dataUrl = await toPng(timelineRef.current, {
  width: 3840,
  height: 2160,
  pixelRatio: 2
});
// 4. Trigger download
// 5. Restore UI controls
```

## 🐳 Docker & Deployment

### Multi-Stage Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
# Install dependencies only

# Stage 2: Builder
FROM node:20-alpine AS builder
# Build Next.js app
# Generate Prisma client

# Stage 3: Runner (< 1GB RAM)
FROM node:20-alpine AS runner
# Copy only production files
# Use standalone output
# Set NODE_ENV=production
```

### Memory Optimization Strategies
- Next.js standalone output (removes dev dependencies)
- Prisma binary targets for Alpine Linux
- Minimal base image (node:20-alpine)
- No source maps in production
- Aggressive tree-shaking

### Helm Chart Components
- **Deployment**: 2 replicas, resource limits (512Mi RAM, 500m CPU)
- **Service**: ClusterIP on port 3000
- **Ingress**: HTTPS with cert-manager
- **CronJob**: Hourly sync job with `CRON_SECRET`

## 🔐 Security Considerations

### API Authentication
- Webhook: Validates Notion signature
- Cron: Requires `CRON_SECRET` header
- Task Updates: (Future) Add session-based auth

### Environment Variables
- Never commit `.env` file
- Use Kubernetes Secrets in production
- Rotate `WEBHOOK_SECRET` and `CRON_SECRET` regularly

### Input Validation
- Validate all Notion webhook payloads
- Sanitize user inputs in Edit Mode
- Use Prisma parameterized queries (prevents SQL injection)

## 🚀 Performance Targets

- **Initial Load**: < 3 seconds (cold start)
- **Subsequent Loads**: < 1 second (cached)
- **Sync Duration**: < 10 seconds (full sync of 4 databases)
- **Memory Usage**: < 1GB RAM per container
- **Database Queries**: < 100ms (with proper indexes)

## 🧪 Testing Strategy (Future Phases)

- Unit tests for utility functions (dates, capacity)
- Integration tests for API routes
- E2E tests for timeline interactions (Playwright)
- Load testing for sync endpoints

## 🤖 AI Maintenance Notes

This codebase is designed for AI agent maintenance:

1. **Extensive Inline Comments**: Every complex function has JSDoc
2. **Type Safety**: Full TypeScript coverage
3. **Modular Architecture**: Clear separation of concerns
4. **Consistent Naming**: Follow Next.js and React conventions
5. **This Document**: Provides high-level context for AI agents

### Common Maintenance Tasks

**Adding a new Notion property:**
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Update parser in `lib/notion/parsers/`
4. Update UI component if needed

**Changing timeline granularity:**
1. Modify `lib/utils/timeline.ts` grid calculations
2. Update `TimelineGrid.tsx` column generation
3. Adjust CSS Grid column widths

**Adding a new filter:**
1. Create component in `components/filters/`
2. Add state to Zustand store or URL params
3. Update Prisma query in page component

## 📚 Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| next | Framework | 15+ |
| react | UI Library | 19+ |
| typescript | Type Safety | 5+ |
| prisma | ORM | 6+ |
| @notionhq/client | Notion API | 2+ |
| zustand | State Management | 5+ |
| @dnd-kit/core | Drag & Drop | 6+ |
| react-xarrows | Dependency Lines | 2+ |
| html-to-image | Export | 1+ |
| tailwindcss | Styling | 3+ |
| lucide-react | Icons | Latest |
| date-fns | Date Utils | 4+ |

## 🔄 Future Enhancements

- Real-time collaboration (WebSockets)
- User authentication (NextAuth.js)
- Advanced filtering (saved views)
- Task comments and attachments
- Mobile-responsive timeline
- Undo/redo functionality
- Keyboard shortcuts

---

**Last Updated**: Phase 1 - Architecture & Database Foundation
**Maintained By**: AI Agent + Human Review
