import "server-only";
import { createClient } from "@supabase/supabase-js";

// Solo en el servidor (rutas /api). Usa la clave secreta: saltea RLS.
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
