// Aplica las migraciones de supabase/migrations que falten, usando la Management API de Supabase.
// Uso: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/migrate.mjs
// (En la sesión de Claude Code el token lo inyecta el proxy; ahí alcanza con SUPABASE_ACCESS_TOKEN=proxy-injected.)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error("Faltan SUPABASE_PROJECT_REF o SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const lit = (s) => `'${s.replaceAll("'", "''")}'`;

await query(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
const applied = new Set((await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version));

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  if (applied.has(version)) continue;
  const sql = readFileSync(join(dir, file), "utf8");
  console.log(`Aplicando ${file}…`);
  await query(`begin;\n${sql}\n;insert into supabase_migrations.schema_migrations (version, name, statements) values (${lit(version)}, ${lit(rest.join("_"))}, array[${lit(sql)}]);\ncommit;`);
}
console.log("Migraciones al día.");
