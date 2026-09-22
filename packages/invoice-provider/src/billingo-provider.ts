import { szamolMunkalapOsszesito } from "@autoszerv/shared-types";
import type { CreateInvoiceRequest, CreateInvoiceResult, InvoiceProvider } from "./types.js";

export interface BillingoConfig {
  apiKey: string;
  blockId: number;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

/** Adapter around the Billingo v3 REST API. Secondary provider — Számlázz.hu is the default. */
export class BillingoInvoiceProvider implements InvoiceProvider {
  readonly nev = "billingo";
  private readonly config: Required<Omit<BillingoConfig, "fetchImpl">> & { fetchImpl: typeof fetch };

  constructor(config: BillingoConfig) {
    this.config = {
      apiKey: config.apiKey,
      blockId: config.blockId,
      endpoint: config.endpoint ?? "https://api.billingo.hu/v3",
      fetchImpl: config.fetchImpl ?? fetch,
    };
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResult> {
    const response = await this.config.fetchImpl(`${this.config.endpoint}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": this.config.apiKey },
      body: JSON.stringify({
        partner: { name: request.vevo.nev, address: { post_code: "", city: "", address: request.vevo.cim ?? "" }, taxcode: request.vevo.adoszam, emails: request.vevo.email ? [request.vevo.email] : [] },
        block_id: this.config.blockId,
        type: "invoice",
        payment_method: request.fizetesiMod === "keszpenz" ? "cash" : "wire_transfer",
        items: request.tetelek.map((tetel) => ({
          name: tetel.megnevezes,
          quantity: tetel.mennyiseg,
          unit_price: tetel.egysegar,
          vat: `${tetel.afaKulcs}%`,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Billingo hiba: HTTP ${response.status}`);
    }
    const body = (await response.json()) as { id: number; invoice_number: string };

    const osszesito = szamolMunkalapOsszesito(request.tetelek);
    return {
      kulsoSzamlaId: String(body.id),
      szamlaszam: body.invoice_number,
      nettoOsszeg: osszesito.nettoOsszeg,
      afaOsszeg: osszesito.afaOsszeg,
      bruttoOsszeg: osszesito.bruttoOsszeg,
      kelt: new Date(),
      demo: false,
    };
  }

  async getInvoicePdf(kulsoSzamlaId: string): Promise<Buffer> {
    const response = await this.config.fetchImpl(
      `${this.config.endpoint}/documents/${encodeURIComponent(kulsoSzamlaId)}/download`,
      { headers: { "X-API-KEY": this.config.apiKey } },
    );
    if (!response.ok) {
      throw new Error(`Billingo PDF letöltési hiba: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async cancelInvoice(kulsoSzamlaId: string): Promise<void> {
    const response = await this.config.fetchImpl(
      `${this.config.endpoint}/documents/${encodeURIComponent(kulsoSzamlaId)}/cancel`,
      { method: "POST", headers: { "X-API-KEY": this.config.apiKey } },
    );
    if (!response.ok) {
      throw new Error(`Billingo sztornó hiba: HTTP ${response.status}`);
    }
  }
}
