import { describe, expect, it } from "vitest";
import { MockInvoiceProvider } from "@autoszerv/invoice-provider";
import type { Database } from "@autoszerv/db";
import { buildApp } from "./app.js";

// The health route never touches the database, so an untyped stub is enough here —
// full CRUD route behavior against a real Postgres is covered by Playwright E2E (see
// docs/adr/0001-scope-for-this-session.md for what's deferred there).
const fakeDb = {} as Database;

async function buildTestApp() {
  return buildApp({
    db: fakeDb,
    invoiceProvider: new MockInvoiceProvider(),
    licensePublicKey: "unused-in-this-test",
    corsOrigin: "http://localhost:5173",
    jwt: {
      accessSecret: "a".repeat(32),
      refreshSecret: "b".repeat(32),
      accessTtl: "15m",
      refreshTtl: "30d",
    },
  });
}

describe("app wiring", () => {
  it("responds ok on /health", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("rejects protected routes without a bearer token", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/ugyfelek" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("rejects protected routes with a garbage bearer token", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/ugyfelek",
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("rejects login with malformed credentials before touching the database", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "not-an-email", jelszo: "short" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
