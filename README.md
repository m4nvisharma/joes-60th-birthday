# Joe's 60th — blood donation campaign

A warm, editorial campaign site that turns Joe's 60th birthday into a shared 60-pint blood donation challenge.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Without Supabase credentials, the app uses browser-local demo data so the interaction can be explored immediately. This mode is not shared between visitors.

## Shared production data

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run [`supabase.sql`](./supabase.sql).
3. Put the project URL and **anon** key in `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Enable Realtime for the `donations` table if it is not already enabled.

The browser only receives the public anon key. Row-level security permits anonymous reads and inserts, with no update or delete policies. Do not use a Supabase service-role key in a Vite environment.

## Production build and deployment

```bash
npm run build
npm run preview
```

The generated `dist` directory can be deployed to Vercel, Netlify, Cloudflare Pages, or GitHub Pages. For Vercel/Netlify, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables. If using a custom domain, point its DNS records at the selected host and keep the Supabase project URL unchanged.

## Product notes

- Each insert is an individual donation record, including repeat donations by the same person.
- The live list is driven by the database and Supabase Realtime insert events.
- The bag fills continuously toward 60, then remains full while the counter continues beyond the goal.
- The first observed crossing of 60 triggers the milestone toast once for that page session; refreshes do not replay it.
- The confirmation step prevents accidental submissions, and the submit button is locked while a request is in flight.
- `prefers-reduced-motion` is honored for transitions and celebration animation.
