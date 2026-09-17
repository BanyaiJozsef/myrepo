import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ugyfelInputSchema, type Ugyfel, type UgyfelInput } from "@autoszerv/shared-types";
import { apiRequest, ApiError } from "../lib/api-client";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";

function useUgyfelek() {
  return useQuery({ queryKey: ["ugyfelek"], queryFn: () => apiRequest<Ugyfel[]>("/ugyfelek") });
}

function UjUgyfelForm({ onKesz }: { onKesz: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [szerverHiba, setSzerverHiba] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UgyfelInput>({
    resolver: zodResolver(ugyfelInputSchema),
    defaultValues: { tipus: "maganszemely", gdprHozzajarulas: false },
  });

  const mutation = useMutation({
    mutationFn: (values: UgyfelInput) => apiRequest<Ugyfel>("/ugyfelek", { method: "POST", body: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ugyfelek"] });
      onKesz();
    },
    onError: (error) => setSzerverHiba(error instanceof ApiError ? error.message : "Ismeretlen hiba."),
  });

  return (
    <form
      onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <TextField label={t("ugyfelek.nev")} hiba={errors.nev?.message} {...register("nev")} />
      <TextField label={t("ugyfelek.telefon")} hiba={errors.telefon?.message} {...register("telefon")} />
      <TextField label={t("ugyfelek.email")} type="email" hiba={errors.email?.message} {...register("email")} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" {...register("gdprHozzajarulas")} />
        GDPR adatkezelési hozzájárulás megadva
      </label>
      {szerverHiba ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {szerverHiba}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {t("kozos.mentes")}
        </Button>
        <Button type="button" variant="masodlagos" onClick={onKesz}>
          {t("kozos.megse")}
        </Button>
      </div>
    </form>
  );
}

export function UgyfelekPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useUgyfelek();
  const [formNyitva, setFormNyitva] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("ugyfelek.cim")}</h1>
        {!formNyitva && <Button onClick={() => setFormNyitva(true)}>{t("ugyfelek.uj")}</Button>}
      </div>

      {formNyitva && <UjUgyfelForm onKesz={() => setFormNyitva(false)} />}

      {isLoading ? (
        <SkeletonList />
      ) : data && data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.map((ugyfel) => (
            <li
              key={ugyfel.id}
              className="flex min-h-14 items-center justify-between rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-800"
            >
              <div>
                <p className="font-medium">{ugyfel.nev}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {ugyfel.telefon} {ugyfel.email ? `· ${ugyfel.email}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState cim={t("ugyfelek.cim")} leiras={t("ugyfelek.ures")} />
      )}
    </div>
  );
}
