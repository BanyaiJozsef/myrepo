import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { jarmuInputSchema, type Jarmu, type JarmuInput, type Ugyfel } from "@autoszerv/shared-types";
import { apiRequest, ApiError } from "../lib/api-client";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";

function useJarmuvek() {
  return useQuery({ queryKey: ["jarmuvek"], queryFn: () => apiRequest<Jarmu[]>("/jarmuvek") });
}

function useUgyfelekLista() {
  return useQuery({ queryKey: ["ugyfelek"], queryFn: () => apiRequest<Ugyfel[]>("/ugyfelek") });
}

function UjJarmuForm({ ugyfelek, onKesz }: { ugyfelek: Ugyfel[]; onKesz: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [szerverHiba, setSzerverHiba] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JarmuInput>({
    resolver: zodResolver(jarmuInputSchema),
    defaultValues: { ugyfelId: ugyfelek[0]?.id },
  });

  const mutation = useMutation({
    mutationFn: (values: JarmuInput) => apiRequest<Jarmu>("/jarmuvek", { method: "POST", body: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jarmuvek"] });
      onKesz();
    },
    onError: (error) => setSzerverHiba(error instanceof ApiError ? error.message : "Ismeretlen hiba."),
  });

  return (
    <form
      onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ugyfelId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Ügyfél
        </label>
        <select
          id="ugyfelId"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          {...register("ugyfelId")}
        >
          {ugyfelek.map((ugyfel) => (
            <option key={ugyfel.id} value={ugyfel.id}>
              {ugyfel.nev}
            </option>
          ))}
        </select>
      </div>
      <TextField label={t("jarmuvek.rendszam")} hiba={errors.rendszam?.message} {...register("rendszam")} />
      <TextField label="Gyártmány" hiba={errors.gyartmany?.message} {...register("gyartmany")} />
      <TextField label="Típus" hiba={errors.tipus?.message} {...register("tipus")} />
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

export function JarmuvekPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useJarmuvek();
  const { data: ugyfelek } = useUgyfelekLista();
  const [formNyitva, setFormNyitva] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("jarmuvek.cim")}</h1>
        {!formNyitva && ugyfelek && ugyfelek.length > 0 && (
          <Button onClick={() => setFormNyitva(true)}>{t("jarmuvek.uj")}</Button>
        )}
      </div>

      {formNyitva && ugyfelek && <UjJarmuForm ugyfelek={ugyfelek} onKesz={() => setFormNyitva(false)} />}

      {isLoading ? (
        <SkeletonList />
      ) : data && data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.map((jarmu) => (
            <li
              key={jarmu.id}
              className="flex min-h-14 items-center justify-between rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-800"
            >
              <div>
                <p className="font-medium">{jarmu.rendszam}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {jarmu.gyartmany} {jarmu.tipus} {jarmu.evjarat ? `(${jarmu.evjarat})` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState cim={t("jarmuvek.cim")} leiras={t("jarmuvek.ures")} />
      )}
    </div>
  );
}
