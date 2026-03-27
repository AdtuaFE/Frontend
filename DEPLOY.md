# frontend-dev deployment

This app is a Vite SPA that uses `BrowserRouter`, so production hosting needs an SPA fallback for route refreshes like `/signin` or `/dashboard`.

## Current status

- Production build verified locally with `npm run build`
- Output directory: `dist/`
- Vercel SPA rewrite added in `vercel.json`
- Netlify/static-host SPA fallback added in `public/_redirects`

## Recommended: Vercel

### Deploy from the Vercel dashboard

1. Import the GitHub repository.
2. Set **Root Directory** to `frontend-dev`.
3. Confirm these build settings:
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy.

### Deploy from the CLI

```bash
cd frontend-dev
npm install
npm run build
vercel
```

If Vercel asks for project settings, use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Netlify

Set:

- Base directory: `frontend-dev`
- Build command: `npm run build`
- Publish directory: `frontend-dev/dist`

The `public/_redirects` file ensures SPA routes resolve to `index.html`.

## Notes

- No `VITE_*` environment variables are currently required by this frontend.
- If you later add API URLs or keys, define them as `VITE_*` env vars in your hosting provider before building.
