# hr-dg-frontend

Defence Garden HR panel. The API is at <https://hr-dg-backend.onrender.com>.

## Vercel deployment

Set the Vercel **Root Directory** to `apps/hr-web` and use the Vite defaults:
`npm run build` and output directory `dist`. This directory has its own
`package.json`, lockfile, and `vercel.json`; it builds without files above the
Vercel root. The Vercel config forwards API paths through a same-origin proxy to
the Render backend and serves `index.html` for frontend routes on refresh.

The API proxy preserves the browser's session and CSRF cookies and rejects
requests from other origins. Vercel Routing Middleware has a 4 MB request body
limit, so larger attachments need a separate upload path before that feature is
used on Vercel.

## Local development

Use Node 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open <http://localhost:5180>. The Vite development server proxies API requests to
the Render backend by default. Set `DG_API_PROXY` to another API origin when
working with an isolated backend. Do not use production employee data for tests.

```sh
npm run typecheck
npm run build
```

The app uses same-origin session and CSRF cookies. A plain static host on a
separate origin cannot call the Render API directly with the current backend
origin and cookie policy. The Vercel proxy provides that same-origin path; the
panel served by the backend itself remains available at the backend URL above.
