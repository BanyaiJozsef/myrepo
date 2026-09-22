import type { MunkalapStatusz } from "./enums.js";

/**
 * Forward-only work order state machine: felvett -> folyamatban -> kesz -> lezart.
 * No skipping stages and no going backwards once closed (lezart is terminal).
 */
const ATMENETEK: Record<MunkalapStatusz, readonly MunkalapStatusz[]> = {
  felvett: ["folyamatban"],
  folyamatban: ["kesz"],
  kesz: ["lezart", "folyamatban"],
  lezart: [],
};

export function ervenyesAtmenetE(jelenlegi: MunkalapStatusz, kovetkezo: MunkalapStatusz): boolean {
  return ATMENETEK[jelenlegi].includes(kovetkezo);
}

export function kovetkezoAllapotok(jelenlegi: MunkalapStatusz): readonly MunkalapStatusz[] {
  return ATMENETEK[jelenlegi];
}

export class ErvenytelenAllapotAtmenetHiba extends Error {
  constructor(jelenlegi: MunkalapStatusz, kovetkezo: MunkalapStatusz) {
    super(`Érvénytelen státuszváltás: ${jelenlegi} -> ${kovetkezo}`);
    this.name = "ErvenytelenAllapotAtmenetHiba";
  }
}

export function valtasMunkalapStatusz(
  jelenlegi: MunkalapStatusz,
  kovetkezo: MunkalapStatusz,
): MunkalapStatusz {
  if (!ervenyesAtmenetE(jelenlegi, kovetkezo)) {
    throw new ErvenytelenAllapotAtmenetHiba(jelenlegi, kovetkezo);
  }
  return kovetkezo;
}
