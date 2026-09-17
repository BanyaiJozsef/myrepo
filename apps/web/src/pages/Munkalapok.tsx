import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  kovetkezoAllapotok,
  munkalapInputSchema,
  munkalapTetelInputSchema,
  type Jarmu,
  type Munkalap,
  type MunkalapInput,
  type MunkalapStatusz,
  type MunkalapTetelInput,
  type Ugyfel,
} from "@autoszerv/shared-types";
import { apiRequest, ApiError } from "../lib/api-client";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";

const STATUSZ_SZIN: Record<MunkalapStatusz, string> = {
  felvett: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  folyamatban: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  kesz: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  lezart: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
};

interface Szamla {
  szamlaszam: string;
  brutto: string;
  demo: boolean;
}

function UjMunkalapForm({
  ugyfelek,
  jarmuvek,
  onKesz,
}: {
  ugyfelek: Ugyfel[];
  jarmuvek: Jarmu[];
  onKesz: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [szerverHiba, setSzerverHiba] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MunkalapInput>({
    resolver: zodResolver(munkalapInputSchema),
    defaultValues: { ugyfelId: ugyfelek[0]?.id, jarmuId: jarmuvek[0]?.id, tipus: "munka" },
  });

  const mutation = useMutation({
    mutationFn: (values: MunkalapInput) =>
      apiRequest<Munkalap>("/munkalapok", { method: "POST", body: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["munkalapok"] });
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
        <label htmlFor="munkalap-ugyfelId" className="text-sm font-medium">
          Ügyfél
        </label>
        <select
          id="munkalap-ugyfelId"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          {...register("ugyfelId")}
        >
          {ugyfelek.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nev}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="munkalap-jarmuId" className="text-sm font-medium">
          Jármű
        </label>
        <select
          id="munkalap-jarmuId"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          {...register("jarmuId")}
        >
          {jarmuvek.map((j) => (
            <option key={j.id} value={j.id}>
              {j.rendszam}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Hibaleírás" hiba={errors.hibaleiras?.message} {...register("hibaleiras")} />
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

function TetelForm({ munkalapId }: { munkalapId: string }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<MunkalapTetelInput>({
    resolver: zodResolver(munkalapTetelInputSchema),
    defaultValues: { tipus: "munka", afaKulcs: 27 },
  });
  const mutation = useMutation({
    mutationFn: (values: MunkalapTetelInput) =>
      apiRequest(`/munkalapok/${munkalapId}/tetelek`, { method: "POST", body: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["munkalapok"] });
      reset();
    },
  });

  return (
    <form
      onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
      className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"
    >
      <input
        aria-label="Tétel megnevezése"
        placeholder="Megnevezés"
        className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        {...register("megnevezes")}
      />
      <input
        aria-label="Mennyiség"
        type="number"
        step="0.01"
        placeholder="Menny."
        className="min-h-11 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        {...register("mennyiseg")}
      />
      <input
        aria-label="Egységár"
        type="number"
        step="0.01"
        placeholder="Egységár"
        className="min-h-11 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        {...register("egysegar")}
      />
      <Button type="submit" variant="masodlagos" disabled={mutation.isPending}>
        + Tétel
      </Button>
    </form>
  );
}

function SzamlaGomb({ munkalapId }: { munkalapId: string }) {
  const [szamla, setSzamla] = useState<Szamla | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Szamla>(`/munkalapok/${munkalapId}/szamla`, {
        method: "POST",
        body: { fizetesiMod: "keszpenz" },
      }),
    onSuccess: setSzamla,
  });

  if (szamla) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        Számla: {szamla.szamlaszam} · {szamla.brutto} Ft {szamla.demo ? "(DEMO)" : ""}
      </p>
    );
  }

  return (
    <Button variant="masodlagos" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      Számla generálása
    </Button>
  );
}

export function MunkalapokPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["munkalapok"],
    queryFn: () => apiRequest<Munkalap[]>("/munkalapok"),
  });
  const { data: ugyfelek } = useQuery({
    queryKey: ["ugyfelek"],
    queryFn: () => apiRequest<Ugyfel[]>("/ugyfelek"),
  });
  const { data: jarmuvek } = useQuery({
    queryKey: ["jarmuvek"],
    queryFn: () => apiRequest<Jarmu[]>("/jarmuvek"),
  });
  const [formNyitva, setFormNyitva] = useState(false);

  const statuszValtas = useMutation({
    mutationFn: ({ id, statusz }: { id: string; statusz: MunkalapStatusz }) =>
      apiRequest<Munkalap>(`/munkalapok/${id}/statusz`, { method: "PATCH", body: { statusz } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["munkalapok"] }),
  });

  const lehetUjatFelvenni = (ugyfelek?.length ?? 0) > 0 && (jarmuvek?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("munkalapok.cim")}</h1>
        {!formNyitva && lehetUjatFelvenni && (
          <Button onClick={() => setFormNyitva(true)}>{t("munkalapok.uj")}</Button>
        )}
      </div>

      {formNyitva && ugyfelek && jarmuvek && (
        <UjMunkalapForm ugyfelek={ugyfelek} jarmuvek={jarmuvek} onKesz={() => setFormNyitva(false)} />
      )}

      {isLoading ? (
        <SkeletonList />
      ) : data && data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {data.map((munkalap) => (
            <li
              key={munkalap.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUSZ_SZIN[munkalap.statusz]}`}
                >
                  {t(`munkalapok.statusz.${munkalap.statusz}`)}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{munkalap.hibaleiras}</p>
              <div className="flex flex-wrap gap-2">
                {kovetkezoAllapotok(munkalap.statusz).map((kovetkezo) => (
                  <Button
                    key={kovetkezo}
                    variant="masodlagos"
                    disabled={statuszValtas.isPending}
                    onClick={() => statuszValtas.mutate({ id: munkalap.id, statusz: kovetkezo })}
                  >
                    → {t(`munkalapok.statusz.${kovetkezo}`)}
                  </Button>
                ))}
              </div>
              <TetelForm munkalapId={munkalap.id} />
              <SzamlaGomb munkalapId={munkalap.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState cim={t("munkalapok.cim")} leiras={t("munkalapok.ures")} />
      )}
    </div>
  );
}
