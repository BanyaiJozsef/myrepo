import { BillingoInvoiceProvider } from "./billingo-provider.js";
import { MockInvoiceProvider } from "./mock-provider.js";
import { SzamlazzHuInvoiceProvider } from "./szamlazzhu-provider.js";
import type { InvoiceProvider } from "./types.js";

export type InvoiceProviderKind = "mock" | "szamlazzhu" | "billingo";

export interface InvoiceProviderFactoryConfig {
  kind: InvoiceProviderKind;
  szamlazzHuAgentKey?: string;
  billingoApiKey?: string;
  billingoBlockId?: number;
}

/** Demo tenants are always forced onto the mock provider regardless of config. */
export function createInvoiceProvider(config: InvoiceProviderFactoryConfig): InvoiceProvider {
  switch (config.kind) {
    case "mock":
      return new MockInvoiceProvider();
    case "szamlazzhu":
      if (!config.szamlazzHuAgentKey) {
        throw new Error("SZAMLAZZHU_AGENT_KEY hiányzik.");
      }
      return new SzamlazzHuInvoiceProvider({ agentKey: config.szamlazzHuAgentKey });
    case "billingo":
      if (!config.billingoApiKey || !config.billingoBlockId) {
        throw new Error("BILLINGO_API_KEY vagy blockId hiányzik.");
      }
      return new BillingoInvoiceProvider({
        apiKey: config.billingoApiKey,
        blockId: config.billingoBlockId,
      });
  }
}
