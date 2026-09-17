import { generateLicenseKeyPair, signLicense } from "@autoszerv/license";
import { licensePayloadSchema, type LicensePayload } from "@autoszerv/shared-types";
import { parseArgs } from "./args.js";

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "generate-keypair") {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    console.warn("Új Ed25519 kulcspár létrehozva.\n");
    console.warn("LICENSE_PUBLIC_KEY (kerüljön be a backend .env-be és a deploy konfigba):");
    console.warn(publicKey);
    console.warn("\nLICENSE_PRIVATE_KEY (SOHA ne kerüljön verziókezelésbe vagy a deployolt appba,");
    console.warn("csak ebben a CLI-ben, elkülönített admin környezetben):");
    console.warn(privateKey);
    return;
  }

  const privateKey = process.env.LICENSE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("A LICENSE_PRIVATE_KEY környezeti változó nincs beállítva.");
  }
  if (!args.tenant || !args.plan || !args.expires) {
    throw new Error(
      "Használat: pnpm license:generate --tenant <uuid> --plan <starter|pro|enterprise> --expires <ISO dátum> [--features invoicing,sms] [--max-users 5]",
    );
  }

  const payload: LicensePayload = licensePayloadSchema.parse({
    tenant_id: args.tenant,
    plan: args.plan,
    features: args.features ? args.features.split(",").map((f) => f.trim()) : [],
    max_users: args.maxUsers ?? 5,
    issued_at: new Date().toISOString(),
    expires_at: new Date(args.expires).toISOString(),
  });

  const licenseKey = signLicense(payload, privateKey);
  console.warn("Licenckulcs (ezt küldd el az ügyfélnek):\n");
  console.warn(licenseKey);
}

main();
