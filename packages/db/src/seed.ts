import { hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";
import { felhasznalok, jarmuvek, munkalapok, munkalapTetelek, tenants, ugyfelek } from "./schema.js";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL nincs beállítva.");
  }
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    const [tenant] = await db
      .insert(tenants)
      .values({ nev: "Minta Autószerviz Kft.", allapot: "demo" })
      .returning();
    if (!tenant) {
      throw new Error("Nem sikerült a demó tenant létrehozása.");
    }

    // Every other table has RLS FORCE'd on tenant_id, so this session needs
    // app.tenant_id set before it can insert rows for the new tenant.
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenant.id}, false)`);

    await db.insert(felhasznalok).values({
      tenantId: tenant.id,
      nev: "Kovács János",
      email: "tulaj@mintaszerviz.hu",
      jelszoHash: await hash("DemoJelszo123!"),
      szerep: "tulaj",
    });

    const [ugyfel] = await db
      .insert(ugyfelek)
      .values({
        tenantId: tenant.id,
        nev: "Teszt Elek",
        tipus: "maganszemely",
        telefon: "+36301234567",
        email: "teszt.elek@example.com",
        gdprHozzajarulas: true,
      })
      .returning();
    if (!ugyfel) {
      throw new Error("Nem sikerült a minta ügyfél létrehozása.");
    }

    const [jarmu] = await db
      .insert(jarmuvek)
      .values({
        tenantId: tenant.id,
        ugyfelId: ugyfel.id,
        rendszam: "ABC-123",
        gyartmany: "Suzuki",
        tipus: "Swift",
        evjarat: 2015,
        kmOra: 98000,
      })
      .returning();
    if (!jarmu) {
      throw new Error("Nem sikerült a minta jármű létrehozása.");
    }

    const [munkalap] = await db
      .insert(munkalapok)
      .values({
        tenantId: tenant.id,
        jarmuId: jarmu.id,
        ugyfelId: ugyfel.id,
        statusz: "felvett",
        hibaleiras: "Olajcsere és fékbetét csere szükséges.",
        tipus: "munka",
      })
      .returning();
    if (!munkalap) {
      throw new Error("Nem sikerült a minta munkalap létrehozása.");
    }

    await db.insert(munkalapTetelek).values([
      {
        munkalapId: munkalap.id,
        tipus: "munka",
        megnevezes: "Olajcsere munkadíj",
        mennyiseg: "1",
        egysegar: "8000",
        afaKulcs: 27,
      },
      {
        munkalapId: munkalap.id,
        tipus: "alkatresz",
        megnevezes: "Motorolaj 5W-30 (4L)",
        mennyiseg: "1",
        egysegar: "12000",
        afaKulcs: 27,
      },
    ]);

    console.warn(`Demó adatok betöltve. Tenant: ${tenant.id}`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
