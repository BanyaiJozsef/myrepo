# 0001 — Scope for this build session

## Context

The original brief asks for a full production-ready, multi-tenant SaaS (customer/vehicle/
work-order management, invoicing integrations, PWA, full Playwright suite, Lighthouse
tuning, CI/CD, GDPR tooling) built to a zero-defect, fully-tested standard. That is
realistically several weeks of work for a team. This ADR records what was built to a
verified, working standard in this session, what was implemented but not exercised against
a live external dependency, and what was deliberately deferred — so the gap between "spec"
and "delivered" is explicit rather than silently glossed over.

## What was verified against real infrastructure, not just unit tests

During development, a local PostgreSQL 16 instance and a real Chromium browser were
available in the sandbox, so instead of stopping at mocked unit tests, the full stack was
exercised for real:

- Ran `drizzle-kit generate` + the migration script against a live Postgres, confirmed all
  11 tables and the Row-Level Security policies land exactly as intended
  (`relrowsecurity`/`relforcerowsecurity` checked directly in `pg_class`).
- Booted the real Fastify API against that database and drove the registration → customer →
  vehicle → work order → line item → status transitions → mock invoice flow with `curl`,
  including a cross-tenant isolation check (tenant C requesting tenant B's customer by id
  gets a 404, not a data leak).
- Ran the three Playwright E2E specs in `apps/web/e2e/` against a real browser, a real
  Postgres, and the real API — not a mocked harness.

This caught and fixed four real bugs that unit tests alone would not have caught:

1. **`packages/db/src/seed.ts`** inserted into RLS-protected tables without setting
   `app.tenant_id`, so every insert after the first was silently rejected by Postgres — and
   because the `postgres` client was never closed on error, the process hung forever
   instead of failing loudly.
2. **`POST /auth/register`** looked up `felhasznalok` by email (needed pre-auth, before any
   tenant is known) and inserted a new user, both while RLS on that table required a
   tenant context that didn't exist yet. Fixed by deliberately excluding `felhasznalok`
   from RLS (see ADR 0003) rather than trying to force a tenant context that can't exist at
   that point in the flow.
3. **`packages/db/src/migrate.ts`** re-ran the hand-written RLS SQL on every invocation
   (`CREATE POLICY` is not idempotent), which breaks any second deploy/CI run. Fixed by
   tracking applied files in a `_custom_sql_migrations` table, the same pattern
   drizzle-kit itself uses for its own migrations.
4. **Workspace package `main`/`types` fields pointed at TypeScript source** (`./src/index.ts`).
   This works under Vite/Vitest, which transform any resolved file transparently, but
   breaks the moment plain Node runs compiled output (`node dist/server.js` — exactly what
   a real deploy, a Docker container, or a Playwright `webServer` command does). Fixed by
   pointing `main`/`types` at `dist/`, relying on Turborepo's existing
   `dependsOn: ["^build"]` to build dependencies before dependents need them.

## What was implemented but not exercised against a live external dependency

- **`SzamlazzHuInvoiceProvider` / `BillingoInvoiceProvider`** (`packages/invoice-provider/`):
  implemented against each provider's public API documentation, unit-tested with a mocked
  `fetch`, but never called against the real Számlázz.hu or Billingo sandbox/production API
  (no credentials, and doing so would risk real side effects). `MockInvoiceProvider` is
  what demo tenants and the E2E suite actually exercise.
- **Docker images** (`apps/api/Dockerfile`, `apps/web/Dockerfile`): written as multi-stage,
  Alpine-based builds per the brief, reviewed by hand, but not actually built in this
  session — the sandbox's network egress policy blocked the Docker Hub CDN host
  (`production.cloudfront.docker.com`) that image-layer downloads redirect to, which reads
  as a policy boundary rather than a fixable config issue, so it wasn't worth working
  around. The `docker-build` job in `.github/workflows/ci.yml` builds both images on every
  push, gated behind the rest of CI passing, so this gets real verification (and the
  <200MB budget gets a real number) the first time CI runs, not before.
- **SMS/e-mail reminders**: the `ertesitesek` table and demo-mode "logged but not sent"
  behavior exist in the schema, but no SMS/e-mail provider adapter was built — the brief
  marks this "v1.1 / important, not core v1", and it was deprioritized in favor of getting
  the v1 CRUD + license flows fully working end-to-end.

## What was deliberately deferred

Per the brief's own instruction ("don't start on 'later' features until the required v1
runs flawlessly and is covered by tests"), the following were not started: gumihotel
module, digital vehicle inspection with photos, customer portal, profitability dashboard,
appointment booking calendar UI, parts/inventory management UI, mechanic time tracking.

## Consequences

- Anyone deploying this needs to run the Playwright suite (or the equivalent manual curl
  flow documented in this ADR's history) against their own target environment at least
  once before trusting the invoice-provider adapters or the Docker images in production.
- The `_custom_sql_migrations` tracking table is a deliberately small, hand-rolled
  mechanism rather than pulling in a generic migration framework — consistent with the
  brief's "avoid unnecessary dependencies" priority, since drizzle-kit already covers
  schema migrations and this only needs to track two RLS SQL files.
