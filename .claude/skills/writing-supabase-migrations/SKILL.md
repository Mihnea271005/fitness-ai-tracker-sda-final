---
name: writing-supabase-migrations
description: Writes a new numbered SQL migration in supabase/migrations/ and updates the matching TypeScript types and queries. Use when adding or changing tables, columns, constraints, RLS policies or grants.
---

# Writing a Supabase migration

Migrations are run **by hand** in the Supabase SQL Editor, so the database and the deployed code can be out of sync for a while. Every migration has to be safe for that.

Copy this checklist and tick it off:

```
- [ ] 1. New file: supabase/migrations/NNNN_short_name.sql (next number, zero-padded)
- [ ] 2. Header comment: what it does, and "Run once in the SQL Editor, after <previous file>"
- [ ] 3. Expand only: add, backfill, constrain. No DROP/RENAME of anything current code reads
- [ ] 4. New table → enable RLS + policies on auth.uid() in this same file
- [ ] 5. New editable profiles column → grant update (<col>) on public.profiles to authenticated
- [ ] 6. Update src/lib/types.ts plus the selects/inserts in src/lib/data.ts, src/lib/auth.ts and actions
- [ ] 7. npm test && npm run build
- [ ] 8. Tell the user which file to run in the SQL Editor
```

## Expand, then contract

To replace or rename a column, ship it in **two migrations**:

1. **Expand** (now): add the new column, backfill it from the old one, and switch the code to the new column.
2. **Contract** (a later migration, after the user confirms step 1 ran and the code is live): drop the old column.

Doing both in one file breaks whichever side runs second. Migration 0004 is the example of what not to do: it added `locations` and dropped `equipment` in one step.

## Conventions

- Use `check (...)` constraints for enums and ranges, matching the validation in the Server Action.
- Text arrays with a fixed vocabulary: `check (col <@ array['a','b']::text[])`.
- Weights are `numeric` columns named `*_kg`. Never store display units.
