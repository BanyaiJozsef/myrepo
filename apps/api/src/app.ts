import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Database } from "@autoszerv/db";
import type { InvoiceProvider } from "@autoszerv/invoice-provider";
import authPluginDefault from "./plugins/auth.js";
import { createJwtService, type JwtService } from "./auth/jwt.js";
import { authRoutes } from "./routes/auth.js";
import { ugyfelekRoutes } from "./routes/ugyfelek.js";
import { jarmuvekRoutes } from "./routes/jarmuvek.js";
import { munkalapokRoutes } from "./routes/munkalapok.js";
import { licenseRoutes } from "./routes/license.js";
import { healthRoutes } from "./routes/health.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    invoiceProvider: InvoiceProvider;
    licensePublicKey: string;
  }
}

export interface BuildAppOptions {
  db: Database;
  invoiceProvider: InvoiceProvider;
  licensePublicKey: string;
  corsOrigin: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: true });

  await fastify.register(helmet);
  await fastify.register(cors, { origin: options.corsOrigin, credentials: true });
  await fastify.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await fastify.register(cookie);

  const jwtService: JwtService = createJwtService(options.jwt);
  await fastify.register(authPluginDefault, { jwtService });

  fastify.decorate("db", options.db);
  fastify.decorate("invoiceProvider", options.invoiceProvider);
  fastify.decorate("licensePublicKey", options.licensePublicKey);

  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(ugyfelekRoutes);
  await fastify.register(jarmuvekRoutes);
  await fastify.register(munkalapokRoutes);
  await fastify.register(licenseRoutes);

  return fastify;
}
