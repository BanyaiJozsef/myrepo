import { randomUUID } from "node:crypto";
import { szamolMunkalapOsszesito } from "@autoszerv/shared-types";
import type { CreateInvoiceRequest, CreateInvoiceResult, InvoiceProvider } from "./types.js";

interface StoredMockInvoice extends CreateInvoiceResult {
  vevoNev: string;
}

/**
 * Used in demo mode and in tests: never calls a real invoicing API, never sends anything
 * externally, and every generated document is watermarked so it can't pass as a real invoice.
 */
export class MockInvoiceProvider implements InvoiceProvider {
  readonly nev = "mock";
  private readonly szamlak = new Map<string, StoredMockInvoice>();
  private sorszam = 1;

  async createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResult> {
    const osszesito = szamolMunkalapOsszesito(request.tetelek);
    const kulsoSzamlaId = randomUUID();
    const evNumber = new Date().getFullYear();
    const szamlaszam = `DEMO-${evNumber}-${String(this.sorszam).padStart(4, "0")}`;
    this.sorszam += 1;

    const eredmeny: StoredMockInvoice = {
      kulsoSzamlaId,
      szamlaszam,
      nettoOsszeg: osszesito.nettoOsszeg,
      afaOsszeg: osszesito.afaOsszeg,
      bruttoOsszeg: osszesito.bruttoOsszeg,
      kelt: new Date(),
      demo: true,
      vevoNev: request.vevo.nev,
    };
    this.szamlak.set(kulsoSzamlaId, eredmeny);
    return eredmeny;
  }

  async getInvoicePdf(kulsoSzamlaId: string): Promise<Buffer> {
    const szamla = this.szamlak.get(kulsoSzamlaId);
    if (!szamla) {
      throw new Error(`Ismeretlen demó számla azonosító: ${kulsoSzamlaId}`);
    }
    // Plain-text stand-in for a PDF. Real PDF rendering (with the required diagonal
    // "DEMO - NEM ELES SZAMLA" watermark) is tracked in docs/adr/0002-invoice-pdf-rendering.md.
    const content = [
      "=== DEMO - NEM ELES SZAMLA ===",
      `Szamlaszam: ${szamla.szamlaszam}`,
      `Vevo: ${szamla.vevoNev}`,
      `Netto: ${szamla.nettoOsszeg} Ft`,
      `Afa: ${szamla.afaOsszeg} Ft`,
      `Brutto: ${szamla.bruttoOsszeg} Ft`,
      `Kelt: ${szamla.kelt.toISOString()}`,
      "=== DEMO - NEM ELES SZAMLA ===",
    ].join("\n");
    return Buffer.from(content, "utf8");
  }

  async cancelInvoice(kulsoSzamlaId: string): Promise<void> {
    if (!this.szamlak.delete(kulsoSzamlaId)) {
      throw new Error(`Ismeretlen demó számla azonosító: ${kulsoSzamlaId}`);
    }
  }
}
