import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { munkalapok, ugyfelek } from "./schema.js";

describe("drizzle schema", () => {
  it("scopes ugyfelek to a tenant", () => {
    expect(Object.keys(getTableColumns(ugyfelek))).toContain("tenantId");
  });

  it("scopes munkalapok to a tenant and links jarmu/ugyfel", () => {
    const columns = Object.keys(getTableColumns(munkalapok));
    expect(columns).toEqual(
      expect.arrayContaining(["tenantId", "jarmuId", "ugyfelId", "statusz"]),
    );
  });
});
