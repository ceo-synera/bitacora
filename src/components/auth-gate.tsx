"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/db";

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

/** Deja pasar solo con sesión. La sesión queda guardada en el dispositivo, así funciona sin conexión. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

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

  if (!session) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">Cargando…</div>;
  }
  return <SessionContext value={session}>{children}</SessionContext>;
}
