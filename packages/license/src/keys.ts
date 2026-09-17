import { generateKeyPairSync, type KeyObject, createPrivateKey, createPublicKey } from "node:crypto";

export interface Ed25519KeyPairB64 {
  /** base64url-encoded SPKI DER public key. Safe to embed in the deployed backend. */
  publicKey: string;
  /** base64url-encoded PKCS8 DER private key. NEVER deploy this — operator-only. */
  privateKey: string;
}

/** Generates a new Ed25519 key pair for license signing. Run once per environment, offline. */
export function generateLicenseKeyPair(): Ed25519KeyPairB64 {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64url"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url"),
  };
}

export function loadPublicKey(publicKeyB64: string): KeyObject {
  return createPublicKey({
    key: Buffer.from(publicKeyB64, "base64url"),
    format: "der",
    type: "spki",
  });
}

export function loadPrivateKey(privateKeyB64: string): KeyObject {
  return createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64url"),
    format: "der",
    type: "pkcs8",
  });
}
