import { sign as edSign } from "node:crypto";
import type { LicensePayload } from "@autoszerv/shared-types";
import { loadPrivateKey } from "./keys.js";

/**
 * Signs a license payload with the operator's Ed25519 private key.
 * Output format: base64url(payloadJson).base64url(signature)
 * Only ever run by tools/generate-license in an isolated admin environment.
 */
export function signLicense(payload: LicensePayload, privateKeyB64: string): string {
  const privateKey = loadPrivateKey(privateKeyB64);
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const signature = edSign(null, Buffer.from(payloadJson, "utf8"), privateKey);
  const signatureB64 = signature.toString("base64url");
  return `${payloadB64}.${signatureB64}`;
}
