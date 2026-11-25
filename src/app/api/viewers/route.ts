import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/** El dueño (no un lector) que hace el pedido. */
async function owner(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const db = supabaseAdmin();
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: v } = await db.from("viewers").select("email").eq("user_id", data.user.id).maybeSingle();
  return v ? null : data.user;
}

/** Crea (o le cambia la contraseña a) un lector. Body: { email, password } */
export async function POST(req: Request) {
  const user = await owner(req);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "Mail inválido" }, { status: 400 });
  if (password.length < 10) return Response.json({ error: "La contraseña tiene que tener al menos 10 caracteres" }, { status: 400 });
  if (email === user.email?.toLowerCase()) return Response.json({ error: "Ese es tu propio mail" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing } = await db.from("viewers").select("user_id").eq("owner_id", user.id).eq("email", email).maybeSingle();
  if (existing?.user_id) {
    const { error } = await db.auth.admin.updateUserById(existing.user_id, { password });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, updated: true });
  }
  const { error: e1 } = await db.from("viewers").upsert({ owner_id: user.id, email });
  if (e1) return Response.json({ error: e1.message }, { status: 500 });
  const { error: e2 } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (e2) {
    await db.from("viewers").delete().eq("owner_id", user.id).eq("email", email);
    return Response.json({ error: e2.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}

/** Saca el acceso a un lector y borra su cuenta. Body: { email } */
export async function DELETE(req: Request) {
  const user = await owner(req);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Falta el mail" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: v } = await db.from("viewers").select("user_id").eq("owner_id", user.id).eq("email", email).maybeSingle();
  if (!v) return Response.json({ error: "No existe ese lector" }, { status: 404 });
  await db.from("viewers").delete().eq("owner_id", user.id).eq("email", email);
  if (v.user_id) await db.auth.admin.deleteUser(v.user_id);
  return Response.json({ ok: true });
}
