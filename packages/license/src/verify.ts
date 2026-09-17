import { verify as edVerify } from "node:crypto";
import { licensePayloadSchema, type LicensePayload } from "@autoszerv/shared-types";
import { loadPublicKey } from "./keys.js";

export type LicenseVerificationResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: "invalid_format" | "invalid_signature" | "invalid_payload" | "expired" | "tenant_mismatch" };

/**
 * Verifies a license key against the embedded public key and an expected tenant id.
 * Pure, offline cryptographic check — no phone-home to any licensing server.
 */
export function verifyLicense(
  licenseKey: string,
  publicKeyB64: string,
  expectedTenantId: string,
): LicenseVerificationResult {
  const parts = licenseKey.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "invalid_format" };
  }
  const [payloadB64, signatureB64] = parts;

  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "invalid_format" };
  }

  let signatureValid: boolean;
  try {
    const publicKey = loadPublicKey(publicKeyB64);
    const signature = Buffer.from(signatureB64, "base64url");
    signatureValid = edVerify(null, Buffer.from(payloadJson, "utf8"), publicKey, signature);
  } catch {
    return { valid: false, reason: "invalid_signature" };
  }
  if (!signatureValid) {
    return { valid: false, reason: "invalid_signature" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(payloadJson);
  } catch {
    return { valid: false, reason: "invalid_payload" };
  }

  const result = licensePayloadSchema.safeParse(parsedJson);
  if (!result.success) {
    return { valid: false, reason: "invalid_payload" };
  }
  const payload = result.data;

  if (payload.tenant_id !== expectedTenantId) {
    return { valid: false, reason: "tenant_mismatch" };
  }

  if (new Date(payload.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload };
}
