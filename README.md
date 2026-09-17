# Autószerv

Felhőalapú, multi-tenant ügyfél- és munkanyilvántartó rendszer magyar autószervizeknek.
Demo módban indul minden szerviz, majd egy Ed25519-aláírt licenckulccsal váltható élesre —
szerverhez fordulás (phone-home) nélkül.

## Tartalomjegyzék

- [Architektúra](#architektúra)
- [Helyi indítás](#helyi-indítás)
- [Tesztelés](#tesztelés)
- [Licenckulcs-generálás](#licenckulcs-generálás)
- [Deploy](#deploy)
- [Mi van kész, és mi nincs](#mi-van-kész-és-mi-nincs)

## Architektúra

pnpm workspaces + Turborepo monorepo:

```
apps/
  web/      React 18 + Vite + TypeScript + Tailwind, PWA (vite-plugin-pwa), TanStack Query,
            React Hook Form + Zod, React Router, react-i18next
  api/      Fastify + TypeScript, Zod validáció, Argon2id + JWT (jose) auth,
            Postgres RLS-alapú tenant-izoláció
packages/
  shared-types/     Zod sémák és TS típusok (frontend + backend közös), ÁFA-számítás,
                    munkalap-státuszgép
  db/               Drizzle ORM séma, migrációk, RLS policy-k, seed script
  invoice-provider/ Közös InvoiceProvider interfész + Mock / Számlázz.hu / Billingo adapter
  license/          Ed25519 licenckulcs aláírás/ellenőrzés, demo-mód limitek
tools/
  generate-license/ CLI a licenckulcsok gyártásához (csak az üzemeltető futtatja)
```

Adatmodell, demo/licenc-logika és biztonsági elvek részletesen: lásd az eredeti tervezési
specifikációt és a [`docs/adr/`](docs/adr/) döntési feljegyzéseket.

## Helyi indítás

Előfeltétel: Node.js 20+, pnpm 10+, Docker (a Postgres-hez) vagy egy helyi Postgres 16.

```bash
pnpm install

# Postgres indítása (docker-compose), vagy csatlakozás egy meglévő Postgres 16-hoz
docker compose up -d

cp .env.example .env
# .env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, LICENSE_PUBLIC_KEY

# séma + RLS policy-k létrehozása, majd minta adatok betöltése
pnpm --filter @autoszerv/db db:migrate
pnpm --filter @autoszerv/db db:seed

pnpm dev
```

A `pnpm dev` a Turborepo-n keresztül elindítja a Fastify backendet (`:3001`) és a Vite dev
szervert (`:5173`). A seed script létrehoz egy demo tenant-ot, egy `tulaj` felhasználót
(`tulaj@mintaszerviz.hu` / `DemoJelszo123!`), egy ügyfelet, egy járművet és egy munkalapot.

Új szerviz a `/regisztracio` oldalon keresztül is indítható — ez mindig egy friss `demo`
állapotú tenant-ot hoz létre.

## Tesztelés

```bash
pnpm lint        # ESLint (typescript-eslint strict)
pnpm typecheck   # tsc --noEmit / tsc -b minden csomagban
pnpm test        # Vitest unit + integrációs tesztek, coverage riporttal
pnpm build       # Turborepo-cache-elt build minden csomagra
pnpm --filter @autoszerv/web test:e2e   # Playwright E2E (lásd lent)
```

A négy fő parancs (`lint`, `typecheck`, `test`, `build`) mindegyike hibamentesen lefut.

### Mit fed le a tesztkészlet

- **Unit tesztek, magas ágfedettséggel** a kritikus üzleti logikára: licenckulcs
  aláírás/ellenőrzés (érvénytelen aláírás, lejárt kulcs, rossz `tenant_id`, sérült payload),
  ÁFA-/összeg-számítás, munkalap-státuszgép (érvénytelen/visszafelé irányuló átmenetek),
  demo-mód limitek, JWT és jelszó-hash kerekítés.
- **App-wiring tesztek** (`apps/api/src/app.test.ts`) `fastify.inject`-tel, adatbázis nélkül:
  auth-guard, health-check, bemenet-validáció.
- **Playwright E2E** (`apps/web/e2e/critical-flows.spec.ts`), valódi Postgres és valódi
  böngésző ellen, a `playwright.config.ts` `webServer` konfigurációja indítja az API-t
  (migrációval + seeddel) és a web dev szervert:
  1. regisztráció → demo tenant létrehozása → ügyfél + jármű felvitel
  2. munkalap felvétele → tétel hozzáadása → státuszváltás → számla generálása (mock provider)
  3. licenckulcs-aktiválás: demo → éles állapotváltás, valódi Ed25519 aláírással

Az E2E-hez egy különálló, csak tesztelésre szánt Ed25519 kulcspár tartozik
(`apps/web/playwright.config.ts`), amivel a teszt aláírja a licenckulcsot — ez soha nem
kerül éles használatba.

Ebben a fejlesztői környezetben a CRUD végpontok (ügyfelek/járművek/munkalapok) és a teljes
regisztráció → licenc-aktiválás folyamat valódi helyi Postgres ellen manuálisan és a
Playwright-tesztekkel is le lett futtatva és ellenőrizve — ez fedezte fel és javította ki
a fejlesztés közben a Row-Level Security tenant-kontextus két hibáját (lásd
[`docs/adr/0001-scope-for-this-session.md`](docs/adr/0001-scope-for-this-session.md)).

## Licenckulcs-generálás

A privát kulcs **soha** nem kerül a deployolt alkalmazásba — kizárólag a
`tools/generate-license` CLI-ben létezik, amit az üzemeltető futtat egy elkülönített
admin-környezetben.

```bash
# Egyszeri lépés: kulcspár generálása
pnpm --filter @autoszerv/generate-license start generate-keypair
# -> LICENSE_PUBLIC_KEY kerüljön a backend .env-jébe / deploy konfigjába
# -> LICENSE_PRIVATE_KEY SOHA ne kerüljön verziókezelésbe

# Licenckulcs kiadása egy adott tenant-nak
LICENSE_PRIVATE_KEY=<...> pnpm license:generate \
  --tenant <tenant-uuid> --plan pro --expires 2027-09-16 \
  --features invoicing,sms --max-users 5
```

A kimenetet (a licenckulcsot) az üzemeltető e-mailben küldi el az ügyfélnek, aki a
Beállítások → Licenc oldalon aktiválja. Az aktiválás tisztán kriptográfiai
aláírás-ellenőrzéssel történik, szerverhez fordulás (phone-home) nélkül.

## Deploy

- **Frontend**: statikus PWA build (`pnpm --filter @autoszerv/web build`) →
  Cloudflare Pages / Vercel. Az `apps/web/Dockerfile` egy nginx-alapú konténerképet is ad
  a teljesség kedvéért, de a javasolt út a statikus hosting.
- **Backend + Postgres**: EU-régiós hosting a GDPR-megfelelés miatt (pl. Fly.io Frankfurt,
  Hetzner, Render EU). Az `apps/api/Dockerfile` multi-stage build, `pnpm deploy --prod`-dal
  állítja elő a végső, futásidejű `node_modules`-t.
- A `.github/workflows/ci.yml` minden push/PR-en lefuttatja: install → lint → typecheck →
  build → migráció → unit/integrációs tesztek → Playwright E2E → Docker image build (csak ha
  minden előző lépés zöld).

> **Megjegyzés a Docker image-ekről**: ezt a két Dockerfile-t ebben a fejlesztői
> munkamenetben nem lehetett ténylegesen megépíteni és lemérni (a sandbox hálózati
> szabályzata blokkolta a Docker Hub CDN-jét), így a `< 200 MB` képméret-cél és a build
> maga a CI-ban ellenőrződik ténylegesen először. Lásd
> [`docs/adr/0001-scope-for-this-session.md`](docs/adr/0001-scope-for-this-session.md).

## Mi van kész, és mi nincs

**Kész és valós Postgres + böngésző ellen ellenőrizve ebben a munkamenetben:**
tenant-izoláció (alkalmazás-szintű szűrés + Postgres RLS), regisztráció → demo tenant,
ügyfél/jármű/munkalap CRUD, munkalap-workflow, tétel → mock számla generálás, demo-mód
limitek, licenckulcs demo → éles aktiválás, session-bootstrap (böngésző-frisselés túléli a
bejelentkezést).

**Megvalósítva, de nem élesben tesztelve** (lásd ADR): Számlázz.hu / Billingo adapter valódi
API-hívásai (csak mockolt HTTP-vel tesztelve), SMS/e-mail értesítés küldés, időpontfoglalás,
alkatrészkészlet, gumihotel, digitális járműellenőrzés, ügyfélportál, profitabilitási
dashboard — ezek a "később" kategóriába tartoznak az eredeti specifikáció szerint is.

**Tudottan hátralévő munka**: Lighthouse-mérés éles hostingon (a build-időt és a bundle
méretet lokálisan mértük, lásd ADR 0001), teljes WCAG audit képernyőolvasóval, a Docker
image tényleges megépítése és mérése CI-ban.
