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
4. Secret and personal-info check. The repo is **public**, and anything pushed stays in its history.
   - `git status --porcelain` plus `git diff --cached --name-only` must not list any `.env*` file other than `.env.example`, and no `.pem`/`.key`/`.db`/credential files.
   - Scan what's about to be committed (staged diff and commit message) for keys, emails, private IPs and Supabase project URLs:
     ```bash
     git diff --cached -U0 | grep -nE '^\+' | grep -nIE 'sb_secret|sb_publishable_[A-Za-z0-9]{10,}|service_role|eyJhbGciOi|[a-z0-9]{20}\.supabase\.co|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|\b(10|100|172|192)\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b|\.ts\.net'
     ```
     Allowed hits: `@example.com` test addresses, `noreply@anthropic.com`, the `sb_publishable_xxxx` placeholder, `100.x.y.z`-style placeholders. Anything else (a real email, IP, machine name, key, project URL, or a person's name or private detail from the session): **stop and replace it with a placeholder** before committing. Never write the real value into a file "to search for it".
   - Write commit messages without real IPs, emails, machine names or URLs of the user's own setup.
5. Confirm the branch is `redesign`. Never commit to or merge into `main`.
6. Stage only the files that belong to this change, then commit with a short imperative subject and a body that says *why*.
7. `git push`. Upstream tracking is already set.
8. If the change needs a migration, remind the user which `supabase/migrations/` file to run in the SQL Editor.
9. Summary for the user: what shipped, the test, lint and build results, and anything left pending.
