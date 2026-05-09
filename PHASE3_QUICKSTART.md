# 🚀 Phase 3 Quick Start Guide

## ✅ Phase 3 is Complete!

The custom CSS Grid timeline dashboard is fully implemented and ready to view.

## 🎯 Quick Start

### 1. Make Sure Data is Synced

If you haven't synced your Notion data yet:

```bash
curl http://localhost:3000/api/sync/manual
```

Expected output:
```json
{
  "source": "cron",
  "status": "success",
  "message": "Successfully synced X records",
  "recordCount": X
}
```

### 2. Open the Dashboard

Visit: **http://localhost:3000**

You should see:
- ✅ Header with View/Edit toggle and theme toggle
- ✅ Filters (Project dropdown and Time Range buttons)
- ✅ Custom CSS Grid timeline with your projects and tasks
- ✅ Event markers above the timeline
- ✅ Dependency arrows between tasks
- ✅ Capacity pressure chart at the bottom

### 3. Try These Features

**Filters:**
- Click different time ranges (Week, 2 Weeks, Month, 3 Months, Year)
- Select a project from the dropdown to filter tasks
- Click "Refresh" to reload data

**Timeline:**
- Scroll horizontally to see more dates
- Look for the blue vertical line (Today's playhead)
- Hover over tasks to see details
- Click the external link icon to open task in Notion
- Click project names to collapse/expand sections

**Theme:**
- Click the moon/sun icon in the header to toggle dark mode
- Your preference is saved in localStorage

**Capacity Chart:**
- See workload pressure by week
- Green = Low (<40h), Yellow = Medium (40-60h), Red = High (>60h)
- Hover over bars to see task counts

## 🎨 What You're Seeing

### Timeline Structure
```
Project A (collapsible)
  ├─ Bug Track    [===Task 1===]  [Task 2]
  ├─ Design Track                 [===Task 3===]
  ├─ Doc Track    [Task 4]
  └─ Dev Track    [======Task 5======]

Project B (collapsible)
  └─ Dev Track    [==Task 6==]
```

### Color Coding

**Task Status:**
- Gray = Not Started
- Blue = In Progress
- Yellow = Review
- Green = Done

**Priority (left border):**
- Thin = Low
- Medium = Medium
- Thick Red = High

**Event Markers (icons above timeline):**
- 🗓️ Calendar = Manager Period (Purple)
- ✈️ Plane = Vacation (Orange)
- 🚩 Flag = Key Date (Blue)
- 📦 Package = Deliverable (Green)
- ⭐ Star = Milestone (Yellow)
- 🎂 Cake = Anniversary (Pink)

## 🐛 Troubleshooting

### "No projects found"
- Run sync: `curl http://localhost:3000/api/sync/manual`
- Check your Notion databases have data
- Verify database IDs in `.env` are correct

### Timeline looks empty
- Change time range to "Month" or "3 Months"
- Check if tasks have start dates in Notion
- Remove project filter (select "All Projects")

### Dependency arrows not showing
- Make sure tasks have "Blocks" or "Blocked By" relations in Notion
- Arrows only show between visible tasks on the timeline
- Try scrolling to see if tasks are off-screen

### Dark mode not working
- Click the moon/sun icon in the header
- Check browser console for errors
- Try refreshing the page

### Capacity chart shows "No data"
- Tasks need `estimatedTime` and `storyPoints` in Notion
- Tasks need to be assigned to members
- Try a longer time range (Month or 3 Months)

## 📊 Sample Data Check

To verify your data is loaded:

```bash
# Check API response
curl http://localhost:3000/api/dashboard | jq '.'

# Should show:
# {
#   "projects": [...],  // Your projects
#   "tasks": [...],     // Your tasks
#   "events": [...],    // Your events
#   "members": [...]    // Your team members
# }
```

## 🎯 Phase 3 Features Checklist

- [ ] Dashboard loads without errors
- [ ] See your projects and tasks on timeline
- [ ] Time range filters work (Week, Month, Year)
- [ ] Project filter works
- [ ] Today's playhead shows (blue line)
- [ ] Event markers appear above timeline
- [ ] Dependency arrows connect tasks
- [ ] Capacity chart shows at bottom
- [ ] Light/Dark mode toggle works
- [ ] Can collapse/expand projects
- [ ] Hover shows task details
- [ ] External links open Notion pages
- [ ] Horizontal scroll works smoothly

## 🚀 Next: Phase 4

Once you've verified everything works, type **"APPROVE"** to proceed to Phase 4:
- Drag & Drop task editing
- Resize task duration
- Optimistic UI updates
- Notion write-back
- PNG export (16:9 for PowerPoint)

---

**Phase 3 Status**: ✅ Complete and ready for review
**Dashboard URL**: http://localhost:3000
**API Endpoint**: http://localhost:3000/api/dashboard
