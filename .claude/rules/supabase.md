---
paths:
  - "supabase/**"
  - "src/lib/supabase/**"
  - "src/lib/data.ts"
  - "src/lib/auth.ts"
  - "src/app/**/actions.ts"
  - "src/app/**/route.ts"
---

# Supabase rules

- Row level security (RLS) is the real security boundary. Every new table gets `enable row level security` and policies scoped to `auth.uid()`, in the same migration.
- Updates on `profiles` use **column-level grants**. A new editable column needs `grant update (<col>) on public.profiles to authenticated;`, or saving fails silently.
- Server Actions: call `getCurrentUser()` first, validate every form field (type, range, length) and return `{ error }` with a plain-English message. Scope writes with `.eq("user_id", user.id)` / `.eq("id", user.id)` as defense in depth. Finish with `revalidatePath("/", "layout")`.
- Store kg, never display units. Convert with `fromDisplayWeight(value, user.unit)`.
- For schema changes, use the `writing-supabase-migrations` skill.
