import type { MunkalapTetelInput } from "@autoszerv/shared-types";

export interface SzamlaVevo {
  nev: string;
  adoszam?: string;
  cim?: string;
  email?: string;
}

export interface CreateInvoiceRequest {
  munkalapId: string;
  vevo: SzamlaVevo;
  tetelek: readonly MunkalapTetelInput[];
  fizetesiMod: "keszpenz" | "atutalas" | "bankkartya";
}

export interface CreateInvoiceResult {
  /** Id assigned by the external invoicing service (or the mock, in demo mode). */
  kulsoSzamlaId: string;
  szamlaszam: string;
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  kelt: Date;
  /** True when this was produced by MockInvoiceProvider (demo mode) rather than a real provider. */
  demo: boolean;
}

/**
 * Common interface every invoicing backend (Számlázz.hu, Billingo, mock) implements.
 * The rest of the app talks only to this interface, never to a provider's SDK directly.
 */
export interface InvoiceProvider {
  readonly nev: string;
  createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResult>;
  getInvoicePdf(kulsoSzamlaId: string): Promise<Buffer>;
  cancelInvoice(kulsoSzamlaId: string): Promise<void>;
}
