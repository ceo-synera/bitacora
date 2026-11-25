"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, Eye, FileUp, LogOut, Trash2, Send, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { currentSubscription, disablePush, enablePush, isStandalone, pushSupported, sendTestPush } from "@/lib/push";
import { toast } from "@/lib/toast";
import { PageHeader, Section } from "@/components/ui";
import { useSession } from "@/components/auth-gate";
import { LangToggle } from "@/components/lang-toggle";
import { t } from "@/lib/i18n";
import { useReadOnly } from "@/lib/use-role";

export default function AjustesPage() {
  const readOnly = useReadOnly();
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("Ajustes", "Settings")} />
      <Section title="Idioma / Language">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <p className="text-muted">{t("Las tareas escritas en el otro idioma se traducen solas.", "Tasks written in the other language are translated automatically.")}</p>
          <LangToggle />
        </div>
      </Section>
      {!readOnly && <Notifications />}
      {!readOnly && <Viewers />}
      {!readOnly && (
      <>
      <Section title={t("Personas", "People")}>
        <Link href="/personas" className="btn-outline">
          <Users className="size-4" /> {t("Ver y editar personas", "View and edit people")}
        </Link>
      </Section>
      <Section title={t("Importar", "Import")}>
        <Link href="/ajustes/importar" className="btn-outline">
          <FileUp className="size-4" /> {t("Importar tareas desde CSV o Excel", "Import tasks from CSV or Excel")}
        </Link>
      </Section>
      </>
      )}
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
    <Section title={t("Notificaciones", "Notifications")}>
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-muted">{t("A las 08:00 te llega lo que vence hoy y lo que tenés con hora; y otro aviso 10 minutos antes de cada tarea con hora.", "At 08:00 you get what's due today and what you have scheduled; plus another reminder 10 minutes before each scheduled task.")}</p>
        {!pushSupported() ? (
          <p className="text-danger">
            {t("Este navegador no soporta notificaciones.", "This browser doesn't support notifications.")}
            {/iPhone|iPad/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") && t(" En iPhone: abrí la app en Safari → Compartir → «Agregar a inicio», y activalas desde la app instalada.", " On iPhone: open the app in Safari → Share → “Add to Home Screen”, and turn them on from the installed app.")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {here ? (
              <button className="btn-outline" disabled={busy} onClick={() => run(disablePush, t("Avisos apagados en este dispositivo", "Notifications turned off on this device"))}>
                <BellOff className="size-4" /> {t("Apagar en este dispositivo", "Turn off on this device")}
              </button>
            ) : (
              <button className="btn-primary" disabled={busy} onClick={() => run(enablePush, t("Avisos activados", "Notifications turned on"))}>
                <Bell className="size-4" /> {t("Activar en este dispositivo", "Turn on on this device")}
              </button>
            )}
            <button className="btn-outline" disabled={busy || devices.length === 0} onClick={() =>
                run(async () => {
                  const r = await sendTestPush();
                  if (r.errors.length) toast(t(`No salió: ${r.errors.join(" · ")}`, `Not sent: ${r.errors.join(" · ")}`), "error");
                  if (r.sent) toast(t(`Enviado a ${r.sent} dispositivo(s). Si no lo ves, revisá los permisos de notificaciones del sistema.`, `Sent to ${r.sent} device(s). If you don't see it, check the system notification permissions.`));
                })
              }>
              <Send className="size-4" /> {t("Probar", "Test")}
            </button>
          </div>
        )}
        {!isStandalone() && /iPhone|iPad/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") && (
          <p className="text-xs text-muted">{t("En iPhone los avisos solo llegan si instalaste la app desde Safari (iOS 16.4 o más nuevo).", "On iPhone, notifications only arrive if you installed the app from Safari (iOS 16.4 or newer).")}</p>
        )}
        {devices.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-3 py-2">
                <span>{d.device_name ?? t("Dispositivo", "Device")}</span>
                <button
                  className="p-1 text-muted hover:text-danger"
                  aria-label={t("Quitar", "Remove")}
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

function Account() {
  const session = useSession();
  const router = useRouter();
  const [pw, setPw] = useState("");
  return (
    <Section title={t("Cuenta", "Account")}>
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-muted">{t("Entraste como", "Signed in as")} {session?.user.email}</p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 10) return toast(t("Usá al menos 10 caracteres.", "Use at least 10 characters."), "error");
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) toast(error.message, "error");
            else {
              toast(t("Contraseña cambiada", "Password changed"));
              setPw("");
            }
          }}
        >
          <input className="input" type="password" autoComplete="new-password" placeholder={t("Contraseña nueva", "New password")} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-outline shrink-0">{t("Cambiar", "Change")}</button>
        </form>
        <button
          className="btn-ghost text-danger"
          onClick={async () => {
            await disablePush().catch(() => {});
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          <LogOut className="size-4" /> {t("Salir", "Sign out")}
        </button>
      </div>
    </Section>
  );
}

/** Cuentas de solo lectura (por ejemplo, para que el equipo de PainPoint vea la app). */
function Viewers() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: viewers = [] } = useQuery({
    queryKey: ["viewers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("viewers").select("email, user_id, created_at").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  async function call(method: "POST" | "DELETE", body: object) {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/viewers", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error ?? `Error ${res.status}`);
      return out as { updated?: boolean };
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["viewers"] });
    }
  }

  return (
    <Section title={t("Lectores (solo lectura)", "Viewers (read-only)")}>
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-muted">
          {t(
            "Ven todo lo que ves vos (tareas, reuniones, personas, archivos), pero no pueden cambiar nada. Entran con su mail y la contraseña que pongas acá; pasásela por un canal privado.",
            "They see everything you see (tasks, meetings, people, files) but can't change anything. They sign in with their email and the password you set here; share it privately.",
          )}
        </p>
        {viewers.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {viewers.map((v) => (
              <li key={v.email} className="flex items-center gap-2 px-3 py-2">
                <Eye className="size-4 text-muted" />
                <span className="flex-1">{v.email}</span>
                <button
                  className="p-1 text-muted hover:text-danger"
                  aria-label={t("Quitar acceso", "Remove access")}
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(t(`¿Quitarle el acceso a ${v.email}?`, `Remove access for ${v.email}?`))) return;
                    try {
                      await call("DELETE", { email: v.email });
                      toast(t("Acceso quitado", "Access removed"));
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await call("POST", { email, password });
              toast(r.updated ? t("Contraseña actualizada", "Password updated") : t(`Listo: ${email} ya puede entrar`, `Done: ${email} can sign in now`));
              setEmail("");
              setPassword("");
            } catch (err) {
              toast((err as Error).message, "error");
            }
          }}
        >
          <input className="input" type="email" placeholder={t("Mail del lector", "Viewer's email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className="input"
            type="text"
            autoComplete="off"
            placeholder={t("Contraseña (mín. 10)", "Password (min. 10)")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
          />
          <button className="btn-primary" disabled={busy}>
            {t("Dar acceso", "Give access")}
          </button>
        </form>
        <p className="text-xs text-muted">{t("Si el mail ya es lector, se le cambia la contraseña.", "If the email is already a viewer, its password is changed.")}</p>
      </div>
    </Section>
  );
}
