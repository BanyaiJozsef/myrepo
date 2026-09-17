import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLicenseStatus } from "../lib/use-license";
import { apiRequest, ApiError } from "../lib/api-client";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { SkeletonList } from "../components/Skeleton";

const ALLAPOT_LABEL_KEY = {
  demo: "beallitasok.licenc.allapotDemo",
  aktiv: "beallitasok.licenc.allapotAktiv",
  lejart: "beallitasok.licenc.allapotLejart",
} as const;

export function BeallitasokPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useLicenseStatus();
  const [licenseKey, setLicenseKey] = useState("");
  const [uzenet, setUzenet] = useState<{ tipus: "siker" | "hiba"; szoveg: string } | null>(null);

  const activate = useMutation({
    mutationFn: () => apiRequest("/license/activate", { method: "POST", body: { licenseKey } }),
    onSuccess: async () => {
      setUzenet({ tipus: "siker", szoveg: t("beallitasok.licenc.sikeres") });
      setLicenseKey("");
      await queryClient.invalidateQueries({ queryKey: ["license-status"] });
    },
    onError: (error) => {
      setUzenet({ tipus: "hiba", szoveg: error instanceof ApiError ? error.message : "Ismeretlen hiba." });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t("beallitasok.cim")}</h1>

      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-lg font-semibold">{t("beallitasok.licenc.cim")}</h2>

        {isLoading ? (
          <SkeletonList sorok={2} />
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {data?.tenant ? t(ALLAPOT_LABEL_KEY[data.tenant.allapot]) : "—"}
            {data?.license ? ` · ${data.license.plan} · lejár: ${new Date(data.license.lejar).toLocaleDateString("hu-HU")}` : ""}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            activate.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <TextField
            label={t("beallitasok.licenc.kulcs")}
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="eyJ0ZW5hbnRfaWQi....signature"
          />
          {uzenet ? (
            <p
              role="alert"
              className={`text-sm ${uzenet.tipus === "siker" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {uzenet.szoveg}
            </p>
          ) : null}
          <Button type="submit" disabled={activate.isPending || licenseKey.length === 0}>
            {t("beallitasok.licenc.aktivalas")}
          </Button>
        </form>
      </section>
    </div>
  );
}
