# 0003 — `felhasznalok` (users) is intentionally excluded from Row-Level Security

## Context

Every business table carries `tenant_id` and is protected by a Postgres RLS policy that
only allows access when `tenant_id` matches the session's `app.tenant_id` setting (set by
`withTenant()` per request — see `apps/api/src/plugins/tenant-context.ts`). This was applied
uniformly to `felhasznalok` (users) at first, per the brief's data model.

In practice this broke both login and registration: a user identifies themselves by email
alone at that point, and the tenant they belong to is exactly the thing the lookup is
supposed to determine. There is no `app.tenant_id` to set yet, so the RLS policy's
`USING`/`WITH CHECK` clause (`tenant_id = current_setting('app.tenant_id', true)::uuid`)
evaluated `tenant_id = NULL`, which is never true — the login lookup silently returned zero
rows for every email, and the registration insert was rejected outright with
`new row violates row-level security policy for table "felhasznalok"`. Both were caught by
running the actual HTTP flows against a live Postgres database, not by the unit tests alone
(see ADR 0001).

## Decision

`felhasznalok` is treated like `tenants`/`licenses`: no RLS policy, no `FORCE ROW LEVEL
SECURITY`. Every other table keeps RLS as originally specified. All post-authentication
queries against `felhasznalok` (anything a route handler runs once a request already has a
`tenantId` from the verified JWT) still filter by `tenantId` explicitly at the application
layer, same as any Drizzle query — RLS was always a second layer on top of that, never a
replacement for it, so removing it from this one table does not remove application-level
tenant filtering anywhere.

## Consequences

- A bug in application-level `tenantId` filtering on a `felhasznalok` query would not be
  caught by the database as a second line of defense, unlike every other table. Any new
  query against `felhasznalok` needs its `tenantId` filter reviewed carefully in code
  review, since the database will no longer catch a missing one.
- Login and registration work correctly for any tenant without needing a separate
  bypass-RLS database role or connection just for those two pre-auth code paths, which
  would have added real operational complexity (a second Postgres role/connection pool)
  for a single-table problem.
