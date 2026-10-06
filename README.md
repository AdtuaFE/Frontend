# Adtua — Frontend

## Project info

React + TypeScript + Vite app for Adtua, built with shadcn-ui and Tailwind CSS.

## Getting started

Requires Node.js & npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# Clone the repository
git clone https://github.com/AdtuaFE/Frontend.git

# Navigate to the project directory
cd Frontend

# Install dependencies
npm i

# Start the dev server
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to point at a running backend.

## Testing

```sh
npm test            # unit tests (Vitest)
npm run test:e2e    # end-to-end tests (Playwright) — see e2e/.env.example for required credentials
```

## What technologies are used for this project?

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

Hosted on [Vercel](https://vercel.com), project `adtua-fe`.

- **Production branch: `release`** (not `main`) — pushing to `release` triggers a Production deploy.
- **Production domain:** `www.adtua.com` (the apex `adtua.com` redirects to it). The default `adtua-fe.vercel.app` is also live.
- **Workflow:** feature branches merge into `main` via PR; `main` is periodically merged into `release` to ship to Production. Branch any staging/testing work off `release` to match what's actually live, not off `main`.
