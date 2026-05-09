# ✅ PHASE 2 SETUP COMPLETE

## 🎉 Database Successfully Initialized!

Your PostgreSQL database is now fully set up with all tables, indexes, and foreign keys.

## 📊 Database Tables Created

```
✅ members            - Team members
✅ projects           - Projects with status
✅ events             - Milestones, vacations, deliverables
✅ tasks              - Tasks with dependencies
✅ sync_logs          - Sync operation tracking
✅ _EventPersons      - Many-to-many: Events ↔ Members
✅ _EventToProject    - Many-to-many: Events ↔ Projects
✅ _TaskDependencies  - Many-to-many: Tasks ↔ Tasks (blocks/blockedBy)
```

## 🔍 Verification

Run this to see all tables:
```bash
docker exec roadmap-postgres psql -U roadmap -d roadmap -c "\dt"
```

## 🚀 Next Steps to Test Sync

### 1. Get Your Notion API Key

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it "Roadmap Dashboard"
4. Copy the "Internal Integration Token"

### 2. Share Databases with Integration

In Notion, for each of your 4 databases:
1. Click "..." menu in top right
2. Click "Add connections"
3. Select your "Roadmap Dashboard" integration

**Databases to share:**
- Members (`3015aa43-1513-8063-9a47-e7763c2665aa`)
- Projects (`3015aa43-1513-80e1-9c90-e819d3f8a20f`)
- Events & Milestones (`3595aa43-1513-80e3-a0bc-e7bd489a3151`)
- Tasks (`3015aa43-1513-80d7-b337-f5cff2e673a4`)

### 3. Update .env File

Edit `roadmap/.env`:
```env
NOTION_API_KEY="secret_YOUR_ACTUAL_KEY_HERE"
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Trigger First Sync

In another terminal:
```bash
curl http://localhost:3000/api/sync/manual
```

You should see output like:
```json
{
  "source": "cron",
  "status": "success",
  "message": "Successfully synced 42 records",
  "recordCount": 42,
  "duration": 8234
}
```

### 6. View Synced Data

```bash
npm run db:studio
```

This opens Prisma Studio in your browser where you can browse all synced data.

## 🧪 Test API Endpoints

### Health Checks
```bash
# Cron endpoint
curl http://localhost:3000/api/sync/cron

# Webhook endpoint
curl http://localhost:3000/api/webhooks/notion
```

### Manual Sync
```bash
curl http://localhost:3000/api/sync/manual
```

### Cron Sync (with auth)
```bash
curl -X POST http://localhost:3000/api/sync/cron \
  -H "x-cron-secret: dev_cron_secret_change_in_production"
```

## 📝 Notion Property Names Checklist

Make sure your Notion databases have these exact property names:

### Members Database
- [ ] Name (Title)
- [ ] Phone Number (Phone)
- [ ] Profile Picture (Files)
- [ ] Anniversary (Date)

### Projects Database
- [ ] Name (Title)
- [ ] Status (Select: Backlog, Paused, In progress, Done)
- [ ] Dates (Date range)
- [ ] Priority (Select: Low, Medium, High)

### Events & Milestones Database
- [ ] Name (Title)
- [ ] Date (Date range)
- [ ] Event Type (Select: Manager Period, Vacation, Key Date, Deliverable, Milestone, Anniversary)
- [ ] Persons (Relation to Members)
- [ ] Projects (Relation to Projects)

### Tasks Database
- [ ] Title (Title)
- [ ] Status (Select: Not Started, In progress, Review, Done)
- [ ] Track (Select: Bug, Design, Doc, Dev)
- [ ] Priority (Select: Low, Medium, High)
- [ ] Date (Date range)
- [ ] Estimated Time (Number)
- [ ] Story Points (Number)
- [ ] Assigned to (Relation to Members)
- [ ] Project (Relation to Projects)
- [ ] Blocks (Relation to Tasks)
- [ ] Blocked By (Relation to Tasks)

## 🐛 Troubleshooting

### "Unauthorized" Error
- Check your `NOTION_API_KEY` is correct
- Verify you shared all 4 databases with the integration

### "Database not found" Error
- Verify database IDs in `.env` match your Notion workspace
- Check you're using the database ID, not the page ID

### No Data Synced
- Check Notion pages have required fields (Name/Title)
- Look at console logs for warnings about skipped records
- Check `sync_logs` table in Prisma Studio

### NixOS Prisma Issues
- Use `./init-db.sh` instead of `npm run db:push`
- Use `npm run db:generate` for Prisma client
- Database operations work fine in Docker

## 📊 Expected Sync Performance

For a team of 6 members:
- **Members**: ~1 second
- **Projects**: ~2 seconds  
- **Events**: ~3 seconds
- **Tasks**: ~5-10 seconds (depends on count)
- **Total**: ~15-20 seconds

## ✅ Phase 2 Checklist

- [x] Database schema created
- [x] All tables initialized
- [x] Indexes created
- [x] Foreign keys configured
- [x] Notion client implemented
- [x] Parsers with defensive programming
- [x] Sync orchestration with transactions
- [x] API endpoints secured
- [x] Write-back service ready
- [ ] Notion API key configured (YOUR TASK)
- [ ] First sync completed (YOUR TASK)
- [ ] Data verified in Prisma Studio (YOUR TASK)

## 🎯 Ready for Phase 3

Once you've completed the sync test above, Phase 2 is fully validated and we can proceed to Phase 3: UI/UX Foundation & Read-Only Dashboard.

---

**Status**: Database initialized ✅ | Awaiting Notion configuration and first sync test
**Next**: Configure Notion API key → Test sync → Approve Phase 2 → Start Phase 3
