import type { FastifyPluginAsync } from "fastify";
import { and, count, eq } from "drizzle-orm";
import { munkalapok, munkalapTetelek, szamlak, tenants, ugyfelek } from "@autoszerv/db";
import {
  MUNKALAP_STATUSZOK,
  munkalapInputSchema,
  munkalapTetelInputSchema,
  uuidSchema,
  type MunkalapStatusz,
} from "@autoszerv/shared-types";
import { z } from "zod";
import { withTenant } from "../plugins/tenant-context.js";
import { DemoLimitElerveHiba, ellenorizDemoLimit } from "../demo-limit-guard.js";
import { ErvenytelenAllapotAtmenetHiba, valtasMunkalapStatusz } from "@autoszerv/shared-types";

const statuszValtasSchema = z.object({ statusz: z.enum(MUNKALAP_STATUSZOK) });

export const munkalapokRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/munkalapok", async (request) => {
    const tenantId = request.authUser!.tenantId;
    return withTenant(fastify.db, tenantId, (tx) =>
      tx.select().from(munkalapok).where(eq(munkalapok.tenantId, tenantId)),
    );
  });

  fastify.get("/munkalapok/:id", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const result = await withTenant(fastify.db, tenantId, async (tx) => {
      const [munkalap] = await tx
        .select()
        .from(munkalapok)
        .where(and(eq(munkalapok.id, id), eq(munkalapok.tenantId, tenantId)));
      if (!munkalap) {
        return null;
      }
      const tetelek = await tx.select().from(munkalapTetelek).where(eq(munkalapTetelek.munkalapId, id));
      return { ...munkalap, tetelek };
    });
    if (!result) {
      return reply.status(404).send({ hiba: "A munkalap nem található." });
    }
    return result;
  });

  fastify.post("/munkalapok", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const parsed = munkalapInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen munkalap adatok.", reszletek: parsed.error.flatten() });
    }

    try {
      const created = await withTenant(fastify.db, tenantId, async (tx) => {
        const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
        if (!tenant) {
          throw new Error("Ismeretlen tenant.");
        }
        const darabszamSorok = await tx
          .select({ value: count() })
          .from(munkalapok)
          .where(eq(munkalapok.tenantId, tenantId));
        ellenorizDemoLimit(tenant.allapot, "maxMunkalapok", darabszamSorok[0]?.value ?? 0);

        const [row] = await tx
          .insert(munkalapok)
          .values({ tenantId, ...parsed.data, statusz: "felvett" })
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

  fastify.post("/munkalapok/:id/tetelek", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const parsed = munkalapTetelInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen tétel." });
    }
    const created = await withTenant(fastify.db, tenantId, async (tx) => {
      const [munkalap] = await tx
        .select()
        .from(munkalapok)
        .where(and(eq(munkalapok.id, id), eq(munkalapok.tenantId, tenantId)));
      if (!munkalap) {
        return null;
      }
      const [row] = await tx
        .insert(munkalapTetelek)
        .values({
          munkalapId: id,
          tipus: parsed.data.tipus,
          megnevezes: parsed.data.megnevezes,
          mennyiseg: String(parsed.data.mennyiseg),
          egysegar: String(parsed.data.egysegar),
          afaKulcs: parsed.data.afaKulcs,
        })
        .returning();
      return row;
    });
    if (!created) {
      return reply.status(404).send({ hiba: "A munkalap nem található." });
    }
    return reply.status(201).send(created);
  });

  // Workflow: felvett -> folyamatban -> kesz -> lezart (see @autoszerv/shared-types state machine).
  fastify.patch("/munkalapok/:id/statusz", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const parsed = statuszValtasSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen státusz." });
    }

    try {
      const updated = await withTenant(fastify.db, tenantId, async (tx) => {
        const [munkalap] = await tx
          .select()
          .from(munkalapok)
          .where(and(eq(munkalapok.id, id), eq(munkalapok.tenantId, tenantId)));
        if (!munkalap) {
          return null;
        }
        const ujStatusz: MunkalapStatusz = valtasMunkalapStatusz(munkalap.statusz, parsed.data.statusz);
        const [row] = await tx
          .update(munkalapok)
          .set({ statusz: ujStatusz })
          .where(eq(munkalapok.id, id))
          .returning();
        return row;
      });
      if (!updated) {
        return reply.status(404).send({ hiba: "A munkalap nem található." });
      }
      return updated;
    } catch (error) {
      if (error instanceof ErvenytelenAllapotAtmenetHiba) {
        return reply.status(409).send({ hiba: error.message });
      }
      throw error;
    }
  });

  fastify.post("/munkalapok/:id/szamla", async (request, reply) => {
    const tenantId = request.authUser!.tenantId;
    const id = uuidSchema.parse((request.params as { id: string }).id);
    const fizetesiMod = z
      .enum(["keszpenz", "atutalas", "bankkartya"])
      .parse((request.body as { fizetesiMod?: string })?.fizetesiMod ?? "keszpenz");

    const context = await withTenant(fastify.db, tenantId, async (tx) => {
      const [munkalap] = await tx
        .select()
        .from(munkalapok)
        .where(and(eq(munkalapok.id, id), eq(munkalapok.tenantId, tenantId)));
      if (!munkalap) {
        return null;
      }
      const [ugyfel] = await tx.select().from(ugyfelek).where(eq(ugyfelek.id, munkalap.ugyfelId));
      const tetelek = await tx.select().from(munkalapTetelek).where(eq(munkalapTetelek.munkalapId, id));
      return { munkalap, ugyfel, tetelek };
    });
    if (!context?.munkalap || !context.ugyfel) {
      return reply.status(404).send({ hiba: "A munkalap vagy az ügyfél nem található." });
    }

    const invoiceResult = await fastify.invoiceProvider.createInvoice({
      munkalapId: id,
      vevo: {
        nev: context.ugyfel.nev,
        adoszam: context.ugyfel.adoszam ?? undefined,
        cim: context.ugyfel.cim ?? undefined,
        email: context.ugyfel.email ?? undefined,
      },
      tetelek: context.tetelek.map((t) => ({
        tipus: t.tipus,
        megnevezes: t.megnevezes,
        mennyiseg: Number(t.mennyiseg),
        egysegar: Number(t.egysegar),
        afaKulcs: t.afaKulcs as 0 | 5 | 18 | 27,
      })),
      fizetesiMod,
    });

    const [szamla] = await withTenant(fastify.db, tenantId, (tx) =>
      tx
        .insert(szamlak)
        .values({
          tenantId,
          munkalapId: id,
          kulsoSzamlaId: invoiceResult.kulsoSzamlaId,
          szamlaszam: invoiceResult.szamlaszam,
          brutto: String(invoiceResult.bruttoOsszeg),
          afa: String(invoiceResult.afaOsszeg),
          fizetve: fizetesiMod !== "atutalas",
          kelt: invoiceResult.kelt,
        })
        .returning(),
    );

    return reply.status(201).send({ ...szamla, demo: invoiceResult.demo });
  });
};
