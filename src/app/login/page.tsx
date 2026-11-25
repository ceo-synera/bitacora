"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/logo";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? t("Mail o contraseña incorrectos.", "Wrong email or password.") : error.message);
    else router.replace("/");
  }

  async function onForgot() {
    if (!email.trim()) {
      setError(t("Escribí tu mail y tocá de nuevo.", "Enter your email and tap again."));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setInfo(t("Te mandé un mail con un link para elegir una contraseña nueva.", "I sent you an email with a link to choose a new password."));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Logo className="size-8" />
          <h1 className="text-xl font-semibold">Bitácora</h1>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t("Mail", "Email")}</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t("Contraseña", "Password")}</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-muted">{info}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {t("Entrar", "Sign in")}
        </button>
        <button type="button" className="w-full text-center text-sm text-muted hover:text-ink" onClick={onForgot}>
          {t("Olvidé mi contraseña", "Forgot my password")}
        </button>
      </form>
    </main>
  );
}
