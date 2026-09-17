import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loginInputSchema, type LoginInput } from "@autoszerv/shared-types";
import { useAuth } from "../lib/auth-context";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ApiError } from "../lib/api-client";

export function LoginPage() {
  const { t } = useTranslation();
  const { belepes } = useAuth();
  const navigate = useNavigate();
  const [szerverHiba, setSzerverHiba] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSzerverHiba(null);
    try {
      await belepes(values.email, values.jelszo);
      navigate("/ugyfelek");
    } catch (error) {
      setSzerverHiba(error instanceof ApiError ? error.message : t("login.hiba"));
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200 p-6 shadow-sm dark:border-slate-800"
        noValidate
      >
        <h1 className="text-xl font-bold">{t("login.cim")}</h1>
        <TextField
          label={t("login.email")}
          type="email"
          autoComplete="email"
          hiba={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label={t("login.jelszo")}
          type="password"
          autoComplete="current-password"
          hiba={errors.jelszo?.message}
          {...register("jelszo")}
        />
        {szerverHiba ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {szerverHiba}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {t("login.gomb")}
        </Button>
        <Link to="/regisztracio" className="text-center text-sm text-brand-600 hover:underline">
          Nincs még fiókod? Indíts ingyenes demót.
        </Link>
      </form>
    </div>
  );
}
