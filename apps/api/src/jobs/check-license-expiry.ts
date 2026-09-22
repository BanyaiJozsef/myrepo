import { and, eq, lt } from "drizzle-orm";
import { createDatabase, licenses, tenants } from "@autoszerv/db";
import { loadConfig } from "../config.js";

/**
 * Downgrades any 'aktiv' tenant whose latest license has expired back to 'lejart'
 * (read-only mode; no data is deleted). Intended to run on a schedule (system cron,
 * or the hosting platform's scheduled-job feature) — see README for setup, since this
 * repo intentionally avoids bundling a cron-runner dependency for a single daily job.
 */
export async function checkLicenseExpiry(): Promise<number> {
  const config = loadConfig();
  const db = createDatabase(config.DATABASE_URL);

  const expiredTenantLicenses = await db
    .select({ tenantId: licenses.tenantId })
    .from(licenses)
    .innerJoin(tenants, eq(tenants.id, licenses.tenantId))
    .where(and(eq(tenants.allapot, "aktiv"), lt(licenses.lejar, new Date())));

  let downgraded = 0;
  for (const { tenantId } of expiredTenantLicenses) {
    await db.update(tenants).set({ allapot: "lejart" }).where(eq(tenants.id, tenantId));
    downgraded += 1;
  }
  return downgraded;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkLicenseExpiry()
    .then((count) => {
      console.warn(`${count} tenant állapota lejártra váltva.`);
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
