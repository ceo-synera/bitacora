import { timingSafeEqual } from "node:crypto";
import { runNotifications } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    return Response.json(await runNotifications());
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Falló el envío" }, { status: 500 });
  }
}
