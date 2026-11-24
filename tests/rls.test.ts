/**
 * Reglas de seguridad contra la base real. Corre solo si hay credenciales:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const run = url && pub && secret ? describe : describe.skip;

const TABLES = ["projects", "people", "tasks", "meetings", "notes", "files", "push_subscriptions", "notification_log"];

run("RLS", () => {
  const anon = url ? createClient(url, pub!, { auth: { persistSession: false } }) : (null as never);
  const admin = url ? createClient(url, secret!, { auth: { persistSession: false } }) : (null as never);

  it("sin sesión no se lee ninguna tabla", async () => {
    const { count } = await admin.from("tasks").select("*", { count: "exact", head: true });
    for (const t of TABLES) {
      const { data } = await anon.from(t).select("*").limit(5);
      expect(data ?? [], t).toEqual([]);
    }
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("sin sesión no se puede escribir", async () => {
    const { error } = await anon.from("tasks").insert({ title: "intruso" });
    expect(error).not.toBeNull();
  });

  it("sin sesión no se listan archivos del bucket", async () => {
    const { data } = await anon.storage.from("files").list();
    expect(data ?? []).toEqual([]);
  });

  it("solo se puede crear el usuario permitido", async () => {
    const { error } = await anon.auth.signUp({ email: `otro-${Date.now()}@example.com`, password: "una-clave-cualquiera-123" });
    expect(error).not.toBeNull();
    const { error: adminError } = await admin.auth.admin.createUser({ email: `otro-${Date.now()}@example.com`, password: "una-clave-cualquiera-123" });
    expect(adminError).not.toBeNull();
  });
});
