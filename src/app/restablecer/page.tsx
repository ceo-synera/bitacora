"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
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
    if (password.length < 10) return setError("Usá al menos 10 caracteres.");
    if (password !== password2) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">Elegí tu contraseña</h1>
        {!ready ? (
          <p className="text-sm text-muted">Validando el link… Si no avanza, pedí otro desde la pantalla de entrada.</p>
        ) : (
          <>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Contraseña nueva"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Repetila"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              Guardar y entrar
            </button>
          </>
        )}
      </form>
    </main>
  );
}
