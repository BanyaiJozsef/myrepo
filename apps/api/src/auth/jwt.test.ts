import { describe, expect, it } from "vitest";
import { createJwtService } from "./jwt.js";

const service = createJwtService({
  accessSecret: "a".repeat(32),
  refreshSecret: "b".repeat(32),
  accessTtl: "15m",
  refreshTtl: "30d",
});

describe("jwt service", () => {
  it("round-trips an access token", async () => {
    const token = await service.signAccessToken({
      sub: "user-1",
      tenantId: "tenant-1",
      szerep: "tulaj",
    });
    const claims = await service.verifyAccessToken(token);
    expect(claims).toEqual({ sub: "user-1", tenantId: "tenant-1", szerep: "tulaj" });
  });

  it("round-trips a refresh token", async () => {
    const token = await service.signRefreshToken({ sub: "user-1", tenantId: "tenant-1" });
    const claims = await service.verifyRefreshToken(token);
    expect(claims).toEqual({ sub: "user-1", tenantId: "tenant-1" });
  });

  it("rejects a token signed with a different secret", async () => {
    const otherService = createJwtService({
      accessSecret: "c".repeat(32),
      refreshSecret: "d".repeat(32),
      accessTtl: "15m",
      refreshTtl: "30d",
    });
    const token = await otherService.signAccessToken({
      sub: "user-1",
      tenantId: "tenant-1",
      szerep: "tulaj",
    });
    await expect(service.verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const shortLivedService = createJwtService({
      accessSecret: "a".repeat(32),
      refreshSecret: "b".repeat(32),
      accessTtl: "1s",
      refreshTtl: "30d",
    });
    const token = await shortLivedService.signAccessToken({
      sub: "user-1",
      tenantId: "tenant-1",
      szerep: "tulaj",
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await expect(shortLivedService.verifyAccessToken(token)).rejects.toThrow();
  });
});
