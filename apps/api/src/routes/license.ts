import type { FastifyPluginAsync } from "fastify";
import { desc, eq } from "drizzle-orm";
import { licenses, tenants } from "@autoszerv/db";
import { z } from "zod";
import { withTenant } from "../plugins/tenant-context.js";
import { createLicenseActivationService } from "../license-activation-service.js";

const activateBodySchema = z.object({ licenseKey: z.string().min(1) });

const HIBA_UZENETEK: Record<string, string> = {
  invalid_format: "A megadott licenckulcs formátuma érvénytelen.",
  invalid_signature: "A licenckulcs aláírása érvénytelen. Ellenőrizd, hogy helyesen másoltad be.",
  invalid_payload: "A licenckulcs tartalma érvénytelen.",
  expired: "Ez a licenckulcs lejárt. Kérj újat a szolgáltatótól.",
  tenant_mismatch: "Ez a licenckulcs egy másik szervizhez tartozik.",
};

export const licenseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/license", async (request) => {
    const tenantId = request.authUser!.tenantId;
    return withTenant(fastify.db, tenantId, async (tx) => {
      const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
      const [latestLicense] = await tx
        .select()
        .from(licenses)
        .where(eq(licenses.tenantId, tenantId))
        .orderBy(desc(licenses.kiadva))
        .limit(1);
      return { tenant, license: latestLicense ?? null };
    });
  });

  fastify.post("/license/activate", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const parsed = activateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Hiányzó licenckulcs." });
    }

    const activate = createLicenseActivationService({
      publicKey: fastify.licensePublicKey,
      repo: {
        activateLicense: async (params) => {
          await withTenant(fastify.db, tenantId, async (tx) => {
            await tx.insert(licenses).values({
              tenantId: params.tenantId,
              licenseKeyHash: params.licenseKeyHash,
              plan: params.plan,
              features: params.features,
              kiadva: params.kiadva,
              lejar: params.lejar,
              aktivalva: new Date(),
            });
            await tx.update(tenants).set({ allapot: "aktiv" }).where(eq(tenants.id, params.tenantId));
          });
        },
      },
    });

    const result = await activate(tenantId, parsed.data.licenseKey);
    if (!result.success) {
      return reply.status(422).send({ hiba: HIBA_UZENETEK[result.reason], kod: result.reason });
    }
    return reply.status(200).send({ sikeres: true, plan: result.payload.plan, expiresAt: result.payload.expires_at });
  });
};
