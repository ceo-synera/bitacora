"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/db";
import { t } from "@/lib/i18n";
import { setReadOnly } from "@/lib/role";

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

/** Deja pasar solo con sesión. La sesión queda guardada en el dispositivo, así funciona sin conexión. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [roleFor, setRoleFor] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  // ¿Es un lector? (cuenta de solo lectura). Se recuerda en el dispositivo para funcionar sin conexión.
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    const cached = readRole(uid);
    if (cached !== null) setReadOnly(cached);
    supabase
      .from("viewers")
      .select("owner_id")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) {
          setReadOnly(!!data);
          try {
            localStorage.setItem(`bitacora-lector-${uid}`, data ? "1" : "0");
          } catch {}
        }
        setRoleFor(uid);
      });
  }, [uid]);
  const roleReady = !!uid && (roleFor === uid || readRole(uid) !== null);

  if (!session || !roleReady) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">{t("Cargando…", "Loading…")}</div>;
  }
  return <SessionContext value={session}>{children}</SessionContext>;
}

function readRole(uid: string): boolean | null {
  try {
    const v = localStorage.getItem(`bitacora-lector-${uid}`);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}
