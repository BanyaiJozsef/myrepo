import type { FastifyPluginAsync } from "fastify";
import { and, count, eq } from "drizzle-orm";
import { tenants, ugyfelek } from "@autoszerv/db";
import { ugyfelInputSchema, uuidSchema } from "@autoszerv/shared-types";
import { withTenant } from "../plugins/tenant-context.js";
import { DemoLimitElerveHiba, ellenorizDemoLimit } from "../demo-limit-guard.js";

export const ugyfelekRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/ugyfelek", async (request) => {
    const tenantId = request.authUser!.tenantId;
    return withTenant(fastify.db, tenantId, (tx) =>
      tx.select().from(ugyfelek).where(eq(ugyfelek.tenantId, tenantId)),
    );
  });

  fastify.get("/ugyfelek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const [ugyfel] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .select()
        .from(ugyfelek)
        .where(and(eq(ugyfelek.id, id), eq(ugyfelek.tenantId, tenantId))),
    );
    if (!ugyfel) {
      return reply.status(404).send({ hiba: "Az ügyfél nem található." });
    }
    return ugyfel;
  });

  fastify.post("/ugyfelek", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const parsed = ugyfelInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen ügyféladatok.", reszletek: parsed.error.flatten() });
    }

    try {
      const created = await withTenant(fastify.db, tenantId, async (tx) => {
        const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
        if (!tenant) {
          throw new Error("Ismeretlen tenant.");
        }
        const darabszamSorok = await tx
          .select({ value: count() })
          .from(ugyfelek)
          .where(eq(ugyfelek.tenantId, tenantId));
        ellenorizDemoLimit(tenant.allapot, "maxUgyfelek", darabszamSorok[0]?.value ?? 0);

        const [row] = await tx
          .insert(ugyfelek)
          .values({ tenantId, ...parsed.data, email: parsed.data.email || null })
          .returning();
        return row;
      });
      return reply.status(201).send(created);
    } catch (error) {
      if (error instanceof DemoLimitElerveHiba) {
        return reply.status(403).send({ hiba: error.message, kod: "DEMO_LIMIT_ELERVE" });
      }
      throw error;
    }
  });

  fastify.patch("/ugyfelek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const parsed = ugyfelInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen ügyféladatok." });
    }
    const [updated] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .update(ugyfelek)
        .set(parsed.data)
        .where(and(eq(ugyfelek.id, id), eq(ugyfelek.tenantId, tenantId)))
        .returning(),
    );
    if (!updated) {
      return reply.status(404).send({ hiba: "Az ügyfél nem található." });
    }
    return updated;
  });

  // GDPR: full erasure of a customer's personal data on request.
  fastify.delete("/ugyfelek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const [deleted] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .delete(ugyfelek)
        .where(and(eq(ugyfelek.id, id), eq(ugyfelek.tenantId, tenantId)))
        .returning(),
    );
    if (!deleted) {
      return reply.status(404).send({ hiba: "Az ügyfél nem található." });
    }
    return reply.status(204).send();
  });

  // GDPR: export of all personal data held about a customer, as a single JSON document.
  fastify.get("/ugyfelek/:id/export", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const [ugyfel] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .select()
        .from(ugyfelek)
        .where(and(eq(ugyfelek.id, id), eq(ugyfelek.tenantId, tenantId))),
    );
    if (!ugyfel) {
      return reply.status(404).send({ hiba: "Az ügyfél nem található." });
    }
    return reply
      .header("Content-Disposition", `attachment; filename="ugyfel-${id}.json"`)
      .send(ugyfel);
  });
};
