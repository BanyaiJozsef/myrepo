import { expect, test } from "@playwright/test";
import { signLicense } from "@autoszerv/license";
import { E2E_LICENSE_PRIVATE_KEY } from "../playwright.config";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function registerUj(page: import("@playwright/test").Page, email: string) {
  await page.goto("/regisztracio");
  await page.getByLabel("Szerviz neve").fill("Playwright Teszt Szerviz");
  await page.getByLabel("Neved").fill("Teszt Elek");
  await page.getByLabel("E-mail cím").fill(email);
  await page.getByLabel("Jelszó").fill("Titkosjelszo123!");
  await page.getByRole("button", { name: "Demó indítása" }).click();
  await expect(page).toHaveURL(/\/ugyfelek$/);
}

test.describe("Regisztráció → demó tenant → ügyfél + jármű felvitel", () => {
  test("a new signup lands in an empty demo account and can add a customer and a vehicle", async ({
    page,
  }) => {
    await registerUj(page, uniqueEmail("demo-signup"));

    await expect(page.getByText("Még nincs felvéve egyetlen ügyfél sem.")).toBeVisible();

    await page.getByRole("button", { name: "Új ügyfél" }).click();
    await page.getByLabel("Név").fill("Nagy Béla");
    await page.getByLabel("Telefon").fill("+36201112233");
    await page.getByLabel("GDPR adatkezelési hozzájárulás megadva").check();
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("Nagy Béla")).toBeVisible();

    await page.getByRole("link", { name: "Járművek" }).click();
    await page.getByRole("button", { name: "Új jármű" }).click();
    await page.getByLabel("Rendszám").fill("ABC-123");
    await page.getByLabel("Gyártmány").fill("Suzuki");
    await page.getByLabel("Típus").fill("Swift");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("ABC-123")).toBeVisible();
  });
});

test.describe("Munkalap → árajánlat → számla folyamat", () => {
  test("a work order can be created, get a line item, move through its states, and be invoiced", async ({
    page,
  }) => {
    await registerUj(page, uniqueEmail("munkalap-flow"));

    await page.getByRole("button", { name: "Új ügyfél" }).click();
    await page.getByLabel("Név").fill("Kovács Ilona");
    await page.getByLabel("GDPR adatkezelési hozzájárulás megadva").check();
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("Kovács Ilona")).toBeVisible();

    await page.getByRole("link", { name: "Járművek" }).click();
    await page.getByRole("button", { name: "Új jármű" }).click();
    await page.getByLabel("Rendszám").fill("XYZ-999");
    await page.getByLabel("Gyártmány").fill("Opel");
    await page.getByLabel("Típus").fill("Astra");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("XYZ-999")).toBeVisible();

    await page.getByRole("link", { name: "Munkalapok" }).click();
    await page.getByRole("button", { name: "Új munkalap" }).click();
    await page.getByLabel("Hibaleírás").fill("Olajcsere szükséges.");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("Olajcsere szükséges.")).toBeVisible();

    const kartya = page.locator("li", { hasText: "Olajcsere szükséges." });
    await kartya.getByLabel("Tétel megnevezése").fill("Olajcsere munkadíj");
    await kartya.getByLabel("Mennyiség").fill("1");
    await kartya.getByLabel("Egységár").fill("15000");
    await kartya.getByRole("button", { name: "+ Tétel" }).click();

    await kartya.getByRole("button", { name: "→ Folyamatban" }).click();
    await expect(kartya.getByText("Folyamatban")).toBeVisible();
    await kartya.getByRole("button", { name: "→ Kész" }).click();
    await expect(kartya.getByText("Kész")).toBeVisible();

    await kartya.getByRole("button", { name: "Számla generálása" }).click();
    await expect(kartya.getByText(/Számla: DEMO-/)).toBeVisible();
    await expect(kartya.getByText("(DEMO)")).toBeVisible();
  });
});

test.describe("Licenc aktiválás: demó → éles", () => {
  test("activating a validly signed license switches the tenant from demo to live", async ({ page }) => {
    const email = uniqueEmail("license-activation");
    await registerUj(page, email);

    await page.getByRole("link", { name: "Beállítások" }).click();
    await expect(page.getByText("Demó mód")).toBeVisible();

    // The tenant id isn't exposed anywhere in the DOM, so read it straight from the
    // /license response the Settings page itself just triggered.
    const [licenseCallResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/license") && res.request().method() === "GET"),
      page.reload(),
    ]);
    const licenseBody = (await licenseCallResponse.json()) as { tenant: { id: string } };
    const tenantId = licenseBody.tenant.id;

    const licenseKey = signLicense(
      {
        tenant_id: tenantId,
        plan: "pro",
        features: ["invoicing"],
        max_users: 5,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      },
      E2E_LICENSE_PRIVATE_KEY,
    );

    await page.getByLabel("Licenckulcs").fill(licenseKey);
    await page.getByRole("button", { name: "Aktiválás" }).click();

    await expect(page.getByText("A licenc sikeresen aktiválva!")).toBeVisible();
    await expect(page.getByText("Aktív licenc")).toBeVisible();
  });
});
