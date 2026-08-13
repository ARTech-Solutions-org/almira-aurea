# Gatepass — QR Code Event Check-in System

A mobile-first web app for event check-in using QR code scanning. Organizers log in, scan attendee QR codes, prevent duplicate check-ins, and monitor live attendance counts.

## Run & Operate

- **API Server** workflow — `PORT=8080 pnpm --filter @workspace/api-server run dev` (port 8080)
- **Start application** workflow — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/event-checkin run dev` (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `NEON_DATABASE_URL` — Neon PostgreSQL connection string (set as Replit Secret)

## Vercel build fix

- The root `vercel.json` is the only Vercel configuration; the legacy API-level config was removed to avoid conflicting `builds` settings.
- `api/tsconfig.json` gives Vercel's isolated `api/index.ts` compilation the same bundler resolution and module interop settings used by the workspace.
- Express, `@types/express`, and `drizzle-orm` use the workspace catalog so pnpm resolves one consistent version.
- `pnpm run typecheck`, `pnpm exec tsc -p api/tsconfig.json --noEmit`, and `pnpm run vercel-build` are the verification commands for future deployments.

## Vercel deployment

- The root `vercel.json` builds the frontend with `pnpm run vercel-build` and routes `/api/*` to `api/index.ts`.
- Set `NEON_DATABASE_URL` in the Vercel project environment variables for the API.
- Set `VITE_API_URL` to the deployed API base URL when the API and frontend are deployed as separate Vercel projects. If using the root configuration's `/api` rewrite, use `/api` for same-deployment requests.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/event-checkin/` — React/Vite mobile-first event check-in UI.
- `artifacts/api-server/src/` — Express API routes and server entrypoint.
- `lib/db/src/schema/` — Drizzle PostgreSQL schema for attendees and organizer users.
- `lib/api-spec/openapi.yaml` — API contract source of truth.
- `api/index.ts` — Vercel serverless API entrypoint; `api/tsconfig.json` controls its isolated TypeScript build.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Organizers sign in to scan attendee QR codes, prevent duplicate check-ins, and monitor attendance. The API persists organizer and attendee data in PostgreSQL.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Set `NEON_DATABASE_URL` before starting the API or publishing a deployment; the database client intentionally fails fast when it is missing.
- The API health endpoint is `/api/healthz`; `/` on the API service returns 404 by design.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
