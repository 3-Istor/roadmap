# Notion to PostgreSQL Schema Mapping

This document details how Notion database properties map to our Prisma schema.

## 1. Members Database
**Notion ID**: `3015aa43-1513-8063-9a47-e7763c2665aa`

| Notion Property | Type | Prisma Field | Prisma Type |
|----------------|------|--------------|-------------|
| Name | Title | `name` | String |
| Phone Number | Phone | `phoneNumber` | String? |
| Profile Picture | Files | `profilePicture` | String? (URL) |
| Anniversary | Date | `anniversary` | DateTime? |

### Relations
- **Events**: Many-to-many via `EventPersons` relation
- **Tasks**: One-to-many via `assignedTo`

---

## 2. Projects Database
**Notion ID**: `3015aa43-1513-80e1-9c90-e819d3f8a20f`

| Notion Property | Type | Prisma Field | Prisma Type |
|----------------|------|--------------|-------------|
| Name | Title | `name` | String |
| Status | Select | `status` | ProjectStatus enum |
| Dates | Date Range | `startDate`, `endDate` | DateTime?, DateTime? |
| Priority | Select | `priority` | Priority enum |

### Status Mapping
| Notion Value | Prisma Enum |
|-------------|-------------|
| Backlog | `BACKLOG` |
| Paused | `PAUSED` |
| In progress | `IN_PROGRESS` |
| Done | `DONE` |

### Priority Mapping
| Notion Value | Prisma Enum |
|-------------|-------------|
| Low | `LOW` |
| Medium | `MEDIUM` |
| High | `HIGH` |

### Relations
- **Tasks**: One-to-many
- **Events**: Many-to-many

---

## 3. Events & Milestones Database
**Notion ID**: `3595aa43-1513-80e3-a0bc-e7bd489a3151`

| Notion Property | Type | Prisma Field | Prisma Type |
|----------------|------|--------------|-------------|
| Name | Title | `name` | String |
| Date | Date Range | `startDate`, `endDate` | DateTime, DateTime? |
| Event Type | Select | `eventType` | EventType enum |
| Persons | Relation | `persons` | Member[] |
| Projects | Relation | `projects` | Project[] |

### Event Type Mapping
| Notion Value | Prisma Enum |
|-------------|-------------|
| Manager Period | `MANAGER_PERIOD` |
| Vacation | `VACATION` |
| Key Date | `KEY_DATE` |
| Deliverable | `DELIVERABLE` |
| Milestone | `MILESTONE` |
| Anniversary | `ANNIVERSARY` |

### Relations
- **Persons**: Many-to-many with Members
- **Projects**: Many-to-many with Projects

---

## 4. Tasks Database
**Notion ID**: `3015aa43-1513-80d7-b337-f5cff2e673a4`

| Notion Property | Type | Prisma Field | Prisma Type |
|----------------|------|--------------|-------------|
| Title | Title | `title` | String |
| Status | Select | `status` | TaskStatus enum |
| Track | Select | `track` | Track enum |
| Priority | Select | `priority` | Priority enum |
| Date | Date Range | `startDate`, `endDate` | DateTime?, DateTime? |
| Estimated Time | Number | `estimatedTime` | Float? (hours) |
| Story Points | Number | `storyPoints` | Int? |
| Assigned to | Relation | `assignedTo` | Member? |
| Project | Relation | `project` | Project? |
| Blocks | Relation (Self) | `blocks` | Task[] |
| Blocked By | Relation (Self) | `blockedBy` | Task[] |

### Status Mapping
| Notion Value | Prisma Enum |
|-------------|-------------|
| Not Started | `NOT_STARTED` |
| In progress | `IN_PROGRESS` |
| Review | `REVIEW` |
| Done | `DONE` |

### Track Mapping
| Notion Value | Prisma Enum |
|-------------|-------------|
| Bug | `BUG` |
| Design | `DESIGN` |
| Doc | `DOC` |
| Dev | `DEV` |

### Relations
- **Project**: Many-to-one
- **Assigned to**: Many-to-one with Member
- **Blocks/Blocked By**: Self-referential many-to-many for dependencies

---

## Parsing Strategy

### Date Ranges
Notion date ranges have `start` and `end` properties:
```typescript
// Notion format
{ start: "2024-01-15", end: "2024-01-20" }

// Prisma format
{ startDate: new Date("2024-01-15"), endDate: new Date("2024-01-20") }
```

### Relations
Notion relations are arrays of page IDs:
```typescript
// Notion format
{ relation: [{ id: "page-id-1" }, { id: "page-id-2" }] }

// Prisma format (connect by notionId)
{ connect: [{ notionId: "page-id-1" }, { notionId: "page-id-2" }] }
```

### Select Properties
Notion selects have a `name` property:
```typescript
// Notion format
{ select: { name: "In progress" } }

// Prisma format
{ status: "IN_PROGRESS" }
```

### Files (Profile Pictures)
Notion files are arrays with `url` properties:
```typescript
// Notion format
{ files: [{ url: "https://..." }] }

// Prisma format (store first URL)
{ profilePicture: "https://..." }
```

---

## Sync Implementation Notes

### Upsert Strategy
Use `notionId` as the unique identifier for upserts:
```typescript
await prisma.task.upsert({
  where: { notionId: notionPageId },
  update: { /* updated fields */ },
  create: { /* all fields */ }
});
```

### Handling Deletions
Notion webhooks don't send deletion events. The cron job should:
1. Fetch all current Notion page IDs
2. Compare with PostgreSQL `notionId` values
3. Delete records not present in Notion

### Transaction Safety
Wrap multi-model syncs in transactions:
```typescript
await prisma.$transaction([
  prisma.member.upsert(...),
  prisma.project.upsert(...),
  // ...
]);
```

---

## Environment Variables Required

```env
NOTION_API_KEY="secret_..."
NOTION_MEMBERS_DB_ID="3015aa43-1513-8063-9a47-e7763c2665aa"
NOTION_PROJECTS_DB_ID="3015aa43-1513-80e1-9c90-e819d3f8a20f"
NOTION_EVENTS_DB_ID="3595aa43-1513-80e3-a0bc-e7bd489a3151"
NOTION_TASKS_DB_ID="3015aa43-1513-80d7-b337-f5cff2e673a4"
```

---

**Last Updated**: Phase 1
**Next Phase**: Implement parsers in `lib/notion/parsers/`
