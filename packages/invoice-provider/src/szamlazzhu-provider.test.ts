import { describe, expect, it, vi } from "vitest";
import { SzamlazzHuInvoiceProvider } from "./szamlazzhu-provider.js";
import type { CreateInvoiceRequest } from "./types.js";

const request: CreateInvoiceRequest = {
  munkalapId: "11111111-1111-1111-1111-111111111111",
  vevo: { nev: "Teszt Kft.", adoszam: "12345678-1-42" },
  tetelek: [{ tipus: "alkatresz", megnevezes: "Fékbetét", mennyiseg: 2, egysegar: 8000, afaKulcs: 27 }],
  fizetesiMod: "atutalas",
};

describe("SzamlazzHuInvoiceProvider", () => {
  it("posts XML to the configured endpoint and parses the invoice number header", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(null, { status: 200, headers: { szlahu_szamlaszam: "SZLAHU-2026-001" } }),
    ) as unknown as typeof fetch;

    const provider = new SzamlazzHuInvoiceProvider({ agentKey: "test-key", fetchImpl });
    const result = await provider.createInvoice(request);

    expect(result.demo).toBe(false);
    expect(result.szamlaszam).toBe("SZLAHU-2026-001");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("Teszt Kft.");
  });

  it("throws when the API responds with a non-2xx status", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch;
    const provider = new SzamlazzHuInvoiceProvider({ agentKey: "test-key", fetchImpl });

    await expect(provider.createInvoice(request)).rejects.toThrow(/HTTP 500/);
  });

  it("throws when the response is missing the invoice number header", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const provider = new SzamlazzHuInvoiceProvider({ agentKey: "test-key", fetchImpl });

    await expect(provider.createInvoice(request)).rejects.toThrow(/hiányos/);
  });
});
