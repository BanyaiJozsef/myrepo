import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tenantAllapotEnum = pgEnum("tenant_allapot", ["demo", "aktiv", "lejart"]);
export const felhasznaloSzerepEnum = pgEnum("felhasznalo_szerep", [
  "tulaj",
  "recepcio",
  "szerelo",
]);
export const licensePlanEnum = pgEnum("license_plan", ["starter", "pro", "enterprise"]);
export const ugyfelTipusEnum = pgEnum("ugyfel_tipus", ["maganszemely", "ceg"]);
export const munkalapStatuszEnum = pgEnum("munkalap_statusz", [
  "felvett",
  "folyamatban",
  "kesz",
  "lezart",
]);
export const munkalapTipusEnum = pgEnum("munkalap_tipus", ["arajanlat", "munka"]);
export const munkalapTetelTipusEnum = pgEnum("munkalap_tetel_tipus", ["munka", "alkatresz"]);
export const idopontTipusEnum = pgEnum("idopont_tipus", ["foglalas", "emlekezteto"]);
export const idopontStatuszEnum = pgEnum("idopont_statusz", [
  "fuggoben",
  "megerositve",
  "lemondva",
  "megtortent",
]);
export const ertesitesCsatornaEnum = pgEnum("ertesites_csatorna", ["sms", "email"]);
export const ertesitesStatuszEnum = pgEnum("ertesites_statusz", [
  "naplozva",
  "kikuldve",
  "sikertelen",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  nev: text("nev").notNull(),
  allapot: tenantAllapotEnum("allapot").notNull().default("demo"),
  letrehozva: timestamp("letrehozva", { withTimezone: true }).notNull().defaultNow(),
});

export const licenses = pgTable("licenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  licenseKeyHash: text("license_key_hash").notNull(),
  plan: licensePlanEnum("plan").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  kiadva: timestamp("kiadva", { withTimezone: true }).notNull(),
  lejar: timestamp("lejar", { withTimezone: true }).notNull(),
  aktivalva: timestamp("aktivalva", { withTimezone: true }),
});

export const felhasznalok = pgTable("felhasznalok", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  nev: text("nev").notNull(),
  email: text("email").notNull().unique(),
  jelszoHash: text("jelszo_hash").notNull(),
  szerep: felhasznaloSzerepEnum("szerep").notNull().default("recepcio"),
});

export const ugyfelek = pgTable("ugyfelek", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  nev: text("nev").notNull(),
  tipus: ugyfelTipusEnum("tipus").notNull().default("maganszemely"),
  adoszam: text("adoszam"),
  cim: text("cim"),
  telefon: text("telefon"),
  email: text("email"),
  gdprHozzajarulas: boolean("gdpr_hozzajarulas").notNull().default(false),
  letrehozva: timestamp("letrehozva", { withTimezone: true }).notNull().defaultNow(),
});

export const jarmuvek = pgTable("jarmuvek", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  ugyfelId: uuid("ugyfel_id")
    .notNull()
    .references(() => ugyfelek.id, { onDelete: "cascade" }),
  rendszam: text("rendszam").notNull(),
  alvazszam: text("alvazszam"),
  gyartmany: text("gyartmany").notNull(),
  tipus: text("tipus").notNull(),
  evjarat: integer("evjarat"),
  kmOra: integer("km_ora"),
  muszakiLejarat: timestamp("muszaki_lejarat", { withTimezone: true }),
});

export const munkalapok = pgTable("munkalapok", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  jarmuId: uuid("jarmu_id")
    .notNull()
    .references(() => jarmuvek.id, { onDelete: "cascade" }),
  ugyfelId: uuid("ugyfel_id")
    .notNull()
    .references(() => ugyfelek.id, { onDelete: "cascade" }),
  statusz: munkalapStatuszEnum("statusz").notNull().default("felvett"),
  felvetelDatum: timestamp("felvetel_datum", { withTimezone: true }).notNull().defaultNow(),
  hibaleiras: text("hibaleiras").notNull(),
  szereloId: uuid("szerelo_id").references(() => felhasznalok.id, { onDelete: "set null" }),
  tipus: munkalapTipusEnum("tipus").notNull().default("munka"),
});

export const munkalapTetelek = pgTable("munkalap_tetelek", {
  id: uuid("id").primaryKey().defaultRandom(),
  munkalapId: uuid("munkalap_id")
    .notNull()
    .references(() => munkalapok.id, { onDelete: "cascade" }),
  tipus: munkalapTetelTipusEnum("tipus").notNull(),
  megnevezes: text("megnevezes").notNull(),
  mennyiseg: decimal("mennyiseg", { precision: 10, scale: 2 }).notNull(),
  egysegar: decimal("egysegar", { precision: 12, scale: 2 }).notNull(),
  afaKulcs: integer("afa_kulcs").notNull(),
});

export const alkatreszek = pgTable("alkatreszek", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  cikkszam: text("cikkszam").notNull(),
  megnevezes: text("megnevezes").notNull(),
  beszerzesiAr: decimal("beszerzesi_ar", { precision: 12, scale: 2 }).notNull(),
  eladasiAr: decimal("eladasi_ar", { precision: 12, scale: 2 }).notNull(),
  keszletMennyiseg: integer("keszlet_mennyiseg").notNull().default(0),
});

export const idopontok = pgTable("idopontok", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  jarmuId: uuid("jarmu_id")
    .notNull()
    .references(() => jarmuvek.id, { onDelete: "cascade" }),
  ugyfelId: uuid("ugyfel_id")
    .notNull()
    .references(() => ugyfelek.id, { onDelete: "cascade" }),
  idopont: timestamp("idopont", { withTimezone: true }).notNull(),
  tipus: idopontTipusEnum("tipus").notNull().default("foglalas"),
  statusz: idopontStatuszEnum("statusz").notNull().default("fuggoben"),
});

export const szamlak = pgTable("szamlak", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  munkalapId: uuid("munkalap_id")
    .notNull()
    .references(() => munkalapok.id, { onDelete: "cascade" }),
  kulsoSzamlaId: text("kulso_szamla_id").notNull(),
  szamlaszam: text("szamlaszam").notNull(),
  brutto: decimal("brutto", { precision: 12, scale: 2 }).notNull(),
  afa: decimal("afa", { precision: 12, scale: 2 }).notNull(),
  fizetve: boolean("fizetve").notNull().default(false),
  kelt: timestamp("kelt", { withTimezone: true }).notNull().defaultNow(),
});

export const ertesitesek = pgTable("ertesitesek", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  ugyfelId: uuid("ugyfel_id")
    .notNull()
    .references(() => ugyfelek.id, { onDelete: "cascade" }),
  csatorna: ertesitesCsatornaEnum("csatorna").notNull(),
  tipus: text("tipus").notNull(),
  kuldve: timestamp("kuldve", { withTimezone: true }).notNull().defaultNow(),
  statusz: ertesitesStatuszEnum("statusz").notNull().default("naplozva"),
});

export const ugyfelekRelations = relations(ugyfelek, ({ many }) => ({
  jarmuvek: many(jarmuvek),
  munkalapok: many(munkalapok),
}));

export const jarmuvekRelations = relations(jarmuvek, ({ one, many }) => ({
  ugyfel: one(ugyfelek, { fields: [jarmuvek.ugyfelId], references: [ugyfelek.id] }),
  munkalapok: many(munkalapok),
}));

export const munkalapokRelations = relations(munkalapok, ({ one, many }) => ({
  jarmu: one(jarmuvek, { fields: [munkalapok.jarmuId], references: [jarmuvek.id] }),
  ugyfel: one(ugyfelek, { fields: [munkalapok.ugyfelId], references: [ugyfelek.id] }),
  szerelo: one(felhasznalok, { fields: [munkalapok.szereloId], references: [felhasznalok.id] }),
  tetelek: many(munkalapTetelek),
  szamlak: many(szamlak),
}));

export const munkalapTetelekRelations = relations(munkalapTetelek, ({ one }) => ({
  munkalap: one(munkalapok, {
    fields: [munkalapTetelek.munkalapId],
    references: [munkalapok.id],
  }),
}));
