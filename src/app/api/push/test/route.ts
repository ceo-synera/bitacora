import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendToUser } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const sent = await sendToUser(data.user.id, { title: "Bitácora", body: "Las notificaciones funcionan 👌", url: "/ajustes", tag: "test" });
  return Response.json({ sent });
}
