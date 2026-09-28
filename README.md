# hr-dg-frontend

Defence Garden HR panel. The API is at <https://hr-dg-backend.onrender.com>.

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

The app uses same-origin session and CSRF cookies. Serve the built
`apps/hr-web/dist` files from the API origin, or place an authenticated reverse
proxy on the frontend origin that forwards API requests and cookies to the API.
A static host on a separate origin cannot call the Render API directly with the
current backend origin and cookie policy. The live panel is available at the
backend URL above.
