import "server-only";
import * as webpush from "web-push";
import { supabaseAdmin } from "../supabase-admin";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:avisos@bitacora.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Manda un aviso a todos los dispositivos del usuario. Borra las suscripciones vencidas. */
export async function sendToUser(ownerId: string, payload: PushPayload): Promise<number> {
  configure();
  const db = supabaseAdmin();
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: "high",
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push error", status);
      }
    }),
  );
  return sent;
}
