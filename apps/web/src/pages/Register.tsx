import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerInputSchema, type RegisterInput } from "@autoszerv/shared-types";
import { apiRequest, ApiError } from "../lib/api-client";
import { useAuth, type AuthUser } from "../lib/auth-context";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

interface RegisterResponse {
  accessToken: string;
  felhasznalo: AuthUser;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { munkamenetBeallitasa } = useAuth();
  const [szerverHiba, setSzerverHiba] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSzerverHiba(null);
    try {
      const response = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: values,
      });
      munkamenetBeallitasa(response.accessToken, response.felhasznalo);
      navigate("/ugyfelek");
    } catch (error) {
      setSzerverHiba(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.");
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200 p-6 shadow-sm dark:border-slate-800"
        noValidate
      >
        <h1 className="text-xl font-bold">Ingyenes demó indítása</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nincs szükség bankkártyára. A fiókod demó módban indul, amit később licenckulccsal aktiválhatsz.
        </p>
        <TextField
          label="Szerviz neve"
          hiba={errors.szervizNev?.message}
          {...register("szervizNev")}
        />
        <TextField label="Neved" hiba={errors.nev?.message} {...register("nev")} />
        <TextField
          label="E-mail cím"
          type="email"
          autoComplete="email"
          hiba={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Jelszó"
          type="password"
          autoComplete="new-password"
          hiba={errors.jelszo?.message}
          {...register("jelszo")}
        />
        {szerverHiba ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {szerverHiba}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          Demó indítása
        </Button>
        <Link to="/bejelentkezes" className="text-center text-sm text-brand-600 hover:underline">
          Már van fiókod? Jelentkezz be.
        </Link>
      </form>
    </div>
  );
}
