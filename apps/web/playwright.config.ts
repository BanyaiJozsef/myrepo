import { defineConfig, devices } from "@playwright/test";

/**
 * Test-only Ed25519 keypair, used exclusively by the E2E suite to sign/verify license
 * keys against a throwaway API instance. Never used for a real deployment — see
 * docs/adr/0001-scope-for-this-session.md.
 */
export const E2E_LICENSE_PUBLIC_KEY = "MCowBQYDK2VwAyEAleaFh9oA5hYKtEnqvkAp6jQbwl9wXOvAaCFmRYNJC3c";
export const E2E_LICENSE_PRIVATE_KEY = "MC4CAQAwBQYDK2VwBCIEILLvf3K62d9gnZv1SkG9hL-R6RnhczJRO1BHd96UIoO4";

const API_PORT = 3098;
const WEB_PORT = 5183;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://autoszerv:autoszerv@localhost:5432/autoszerv_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set only in environments that pin a pre-installed browser build rather than
        // letting Playwright download its own (see README's E2E section).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: "node ../../packages/db/dist/migrate.js && node ../../packages/db/dist/seed.js && node dist/server.js",
      cwd: "../api",
      port: API_PORT,
      env: {
        DATABASE_URL,
        JWT_ACCESS_SECRET: "e2e-access-secret-not-for-production-use-only",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-not-for-production-use-only",
        LICENSE_PUBLIC_KEY: E2E_LICENSE_PUBLIC_KEY,
        INVOICE_PROVIDER: "mock",
        API_PORT: String(API_PORT),
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "pnpm vite --port " + WEB_PORT,
      port: WEB_PORT,
      env: { VITE_API_BASE_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
