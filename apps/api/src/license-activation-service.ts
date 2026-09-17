import { createHash } from "node:crypto";
import { verifyLicense, type LicenseVerificationResult } from "@autoszerv/license";
import type { LicensePayload } from "@autoszerv/shared-types";

export interface LicenseActivationRepository {
  activateLicense(params: {
    tenantId: string;
    plan: LicensePayload["plan"];
    features: LicensePayload["features"];
    kiadva: Date;
    lejar: Date;
    licenseKeyHash: string;
  }): Promise<void>;
}

export type LicenseActivationResult =
  | { success: true; payload: LicensePayload }
  | { success: false; reason: Exclude<LicenseVerificationResult, { valid: true }>["reason"] };

export interface LicenseActivationServiceConfig {
  publicKey: string;
  repo: LicenseActivationRepository;
}

/** Hash stored server-side so the raw license key never needs to be re-persisted in plaintext. */
export function hashLicenseKey(licenseKey: string): string {
  return createHash("sha256").update(licenseKey).digest("hex");
}

export function createLicenseActivationService(config: LicenseActivationServiceConfig) {
  return async function activateLicense(
    tenantId: string,
    licenseKey: string,
  ): Promise<LicenseActivationResult> {
    const result = verifyLicense(licenseKey, config.publicKey, tenantId);
    if (!result.valid) {
      return { success: false, reason: result.reason };
    }

    await config.repo.activateLicense({
      tenantId,
      plan: result.payload.plan,
      features: result.payload.features,
      kiadva: new Date(result.payload.issued_at),
      lejar: new Date(result.payload.expires_at),
      licenseKeyHash: hashLicenseKey(licenseKey),
    });

    return { success: true, payload: result.payload };
  };
}
