export const TENANT_ALLAPOTOK = ["demo", "aktiv", "lejart"] as const;
export type TenantAllapot = (typeof TENANT_ALLAPOTOK)[number];

export const FELHASZNALO_SZEREPEK = ["tulaj", "recepcio", "szerelo"] as const;
export type FelhasznaloSzerep = (typeof FELHASZNALO_SZEREPEK)[number];

export const LICENSE_PLANOK = ["starter", "pro", "enterprise"] as const;
export type LicensePlan = (typeof LICENSE_PLANOK)[number];

export const LICENSE_FEATURES = [
  "invoicing",
  "sms",
  "inventory",
  "multi_location",
] as const;
export type LicenseFeature = (typeof LICENSE_FEATURES)[number];

/** Work order lifecycle: felvett -> folyamatban -> kesz -> lezart (forward-only). */
export const MUNKALAP_STATUSZOK = ["felvett", "folyamatban", "kesz", "lezart"] as const;
export type MunkalapStatusz = (typeof MUNKALAP_STATUSZOK)[number];

export const MUNKALAP_TETEL_TIPUSOK = ["munka", "alkatresz"] as const;
export type MunkalapTetelTipus = (typeof MUNKALAP_TETEL_TIPUSOK)[number];

export const AFA_KULCSOK = [0, 5, 18, 27] as const;
export type AfaKulcs = (typeof AFA_KULCSOK)[number];
