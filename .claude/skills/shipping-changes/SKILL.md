---
name: shipping-changes
description: Verifies, commits and pushes the current work on the redesign branch. Use when the user says to ship, commit and push, or wrap up a stage.
disable-model-invocation: true
---

# Shipping changes

Run these in order and stop at the first failure. Report the failure; don't work around it.

1. `npm test`
2. `npm run lint`
3. `npm run build`
4. Secret check: `git status --porcelain` plus `git diff --cached --name-only` must not list any `.env*` file other than `.env.example`. The repo is public.
5. Confirm the branch is `redesign`. Never commit to or merge into `main`.
6. Stage only the files that belong to this change, then commit with a short imperative subject and a body that says *why*.
7. `git push`. Upstream tracking is already set.
8. If the change needs a migration, remind the user which `supabase/migrations/` file to run in the SQL Editor.
9. Summary for the user: what shipped, the test, lint and build results, and anything left pending.
