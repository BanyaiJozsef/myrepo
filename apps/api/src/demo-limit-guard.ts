import { checkDemoLimit, type DemoLimitKey } from "@autoszerv/license";
import type { TenantAllapot } from "@autoszerv/shared-types";

export class DemoLimitElerveHiba extends Error {
  constructor(limit: number) {
    super(`Demó módban legfeljebb ${limit} tétel hozható létre. Frissíts az élesítéshez.`);
    this.name = "DemoLimitElerveHiba";
  }
}

/**
 * Throws when a demo tenant tries to create more than the allowed number of a
 * resource. A no-op for active ('aktiv') tenants. Call this before the insert,
 * inside the same transaction that will do the count + insert.
 */
export function ellenorizDemoLimit(
  tenantAllapot: TenantAllapot,
  key: DemoLimitKey,
  jelenlegiDarabszam: number,
): void {
  if (tenantAllapot !== "demo") {
    return;
  }
  const { allowed, limit } = checkDemoLimit(key, jelenlegiDarabszam);
  if (!allowed) {
    throw new DemoLimitElerveHiba(limit);
  }
}
