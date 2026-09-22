import { generateLicenseKeyPair, signLicense } from "@autoszerv/license";
import type { LicensePayload } from "@autoszerv/shared-types";
import { describe, expect, it, vi } from "vitest";
import { createLicenseActivationService, hashLicenseKey } from "./license-activation-service.js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function makePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  const now = new Date();
  return {
    tenant_id: TENANT_ID,
    plan: "pro",
    features: ["invoicing"],
    max_users: 5,
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    ...overrides,
  };
}

describe("license activation service (demo -> live flow)", () => {
  it("activates a tenant with a validly signed license and persists it", async () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload(), privateKey);
    const activateLicense = vi.fn(async () => undefined);

    const service = createLicenseActivationService({ publicKey, repo: { activateLicense } });
    const result = await service(TENANT_ID, licenseKey);

    expect(result.success).toBe(true);
    expect(activateLicense).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        plan: "pro",
        licenseKeyHash: hashLicenseKey(licenseKey),
      }),
    );
  });

  it("does not persist anything when the signature is invalid", async () => {
    const { publicKey } = generateLicenseKeyPair();
    const { privateKey: rogueKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload(), rogueKey);
    const activateLicense = vi.fn(async () => undefined);

    const service = createLicenseActivationService({ publicKey, repo: { activateLicense } });
    const result = await service(TENANT_ID, licenseKey);

    expect(result).toEqual({ success: false, reason: "invalid_signature" });
    expect(activateLicense).not.toHaveBeenCalled();
  });

  it("does not persist anything for an expired license", async () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(
      makePayload({ expires_at: new Date(Date.now() - 1000).toISOString() }),
      privateKey,
    );
    const activateLicense = vi.fn(async () => undefined);

    const service = createLicenseActivationService({ publicKey, repo: { activateLicense } });
    const result = await service(TENANT_ID, licenseKey);

    expect(result).toEqual({ success: false, reason: "expired" });
    expect(activateLicense).not.toHaveBeenCalled();
  });

  it("does not persist anything when the license belongs to a different tenant", async () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(
      makePayload({ tenant_id: "22222222-2222-2222-2222-222222222222" }),
      privateKey,
    );
    const activateLicense = vi.fn(async () => undefined);

    const service = createLicenseActivationService({ publicKey, repo: { activateLicense } });
    const result = await service(TENANT_ID, licenseKey);

    expect(result).toEqual({ success: false, reason: "tenant_mismatch" });
    expect(activateLicense).not.toHaveBeenCalled();
  });
});
