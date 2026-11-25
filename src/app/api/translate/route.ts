import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { translateItems } from "@/lib/server/translate";
import { sourceHash, type Translations } from "@/lib/translation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Traduce tareas del usuario al idioma pedido y guarda las traducciones. Body: { to: "es" | "en", ids: string[] } */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const db = supabaseAdmin();
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { to?: string; ids?: string[] } | null;
  const to = body?.to === "en" ? "en" : body?.to === "es" ? "es" : null;
  const ids = (body?.ids ?? []).slice(0, 40);
  if (!to || !ids.length) return Response.json({ error: "Faltan datos" }, { status: 400 });

  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, notes_md, lang, translations")
    .eq("owner_id", auth.user.id)
    .in("id", ids);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  try {
    const out = await translateItems(
      tasks.map((t) => ({ id: t.id, title: t.title, notes: t.notes_md })),
      to,
    );
    const results = [];
    for (const t of tasks) {
      const tr = out.find((o) => o.id === t.id);
      if (!tr) continue;
      const translations: Translations = { ...(t.translations ?? {}) };
      // Solo guardamos traducción si el original está en el otro idioma.
      if (tr.source_lang !== to) translations[to] = { title: tr.title, notes: tr.notes, h: sourceHash(t.title, t.notes_md) };
      await db.from("tasks").update({ lang: tr.source_lang, translations }).eq("id", t.id);
      results.push({ id: t.id, lang: tr.source_lang, translations });
    }
    return Response.json({ results });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "Muchas traducciones seguidas; probá en un rato" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: `Claude: ${e.status}` }, { status: 502 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
