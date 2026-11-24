import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendToUser } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const errors: string[] = [];
  const sent = await sendToUser(data.user.id, { title: "Bitácora", body: `Las notificaciones funcionan 👌 (${new Date().toLocaleTimeString("es-UY", { timeZone: "America/Montevideo", hour: "2-digit", minute: "2-digit" })})`, url: "/ajustes", tag: `test-${Date.now()}` }, errors);
  return Response.json({ sent, errors });
}
