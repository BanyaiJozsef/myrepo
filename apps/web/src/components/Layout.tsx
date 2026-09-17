import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import { Button } from "./Button";

const NAV_ITEMS = [
  { to: "/ugyfelek", labelKey: "nav.ugyfelek" },
  { to: "/jarmuvek", labelKey: "nav.jarmuvek" },
  { to: "/munkalapok", labelKey: "nav.munkalapok" },
  { to: "/beallitasok", labelKey: "nav.beallitasok" },
] as const;

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return `flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-brand-600 text-white"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;
}

export function Layout() {
  const { t } = useTranslation();
  const { user, kilepes } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#tartalom"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Ugrás a tartalomra
      </a>

      <nav
        aria-label="Fő navigáció"
        className="hidden w-56 shrink-0 flex-col gap-1 border-r border-slate-200 p-4 dark:border-slate-800 md:flex"
      >
        <span className="mb-4 px-3 text-lg font-bold">{t("app.cim")}</span>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClassName}>
            {t(item.labelKey)}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2 px-3 pt-4">
          {user ? <span className="text-xs text-slate-500 dark:text-slate-400">{user.nev}</span> : null}
          <Button variant="masodlagos" onClick={() => void kilepes()}>
            {t("nav.kijelentkezes")}
          </Button>
        </div>
      </nav>

      <main id="tartalom" className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <Outlet />
      </main>

      <nav
        aria-label="Fő navigáció (mobil)"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950 md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg py-1 text-xs font-medium ${
                isActive ? "text-brand-600 dark:text-brand-500" : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
