import { z } from "zod";
import {
  AFA_KULCSOK,
  FELHASZNALO_SZEREPEK,
  LICENSE_FEATURES,
  LICENSE_PLANOK,
  MUNKALAP_STATUSZOK,
  MUNKALAP_TETEL_TIPUSOK,
  TENANT_ALLAPOTOK,
} from "./enums.js";

export const uuidSchema = z.string().uuid();

export const tenantSchema = z.object({
  id: uuidSchema,
  nev: z.string().min(1).max(200),
  allapot: z.enum(TENANT_ALLAPOTOK),
  letrehozva: z.coerce.date(),
});
export type Tenant = z.infer<typeof tenantSchema>;

export const felhasznaloSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  nev: z.string().min(1).max(200),
  email: z.string().email(),
  szerep: z.enum(FELHASZNALO_SZEREPEK),
});
export type Felhasznalo = z.infer<typeof felhasznaloSchema>;

export const ugyfelInputSchema = z.object({
  nev: z.string().min(1, "A név megadása kötelező.").max(200),
  tipus: z.enum(["maganszemely", "ceg"]),
  adoszam: z.string().max(20).optional(),
  cim: z.string().max(300).optional(),
  telefon: z.string().max(30).optional(),
  email: z.string().email("Érvénytelen e-mail cím.").optional().or(z.literal("")),
  gdprHozzajarulas: z.boolean(),
});
export type UgyfelInput = z.infer<typeof ugyfelInputSchema>;

export const ugyfelSchema = ugyfelInputSchema.extend({
  id: uuidSchema,
  tenantId: uuidSchema,
  letrehozva: z.coerce.date(),
});
export type Ugyfel = z.infer<typeof ugyfelSchema>;

export const rendszamRegex = /^[A-Z]{2,3}-?[0-9]{2,3}$/;

export const jarmuInputSchema = z.object({
  ugyfelId: uuidSchema,
  rendszam: z
    .string()
    .min(1, "A rendszám megadása kötelező.")
    .max(15)
    .transform((v) => v.toUpperCase().replace(/\s+/g, "")),
  alvazszam: z.string().max(30).optional(),
  gyartmany: z.string().min(1).max(60),
  tipus: z.string().min(1).max(60),
  evjarat: z.coerce.number().int().min(1900).max(2100).optional(),
  kmOra: z.coerce.number().int().min(0).optional(),
  muszakiLejarat: z.coerce.date().optional(),
});
export type JarmuInput = z.infer<typeof jarmuInputSchema>;

export const jarmuSchema = jarmuInputSchema.extend({
  id: uuidSchema,
  tenantId: uuidSchema,
});
export type Jarmu = z.infer<typeof jarmuSchema>;

export const munkalapTetelInputSchema = z.object({
  tipus: z.enum(MUNKALAP_TETEL_TIPUSOK),
  megnevezes: z.string().min(1).max(200),
  mennyiseg: z.coerce.number().positive(),
  egysegar: z.coerce.number().nonnegative(),
  afaKulcs: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(18),
    z.literal(27),
  ]) satisfies z.ZodType<(typeof AFA_KULCSOK)[number]>,
});
export type MunkalapTetelInput = z.infer<typeof munkalapTetelInputSchema>;

export const munkalapTetelSchema = munkalapTetelInputSchema.extend({
  id: uuidSchema,
  munkalapId: uuidSchema,
});
export type MunkalapTetel = z.infer<typeof munkalapTetelSchema>;

export const munkalapInputSchema = z.object({
  jarmuId: uuidSchema,
  ugyfelId: uuidSchema,
  hibaleiras: z.string().min(1, "A hibaleírás megadása kötelező.").max(2000),
  szereloId: uuidSchema.optional(),
  tipus: z.enum(["arajanlat", "munka"]),
});
export type MunkalapInput = z.infer<typeof munkalapInputSchema>;

export const munkalapSchema = munkalapInputSchema.extend({
  id: uuidSchema,
  tenantId: uuidSchema,
  statusz: z.enum(MUNKALAP_STATUSZOK),
  felvetelDatum: z.coerce.date(),
});
export type Munkalap = z.infer<typeof munkalapSchema>;

export const licensePayloadSchema = z.object({
  tenant_id: uuidSchema,
  plan: z.enum(LICENSE_PLANOK),
  features: z.array(z.enum(LICENSE_FEATURES)),
  max_users: z.number().int().positive(),
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});
export type LicensePayload = z.infer<typeof licensePayloadSchema>;

export const registerInputSchema = z.object({
  szervizNev: z.string().min(1, "A szerviz nevének megadása kötelező.").max(200),
  nev: z.string().min(1, "A név megadása kötelező.").max(200),
  email: z.string().email("Érvénytelen e-mail cím."),
  jelszo: z.string().min(8, "A jelszónak legalább 8 karakter hosszúnak kell lennie."),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  jelszo: z.string().min(8, "A jelszónak legalább 8 karakter hosszúnak kell lennie."),
});
export type LoginInput = z.infer<typeof loginInputSchema>;
