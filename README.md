# expense-trackr

A desktop-first expense tracker for UGX and USD. Next.js 16, Tailwind 4, Motion, shadcn with the beUI and bklit registries.

```bash
bun install
bun dev
```

Mock data lives in `src/lib/db.ts` and is served through `/api/*` route handlers. Swapping that module for Supabase is the migration path.
