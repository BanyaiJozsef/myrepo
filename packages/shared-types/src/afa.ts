import type { MunkalapTetelInput } from "./schemas.js";

export interface TetelOsszeg {
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
}

/** Rounds to 2 decimals using round-half-up, avoiding binary float drift on money. */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function szamolTetelOsszeg(tetel: Pick<MunkalapTetelInput, "mennyiseg" | "egysegar" | "afaKulcs">): TetelOsszeg {
  const nettoOsszeg = roundMoney(tetel.mennyiseg * tetel.egysegar);
  const afaOsszeg = roundMoney(nettoOsszeg * (tetel.afaKulcs / 100));
  const bruttoOsszeg = roundMoney(nettoOsszeg + afaOsszeg);
  return { nettoOsszeg, afaOsszeg, bruttoOsszeg };
}

export interface MunkalapOsszesito extends TetelOsszeg {
  tetelekSzama: number;
}

export function szamolMunkalapOsszesito(
  tetelek: readonly Pick<MunkalapTetelInput, "mennyiseg" | "egysegar" | "afaKulcs">[],
): MunkalapOsszesito {
  return tetelek.reduce<MunkalapOsszesito>(
    (acc, tetel) => {
      const { nettoOsszeg, afaOsszeg, bruttoOsszeg } = szamolTetelOsszeg(tetel);
      return {
        nettoOsszeg: roundMoney(acc.nettoOsszeg + nettoOsszeg),
        afaOsszeg: roundMoney(acc.afaOsszeg + afaOsszeg),
        bruttoOsszeg: roundMoney(acc.bruttoOsszeg + bruttoOsszeg),
        tetelekSzama: acc.tetelekSzama + 1,
      };
    },
    { nettoOsszeg: 0, afaOsszeg: 0, bruttoOsszeg: 0, tetelekSzama: 0 },
  );
}
