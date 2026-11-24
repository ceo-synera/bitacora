# Bitácora

App personal (PWA) para tareas, todos rápidos, reuniones de los lunes, notas, planillas y archivos de todos los proyectos. Un solo usuario.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) en Vercel · Supabase (Auth con mail y contraseña, Postgres con RLS, Storage, Cron) · Web Push con VAPID.

## Cómo funciona

- **Datos:** el navegador habla con Supabase con la clave publicable; lo que puede leer y escribir lo decide RLS (`owner_id = auth.uid()` en todas las tablas). La clave secreta solo la usan las rutas `/api/*`.
- **Sin conexión:** cada tabla se guarda en IndexedDB (`src/lib/db.ts`). Los cambios se aplican al instante y entran a una cola que se manda cuando vuelve la red. El service worker (`public/sw.js`) guarda las pantallas.
- **Avisos:** Supabase Cron llama a `POST /api/cron/notify` cada 5 minutos con `Authorization: Bearer $CRON_SECRET`. Entre las 08:00 y las 09:00 de Uruguay manda el resumen del día (una vez) y, todo el día, un aviso 10 minutos antes de cada tarea con hora.
- **Reuniones de los lunes:** subís los PDF a mano; la app reconoce `AAAA-MM-DD Agenda AI Funnels Weekly.pdf`, `AAAA-MM-DD Presentacion AI Funnels Weekly.pdf` y los que dicen «Minuta», crea la reunión de esa fecha e ignora los «OBSOLETA».
- **Repeticiones:** al completar una tarea que se repite (RRULE), se crea la siguiente.

## Variables de entorno

Ver `.env.example`. Las públicas (`NEXT_PUBLIC_*`) van al navegador; las secretas solo en Vercel.

## Comandos

```bash
npm run dev          # desarrollo
npm test             # tests (los de RLS corren si hay credenciales de Supabase en el entorno)
npm run db:migrate   # aplica supabase/migrations con la Management API (SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF)
```
