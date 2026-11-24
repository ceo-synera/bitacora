"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, FileUp, LogOut, Trash2, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { insert, remove, update, usePeople } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { currentSubscription, disablePush, enablePush, isStandalone, pushSupported, sendTestPush } from "@/lib/push";
import { toast } from "@/lib/toast";
import { PageHeader, Section } from "@/components/ui";
import { useSession } from "@/components/auth-gate";

export default function AjustesPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Ajustes" />
      <Notifications />
      <People />
      <Section title="Importar">
        <Link href="/ajustes/importar" className="btn-outline">
          <FileUp className="size-4" /> Importar tareas desde CSV o Excel
        </Link>
      </Section>
      <Account />
    </div>
  );
}

function Notifications() {
  const qc = useQueryClient();
  const [here, setHere] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: devices = [] } = useQuery({
    queryKey: ["push_subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("push_subscriptions").select("id, endpoint, device_name, created_at").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    currentSubscription().then((s) => setHere(!!s && devices.some((d) => d.endpoint === s.endpoint)));
  }, [devices]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["push_subscriptions"] });
  };

  return (
    <Section title="Notificaciones">
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-muted">A las 08:00 te llega lo que vence hoy y lo que tenés con hora; y otro aviso 10 minutos antes de cada tarea con hora.</p>
        {!pushSupported() ? (
          <p className="text-danger">
            Este navegador no soporta notificaciones.
            {/iPhone|iPad/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") && " En iPhone: abrí la app en Safari → Compartir → «Agregar a inicio», y activalas desde la app instalada."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {here ? (
              <button className="btn-outline" disabled={busy} onClick={() => run(disablePush, "Avisos apagados en este dispositivo")}>
                <BellOff className="size-4" /> Apagar en este dispositivo
              </button>
            ) : (
              <button className="btn-primary" disabled={busy} onClick={() => run(enablePush, "Avisos activados")}>
                <Bell className="size-4" /> Activar en este dispositivo
              </button>
            )}
            <button className="btn-outline" disabled={busy || devices.length === 0} onClick={() => run(async () => toast(`Enviado a ${(await sendTestPush()).sent} dispositivo(s)`))}>
              <Send className="size-4" /> Probar
            </button>
          </div>
        )}
        {!isStandalone() && /iPhone|iPad/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") && (
          <p className="text-xs text-muted">En iPhone los avisos solo llegan si instalaste la app desde Safari (iOS 16.4 o más nuevo).</p>
        )}
        {devices.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-3 py-2">
                <span>{d.device_name ?? "Dispositivo"}</span>
                <button
                  className="p-1 text-muted hover:text-danger"
                  aria-label="Quitar"
                  onClick={() => run(async () => void (await supabase.from("push_subscriptions").delete().eq("id", d.id)))}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function People() {
  const { data: people } = usePeople();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  return (
    <Section title="Personas" count={people.length}>
      <div className="card p-2">
        <ul className="divide-y divide-line">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-2 py-1.5">
              <input className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none" defaultValue={p.name} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && update("people", p.id, { name: e.target.value.trim() })} />
              <input
                className="w-28 bg-transparent py-1 text-sm text-muted outline-none"
                placeholder="Equipo"
                defaultValue={p.team ?? ""}
                onBlur={(e) => e.target.value !== (p.team ?? "") && update("people", p.id, { team: e.target.value || null })}
              />
              <button className="p-1 text-muted hover:text-danger" onClick={() => confirm(`¿Borrar a ${p.name}?`) && remove("people", p.id)} aria-label="Borrar">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-1 flex gap-2 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            insert("people", { name: name.trim(), team: team.trim() || null });
            setName("");
            setTeam("");
          }}
        >
          <input className="input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input w-32" placeholder="Equipo" value={team} onChange={(e) => setTeam(e.target.value)} />
          <button className="btn-primary shrink-0">Agregar</button>
        </form>
      </div>
    </Section>
  );
}

function Account() {
  const session = useSession();
  const router = useRouter();
  const [pw, setPw] = useState("");
  return (
    <Section title="Cuenta">
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-muted">Entraste como {session?.user.email}</p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 10) return toast("Usá al menos 10 caracteres.", "error");
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) toast(error.message, "error");
            else {
              toast("Contraseña cambiada");
              setPw("");
            }
          }}
        >
          <input className="input" type="password" autoComplete="new-password" placeholder="Contraseña nueva" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-outline shrink-0">Cambiar</button>
        </form>
        <button
          className="btn-ghost text-danger"
          onClick={async () => {
            await disablePush().catch(() => {});
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          <LogOut className="size-4" /> Salir
        </button>
      </div>
    </Section>
  );
}
