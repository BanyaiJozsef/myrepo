import { sql } from "drizzle-orm";
import type { Database } from "@autoszerv/db";

/**
 * Runs `fn` inside a transaction with `app.tenant_id` set for the duration, so
 * Postgres RLS policies (packages/db/sql/0001_row_level_security.sql) enforce
 * tenant isolation as a second layer beneath the application-level `tenantId`
 * filters already applied in each query.
 */
export async function withTenant<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx as unknown as Database);
  });
}
