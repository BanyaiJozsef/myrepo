import type { CreateInvoiceRequest, CreateInvoiceResult, InvoiceProvider } from "./types.js";
import { szamolMunkalapOsszesito, szamolTetelOsszeg } from "@autoszerv/shared-types";

export interface SzamlazzHuConfig {
  agentKey: string;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

function buildInvoiceXml(request: CreateInvoiceRequest, agentKey: string): string {
  const tetelXmlList = request.tetelek
    .map((tetel) => {
      const { nettoOsszeg, afaOsszeg, bruttoOsszeg } = szamolTetelOsszeg(tetel);
      return `
        <tetel>
          <megnevezes>${escapeXml(tetel.megnevezes)}</megnevezes>
          <mennyiseg>${tetel.mennyiseg}</mennyiseg>
          <mennyisegiEgyseg>db</mennyisegiEgyseg>
          <nettoEgysegar>${tetel.egysegar}</nettoEgysegar>
          <afakulcs>${tetel.afaKulcs}</afakulcs>
          <nettoErtek>${nettoOsszeg}</nettoErtek>
          <afaErtek>${afaOsszeg}</afaErtek>
          <bruttoErtek>${bruttoOsszeg}</bruttoErtek>
        </tetel>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <beallitasok>
    <szamlaagentkulcs>${escapeXml(agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <fizmod>${request.fizetesiMod}</fizmod>
    <penznem>HUF</penznem>
  </fejlec>
  <vevo>
    <nev>${escapeXml(request.vevo.nev)}</nev>
    ${request.vevo.adoszam ? `<adoszam>${escapeXml(request.vevo.adoszam)}</adoszam>` : ""}
    ${request.vevo.cim ? `<cim>${escapeXml(request.vevo.cim)}</cim>` : ""}
    ${request.vevo.email ? `<email>${escapeXml(request.vevo.email)}</email>` : ""}
  </vevo>
  <tetelek>${tetelXmlList}</tetelek>
</xmlszamla>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Adapter around the Számlázz.hu "Számla Agent" HTTP/XML API.
 * See docs/adr/0002-invoice-pdf-rendering.md for known simplifications versus the full API.
 */
export class SzamlazzHuInvoiceProvider implements InvoiceProvider {
  readonly nev = "szamlazz.hu";
  private readonly config: Required<Omit<SzamlazzHuConfig, "fetchImpl">> & {
    fetchImpl: typeof fetch;
  };

  constructor(config: SzamlazzHuConfig) {
    this.config = {
      agentKey: config.agentKey,
      endpoint: config.endpoint ?? "https://www.szamlazz.hu/szamla/",
      fetchImpl: config.fetchImpl ?? fetch,
    };
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResult> {
    const xml = buildInvoiceXml(request, this.config.agentKey);
    const response = await this.config.fetchImpl(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`Számlázz.hu hiba: HTTP ${response.status}`);
    }

    const szamlaszam = response.headers.get("szlahu_szamlaszam");
    if (!szamlaszam) {
      throw new Error("Számlázz.hu válasz hiányos: nincs számlaszám.");
    }

    const osszesito = szamolMunkalapOsszesito(request.tetelek);
    return {
      kulsoSzamlaId: szamlaszam,
      szamlaszam,
      nettoOsszeg: osszesito.nettoOsszeg,
      afaOsszeg: osszesito.afaOsszeg,
      bruttoOsszeg: osszesito.bruttoOsszeg,
      kelt: new Date(),
      demo: false,
    };
  }

  async getInvoicePdf(kulsoSzamlaId: string): Promise<Buffer> {
    const response = await this.config.fetchImpl(
      `${this.config.endpoint}?action=szamla_agent_pdf&szamlaszam=${encodeURIComponent(kulsoSzamlaId)}`,
      { headers: { "X-Agent-Key": this.config.agentKey } },
    );
    if (!response.ok) {
      throw new Error(`Számlázz.hu PDF letöltési hiba: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async cancelInvoice(kulsoSzamlaId: string): Promise<void> {
    const response = await this.config.fetchImpl(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: `<?xml version="1.0" encoding="UTF-8"?><xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast"><beallitasok><szamlaagentkulcs>${escapeXml(this.config.agentKey)}</szamlaagentkulcs></beallitasok><fejlec><szamlaszam>${escapeXml(kulsoSzamlaId)}</szamlaszam></fejlec></xmlszamlast>`,
    });
    if (!response.ok) {
      throw new Error(`Számlázz.hu sztornó hiba: HTTP ${response.status}`);
    }
  }
}
