# Turbopack + Notion SDK Fix

## Issue
Next.js 15 with Turbopack has compatibility issues with `@notionhq/client` package.
The `notion.databases.query` function appears as "not a function" due to incorrect bundling.

## Solution Applied

Added to `next.config.ts`:
```typescript
experimental: {
  serverComponentsExternalPackages: ['@notionhq/client'],
}
```

This tells Next.js to treat the Notion SDK as an external package and not bundle it with Turbopack.

## Required Action

**You MUST restart the dev server for this to take effect:**

1. Stop the current dev server (Ctrl+C)
2. Run: `npm run dev`
3. Test again: `curl http://localhost:3000/api/test-notion`

## Expected Result

After restart, you should see:
```json
{
  "success": true,
  "message": "Notion API is working!",
  "recordCount": 1,
  "hasMore": true/false
}
```

## If Still Not Working

Try using webpack instead of Turbopack:
```bash
npm run dev -- --no-turbopack
```

Or add to `package.json`:
```json
"dev": "next dev --no-turbopack"
```

## Alternative: Use Production Build

Turbopack is only used in development. Production builds use webpack and work fine:
```bash
npm run build
npm start
```

Then test: `curl http://localhost:3000/api/test-notion`
