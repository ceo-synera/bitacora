@AGENTS.md

# Bitácora

- Interfaz en español rioplatense; zona horaria America/Montevideo (`src/lib/dates.ts`).
- Commits chicos, en español, directo a `main`.
- Ninguna clave en el repo, en logs ni en el navegador (salvo la publicable de Supabase y la pública de VAPID).
- Esquema solo por migraciones en `supabase/migrations` (`npm run db:migrate`).
- Todas las escrituras del cliente pasan por `insert/update/remove` de `src/lib/db.ts` (cola sin conexión).
