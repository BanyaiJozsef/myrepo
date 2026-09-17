import { createDatabase } from "@autoszerv/db";
import { createInvoiceProvider } from "@autoszerv/invoice-provider";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase(config.DATABASE_URL);
  const invoiceProvider = createInvoiceProvider({
    kind: config.INVOICE_PROVIDER,
    szamlazzHuAgentKey: config.SZAMLAZZHU_AGENT_KEY,
    billingoApiKey: config.BILLINGO_API_KEY,
  });

  const app = await buildApp({
    db,
    invoiceProvider,
    licensePublicKey: config.LICENSE_PUBLIC_KEY,
    corsOrigin: config.CORS_ORIGIN,
    jwt: {
      accessSecret: config.JWT_ACCESS_SECRET,
      refreshSecret: config.JWT_REFRESH_SECRET,
      accessTtl: config.JWT_ACCESS_TTL,
      refreshTtl: config.JWT_REFRESH_TTL,
    },
  });

  await app.listen({ port: config.API_PORT, host: config.API_HOST });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
