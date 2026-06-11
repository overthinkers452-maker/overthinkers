Update Deployment Environment Variables
====================================

This repository had Supabase keys removed from source and an `.env.example` added. Follow these steps to update your deployment environment variables across providers, verify the connection, and complete a safe rollout.

1) Rotate Supabase keys (if you haven't already)
   - Go to https://app.supabase.com → select project → Settings → API → rotate/regenerate keys.
   - Copy the new **anon** key (public/client) and the `SUPABASE_URL` if needed.

2) Update environment variables by provider

Replit (recommended for this repo)
  - Open your Repl → Tools → Secrets (Environment variables).
  - Add `EXPO_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
  - Add `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `<NEW_ANON_KEY>` (paste value, save).

GitHub Actions (CI)
  - With `gh` CLI:
    - `gh secret set EXPO_PUBLIC_SUPABASE_ANON_KEY --body "<NEW_ANON_KEY>" --repo <owner>/<repo>`
    - `gh secret set EXPO_PUBLIC_SUPABASE_URL --body "https://<project-ref>.supabase.co" --repo <owner>/<repo>`

Vercel
  - `vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production` (follow prompts and paste the key)
  - `vercel env add EXPO_PUBLIC_SUPABASE_URL production`

Netlify
  - `netlify env:set EXPO_PUBLIC_SUPABASE_ANON_KEY "<NEW_ANON_KEY>"`
  - `netlify env:set EXPO_PUBLIC_SUPABASE_URL "https://<project-ref>.supabase.co"`

Heroku
  - `heroku config:set EXPO_PUBLIC_SUPABASE_ANON_KEY='<NEW_ANON_KEY>' --app <APP_NAME>`

Other / Manual
  - Use your hosting provider's secret UI or CLI. Never commit the real keys to Git;
    use the `.env.example` as a reference for variable names.

3) Verify the values are applied (quick check)
  - From any machine with `curl` (replace values):

    ```bash
    SUPABASE_URL="https://<project-ref>.supabase.co"
    ANON="<NEW_ANON_KEY>"
    curl -s -o /dev/null -w "%{http_code}\n" \
      -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
      "$SUPABASE_URL/rest/v1/"
    ```

    - `200` (or other non-401) indicates the anon key is accepted for REST access.

4) Rollout guidance
  - Update provider envs, then trigger a redeploy (if your hosting requires it).
  - Validate the app behavior (login, reads/writes) in a staging environment before production.

5) Security notes
  - Anon keys are client-facing but rotate them if they were committed to a public repo.
  - If a `service_role` or any server-side secret was leaked, rotate it immediately and restrict usage.

6) If you want me to apply these changes automatically
  - I can run API/CLI updates (Replit, Vercel, Netlify, GitHub) if you provide the necessary admin tokens or CLI auth on this machine. Do NOT paste tokens into chat; provide them via a secure channel or run the commands locally using the snippets above.

See the collaborator notification template next.
