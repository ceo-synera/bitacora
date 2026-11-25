"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, FileUp, LogOut, Trash2, Send, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { currentSubscription, disablePush, enablePush, isStandalone, pushSupported, sendTestPush } from "@/lib/push";
import { toast } from "@/lib/toast";
import { PageHeader, Section } from "@/components/ui";
import { useSession } from "@/components/auth-gate";
import { LangToggle } from "@/components/lang-toggle";
import { t } from "@/lib/i18n";

export default function AjustesPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("Ajustes", "Settings")} />
      <Section title="Idioma / Language">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <p className="text-muted">{t("Las tareas escritas en el otro idioma se traducen solas.", "Tasks written in the other language are translated automatically.")}</p>
          <LangToggle />
        </div>
      </Section>
      <Notifications />
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
