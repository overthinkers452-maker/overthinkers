Notify Collaborators: Supabase Key Rotation & Repo Cleanup
=========================================================

Use this template to notify team members after you rotate keys and update deployment envs.

Subject: Supabase keys rotated — please update your local envs

Hi team,

I rotated the Supabase anonymous key and removed the exposed keys from the repository history. Please update your local and CI environment variables as follows:

- `EXPO_PUBLIC_SUPABASE_URL` → `https://<project-ref>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → (new anon key — keep it private and do not commit)

Steps to update:
- If you use Replit: open the Repl → Tools → Secrets and add the two variables.
- If you use CI (GitHub Actions, Vercel, Netlify, Heroku), update secrets via the provider UI or use the CLI (see DEPLOY_ENV_UPDATE.md).

Verification:
- Confirm the app can access Supabase: run the check in DEPLOY_ENV_UPDATE.md (curl to `/rest/v1/` expecting 200 or non-401).

If you need assistance applying these updates, reply to this message and include which provider(s) you need help with.

Thanks,
<Your name>
