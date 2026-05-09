# Helm Chart Changelog

## [Unreleased]

### Added
- Support for multiple Notion database IDs (members, projects, events, tasks)
- `WEBHOOK_SECRET` environment variable for Notion webhook authentication
- `NEXT_PUBLIC_APP_URL` environment variable
- `NEXT_TELEMETRY_DISABLED` environment variable
- `secrets.example.yaml` file for easier secret management
- Automatic database migrations via entrypoint script

### Changed
- **BREAKING**: Replaced single `NOTION_DATABASE_ID` with four separate database IDs:
  - `NOTION_MEMBERS_DB_ID`
  - `NOTION_PROJECTS_DB_ID`
  - `NOTION_EVENTS_DB_ID`
  - `NOTION_TASKS_DB_ID`
- CronJob now uses `x-cron-secret` header instead of `Authorization: Bearer`
- Pod security context changed to run as root (required for database migrations)
- Database migrations now run automatically on pod startup via entrypoint script
- Removed separate migration job from deployment workflow

### Migration Guide

If you're upgrading from a previous version:

1. **Update your secrets**:
   ```bash
   # Delete old secret
   kubectl delete secret roadmap-secrets -n roadmap
   
   # Create new secret with all database IDs
   kubectl create secret generic roadmap-secrets \
     --from-literal=database-url="postgresql://..." \
     --from-literal=notion-api-key="ntn_..." \
     --from-literal=notion-members-db-id="xxx" \
     --from-literal=notion-projects-db-id="xxx" \
     --from-literal=notion-events-db-id="xxx" \
     --from-literal=notion-tasks-db-id="xxx" \
     --from-literal=webhook-secret="xxx" \
     --from-literal=cron-secret="xxx" \
     -n roadmap
   ```

2. **Update GitHub Actions secrets** (if using CI/CD):
   - Add `NOTION_MEMBERS_DB_ID`
   - Add `NOTION_PROJECTS_DB_ID`
   - Add `NOTION_EVENTS_DB_ID`
   - Add `NOTION_TASKS_DB_ID`
   - Add `WEBHOOK_SECRET`
   - Remove `NOTION_DATABASE_ID` (no longer used)

3. **Deploy the updated chart**:
   ```bash
   helm upgrade roadmap ./helm -n roadmap
   ```

4. **Verify the deployment**:
   ```bash
   # Check pod logs for successful migration
   kubectl logs -n roadmap -l app.kubernetes.io/name=roadmap
   
   # Should see:
   # ✅ PostgreSQL is ready and schema is synced!
   # 🎯 Starting Next.js server...
   ```

## Previous Versions

No previous versions documented (initial release).
