import { describe, expect, it } from "vitest";
import { szamolMunkalapOsszesito, szamolTetelOsszeg } from "./afa.js";

describe("szamolTetelOsszeg", () => {
  it("calculates net/vat/gross for a standard 27% item", () => {
    const result = szamolTetelOsszeg({ mennyiseg: 2, egysegar: 1000, afaKulcs: 27 });
    expect(result).toEqual({ nettoOsszeg: 2000, afaOsszeg: 540, bruttoOsszeg: 2540 });
  });

  it("handles 0% VAT", () => {
    const result = szamolTetelOsszeg({ mennyiseg: 1, egysegar: 500, afaKulcs: 0 });
    expect(result).toEqual({ nettoOsszeg: 500, afaOsszeg: 0, bruttoOsszeg: 500 });
  });

  it("rounds fractional quantities/prices to 2 decimals", () => {
    const result = szamolTetelOsszeg({ mennyiseg: 1.5, egysegar: 333.33, afaKulcs: 5 });
    expect(result.nettoOsszeg).toBeCloseTo(499.995, 2);
    expect(result.afaOsszeg).toBeCloseTo(result.nettoOsszeg * 0.05, 2);
  });
});

describe("szamolMunkalapOsszesito", () => {
  it("sums multiple line items", () => {
    const result = szamolMunkalapOsszesito([
      { mennyiseg: 1, egysegar: 10000, afaKulcs: 27 },
      { mennyiseg: 2, egysegar: 5000, afaKulcs: 27 },
    ]);
    expect(result.tetelekSzama).toBe(2);
    expect(result.nettoOsszeg).toBe(20000);
    expect(result.afaOsszeg).toBe(5400);
    expect(result.bruttoOsszeg).toBe(25400);
  });

  it("returns zeros for an empty item list", () => {
    const result = szamolMunkalapOsszesito([]);
    expect(result).toEqual({ nettoOsszeg: 0, afaOsszeg: 0, bruttoOsszeg: 0, tetelekSzama: 0 });
  });
});
