import { describe, expect, it } from "vitest";
import { MockInvoiceProvider } from "./mock-provider.js";
import type { CreateInvoiceRequest } from "./types.js";

const request: CreateInvoiceRequest = {
  munkalapId: "11111111-1111-1111-1111-111111111111",
  vevo: { nev: "Teszt Elek" },
  tetelek: [{ tipus: "munka", megnevezes: "Olajcsere", mennyiseg: 1, egysegar: 15000, afaKulcs: 27 }],
  fizetesiMod: "keszpenz",
};

describe("MockInvoiceProvider", () => {
  it("never calls a real network endpoint and marks the invoice as demo", async () => {
    const provider = new MockInvoiceProvider();
    const result = await provider.createInvoice(request);
    expect(result.demo).toBe(true);
    expect(result.szamlaszam).toMatch(/^DEMO-/);
    expect(result.bruttoOsszeg).toBe(19050);
  });

  it("watermarks the generated document", async () => {
    const provider = new MockInvoiceProvider();
    const { kulsoSzamlaId } = await provider.createInvoice(request);
    const pdf = await provider.getInvoicePdf(kulsoSzamlaId);
    expect(pdf.toString("utf8")).toContain("DEMO - NEM ELES SZAMLA");
  });

  it("throws for an unknown invoice id", async () => {
    const provider = new MockInvoiceProvider();
    await expect(provider.getInvoicePdf("unknown")).rejects.toThrow();
    await expect(provider.cancelInvoice("unknown")).rejects.toThrow();
  });

  it("cancels a known invoice", async () => {
    const provider = new MockInvoiceProvider();
    const { kulsoSzamlaId } = await provider.createInvoice(request);
    await expect(provider.cancelInvoice(kulsoSzamlaId)).resolves.toBeUndefined();
    await expect(provider.getInvoicePdf(kulsoSzamlaId)).rejects.toThrow();
  });
});
