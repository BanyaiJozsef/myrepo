import type { FastifyPluginAsync } from "fastify";
import { and, count, eq } from "drizzle-orm";
import { jarmuvek, tenants } from "@autoszerv/db";
import { jarmuInputSchema, uuidSchema } from "@autoszerv/shared-types";
import { withTenant } from "../plugins/tenant-context.js";
import { DemoLimitElerveHiba, ellenorizDemoLimit } from "../demo-limit-guard.js";

export const jarmuvekRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/jarmuvek", async (request) => {
    const tenantId = request.authUser!.tenantId;
    const query = request.query as { ugyfelId?: string };
    return withTenant(fastify.db, tenantId, (tx) => {
      const conditions = [eq(jarmuvek.tenantId, tenantId)];
      if (query.ugyfelId) {
        conditions.push(eq(jarmuvek.ugyfelId, uuidSchema.parse(query.ugyfelId)));
      }
      return tx
        .select()
        .from(jarmuvek)
        .where(and(...conditions));
    });
  });

  fastify.get("/jarmuvek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const [jarmu] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .select()
        .from(jarmuvek)
        .where(and(eq(jarmuvek.id, id), eq(jarmuvek.tenantId, tenantId))),
    );
    if (!jarmu) {
      return reply.status(404).send({ hiba: "A jármű nem található." });
    }
    return jarmu;
  });

  fastify.post("/jarmuvek", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const parsed = jarmuInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen járműadatok.", reszletek: parsed.error.flatten() });
    }

    try {
      const created = await withTenant(fastify.db, tenantId, async (tx) => {
        const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
        if (!tenant) {
          throw new Error("Ismeretlen tenant.");
        }
        const darabszamSorok = await tx
          .select({ value: count() })
          .from(jarmuvek)
          .where(eq(jarmuvek.tenantId, tenantId));
        ellenorizDemoLimit(tenant.allapot, "maxJarmuvek", darabszamSorok[0]?.value ?? 0);

        const [row] = await tx.insert(jarmuvek).values({ tenantId, ...parsed.data }).returning();
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

  fastify.patch("/jarmuvek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const parsed = jarmuInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen járműadatok." });
    }
    const [updated] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .update(jarmuvek)
        .set(parsed.data)
        .where(and(eq(jarmuvek.id, id), eq(jarmuvek.tenantId, tenantId)))
        .returning(),
    );
    if (!updated) {
      return reply.status(404).send({ hiba: "A jármű nem található." });
    }
    return updated;
  });

  fastify.delete("/jarmuvek/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const [deleted] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .delete(jarmuvek)
        .where(and(eq(jarmuvek.id, id), eq(jarmuvek.tenantId, tenantId)))
        .returning(),
    );
    if (!deleted) {
      return reply.status(404).send({ hiba: "A jármű nem található." });
    }
    return reply.status(204).send();
  });
};
