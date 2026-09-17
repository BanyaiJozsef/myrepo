import { sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { LicensePayload } from "@autoszerv/shared-types";
import { generateLicenseKeyPair, loadPrivateKey } from "./keys.js";
import { signLicense } from "./sign.js";
import { verifyLicense } from "./verify.js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_TENANT_ID = "22222222-2222-2222-2222-222222222222";

function makePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  const now = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return {
    tenant_id: TENANT_ID,
    plan: "pro",
    features: ["invoicing", "sms"],
    max_users: 5,
    issued_at: now.toISOString(),
    expires_at: future.toISOString(),
    ...overrides,
  };
}

describe("license sign + verify", () => {
  it("accepts a validly signed, unexpired license for the right tenant", () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload(), privateKey);

    const result = verifyLicense(licenseKey, publicKey, TENANT_ID);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.plan).toBe("pro");
    }
  });

  it("rejects a license with an invalid/tampered signature", () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload(), privateKey);
    const [payloadB64] = licenseKey.split(".");
    const tampered = `${payloadB64}.${Buffer.from("not-a-real-signature").toString("base64url")}`;

    const result = verifyLicense(tampered, publicKey, TENANT_ID);

    expect(result).toEqual({ valid: false, reason: "invalid_signature" });
  });

  it("rejects a license signed with a different (untrusted) private key", () => {
    const { publicKey } = generateLicenseKeyPair();
    const { privateKey: otherPrivateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload(), otherPrivateKey);

    const result = verifyLicense(licenseKey, publicKey, TENANT_ID);

    expect(result).toEqual({ valid: false, reason: "invalid_signature" });
  });

  it("rejects an expired license", () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const past = new Date(Date.now() - 1000).toISOString();
    const licenseKey = signLicense(makePayload({ expires_at: past }), privateKey);

    const result = verifyLicense(licenseKey, publicKey, TENANT_ID);

    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects a license issued for a different tenant", () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const licenseKey = signLicense(makePayload({ tenant_id: OTHER_TENANT_ID }), privateKey);

    const result = verifyLicense(licenseKey, publicKey, TENANT_ID);

    expect(result).toEqual({ valid: false, reason: "tenant_mismatch" });
  });

  it("rejects a malformed license string", () => {
    const { publicKey } = generateLicenseKeyPair();

    expect(verifyLicense("not-a-license", publicKey, TENANT_ID)).toEqual({
      valid: false,
      reason: "invalid_format",
    });
    expect(verifyLicense("", publicKey, TENANT_ID)).toEqual({
      valid: false,
      reason: "invalid_format",
    });
  });

  it("rejects a payload that fails schema validation even if signed correctly", () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    const badPayloadJson = JSON.stringify({ tenant_id: TENANT_ID, plan: "not-a-plan" });
    const payloadB64 = Buffer.from(badPayloadJson, "utf8").toString("base64url");
    const signature = sign(null, Buffer.from(badPayloadJson, "utf8"), loadPrivateKey(privateKey));
    const licenseKey = `${payloadB64}.${signature.toString("base64url")}`;

    const result = verifyLicense(licenseKey, publicKey, TENANT_ID);

    expect(result).toEqual({ valid: false, reason: "invalid_payload" });
  });
});
