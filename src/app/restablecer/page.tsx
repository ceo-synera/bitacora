"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";

export default function ResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // Si el link venció o ya se usó, Supabase vuelve con el error en la URL.
  const [linkError] = useState(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
    return p.get("error_description") ?? p.get("error");
  });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // El link del mail trae la sesión en la URL; supabase-js la detecta sola.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError(t("Usá al menos 10 caracteres.", "Use at least 10 characters."));
    if (password !== password2) return setError(t("Las contraseñas no coinciden.", "Passwords don't match."));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">{t("Elegí tu contraseña", "Choose your password")}</h1>
        {linkError && !ready ? (
          <div className="space-y-3 text-sm">
            <p className="text-danger">{t("Este link ya no sirve (venció o ya se usó).", "This link no longer works (it expired or was already used).")}</p>
            <p className="text-muted">{t("Pedí uno nuevo desde la pantalla de entrada: escribí tu mail y tocá «Olvidé mi contraseña».", "Request a new one from the sign-in screen: enter your email and tap «Forgot my password».")}</p>
            <a href="/login" className="btn-primary w-full">
              {t("Ir a la entrada", "Go to sign in")}
            </a>
          </div>
        ) : !ready ? (
          <p className="text-sm text-muted">{t("Validando el link…", "Checking the link…")}</p>
        ) : (
          <>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder={t("Contraseña nueva", "New password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder={t("Repetila", "Repeat it")}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {t("Guardar y entrar", "Save and sign in")}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
