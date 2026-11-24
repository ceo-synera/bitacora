-- Avisos: Supabase Cron llama a /api/cron/notify cada 5 minutos.
-- La URL de la app y la clave salen del Vault (secretos "app_url" y "cron_secret"), nunca del repo.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('bitacora-notify') where exists (select 1 from cron.job where jobname = 'bitacora-notify');

select cron.schedule(
  'bitacora-notify',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
