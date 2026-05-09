# Sync System Quick Reference Guide

## 🚀 Quick Start

### 1. Configure Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your 4 databases with the integration

### 2. Update Environment Variables

Edit `.env`:
```env
NOTION_API_KEY="secret_YOUR_ACTUAL_KEY_HERE"
```

### 3. Initialize Database

```bash
# Start PostgreSQL
npm run docker:up

# Push schema to database
npm run db:push
```

### 4. Run First Sync

```bash
# Start dev server
npm run dev

# In another terminal, trigger sync
curl http://localhost:3000/api/sync/manual
```

### 5. Verify Data

```bash
# Open Prisma Studio
npm run db:studio

# Check tables: members, projects, events, tasks, sync_logs
```

## 📡 API Endpoints

### Manual Sync (Development Only)
```bash
GET http://localhost:3000/api/sync/manual
```
- Triggers full sync of all databases
- Only works in development mode
- Returns sync result JSON

### Cron Sync (Production)
```bash
POST http://localhost:3000/api/sync/cron
Headers:
  x-cron-secret: YOUR_CRON_SECRET
```
- Secured with CRON_SECRET
- Triggered by Kubernetes CronJob
- Full sync of all databases

### Webhook (Real-time)
```bash
POST http://localhost:3000/api/webhooks/notion
Headers:
  x-notion-signature: HMAC_SIGNATURE
Body: Notion webhook payload
```
- Secured with WEBHOOK_SECRET signature
- Triggered by Notion when data changes
- Smart sync (only affected database)

### Health Checks
```bash
GET http://localhost:3000/api/sync/cron
GET http://localhost:3000/api/webhooks/notion
```

## 🔍 Monitoring Syncs

### View Sync Logs
```bash
npm run db:studio
# Navigate to sync_logs table
```

### Sync Log Fields
- `source`: "webhook" or "cron"
- `status`: "success" or "error"
- `message`: Human-readable result
- `recordCount`: Number of records synced
- `duration`: Time taken in milliseconds
- `createdAt`: Timestamp

### Check Last Sync
```sql
SELECT * FROM sync_logs ORDER BY "createdAt" DESC LIMIT 1;
```

## 🛠️ Troubleshooting

### Sync Fails with "Unauthorized"
- Check `NOTION_API_KEY` is correct
- Verify databases are shared with integration
- Check database IDs match your Notion workspace

### Missing Records
- Check Notion pages have required fields (Name/Title)
- Look for warnings in console logs
- Check `sync_logs` table for errors

### Rate Limiting Errors
- Sync automatically throttles to 3 req/sec
- If you hit limits, wait 60 seconds
- Consider reducing sync frequency

### Relation Errors
- Ensure Members and Projects sync before Events/Tasks
- Check foreign key constraints in database
- Verify Notion relation properties are correct

## 📊 Sync Performance

### Expected Times (6 team members)
- Members: < 1 second
- Projects: < 2 seconds
- Events: < 3 seconds
- Tasks: < 10 seconds (depends on count)
- **Total**: < 20 seconds for full sync

### Optimization Tips
- Use webhooks for real-time updates
- Run cron sync during off-hours
- Monitor `sync_logs` for slow syncs

## 🔐 Security Checklist

- [ ] `NOTION_API_KEY` is kept secret
- [ ] `WEBHOOK_SECRET` is a strong random string
- [ ] `CRON_SECRET` is a strong random string
- [ ] Webhook signature verification is enabled
- [ ] Manual sync endpoint is disabled in production
- [ ] Database credentials are secure

## 🧪 Testing Sync Logic

### Test Individual Parsers
```typescript
import { parseMembers } from '@/lib/notion/parsers/members';

// Fetch test data
const pages = await fetchAllPages(NOTION_DB_IDS.members);
const parsed = parseMembers(pages);
console.log(parsed);
```

### Test Rate Limiter
```typescript
import { rateLimiter } from '@/lib/notion/client';

for (let i = 0; i < 10; i++) {
  await rateLimiter.throttle();
  console.log(`Request ${i} at ${Date.now()}`);
}
// Should see ~350ms between requests
```

### Test Webhook Signature
```typescript
import crypto from 'crypto';

const body = JSON.stringify({ test: 'data' });
const secret = 'your_webhook_secret';
const hmac = crypto.createHmac('sha256', secret);
hmac.update(body);
const signature = hmac.digest('hex');

// Use this signature in x-notion-signature header
```

## 📝 Common Notion Property Names

Make sure your Notion databases use these exact property names:

### Members
- Name (Title)
- Phone Number (Phone)
- Profile Picture (Files)
- Anniversary (Date)

### Projects
- Name (Title)
- Status (Select: Backlog, Paused, In progress, Done)
- Dates (Date range)
- Priority (Select: Low, Medium, High)

### Events & Milestones
- Name (Title)
- Date (Date range)
- Event Type (Select: Manager Period, Vacation, Key Date, Deliverable, Milestone, Anniversary)
- Persons (Relation to Members)
- Projects (Relation to Projects)

### Tasks
- Title (Title)
- Status (Select: Not Started, In progress, Review, Done)
- Track (Select: Bug, Design, Doc, Dev)
- Priority (Select: Low, Medium, High)
- Date (Date range)
- Estimated Time (Number)
- Story Points (Number)
- Assigned to (Relation to Members)
- Project (Relation to Projects)
- Blocks (Relation to Tasks)
- Blocked By (Relation to Tasks)

## 🔄 Sync Flow Summary

```
1. Trigger (webhook/cron/manual)
   ↓
2. Fetch from Notion (with pagination)
   ↓
3. Parse JSON → Prisma format
   ↓
4. Upsert to PostgreSQL
   ↓
5. Log result to sync_logs
   ↓
6. Return success/error
```

## 📞 Support

If sync issues persist:
1. Check console logs for detailed errors
2. Review `sync_logs` table in database
3. Verify Notion property names match exactly
4. Test with manual sync endpoint first
5. Check Phase 2 documentation for details

---

**Last Updated**: Phase 2 Completion
**Next**: Configure your Notion integration and run first sync!
