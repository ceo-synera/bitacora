-- Asistentes de cada reunión.
create table public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  meeting_id uuid not null references public.meetings on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  created_at timestamptz not null default now(),
  unique (meeting_id, person_id)
);
create index on public.meeting_attendees (person_id);
alter table public.meeting_attendees enable row level security;
create policy "solo el dueño" on public.meeting_attendees for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Traducciones de tareas: idioma original detectado y traducciones guardadas.
-- translations = { "es": { "title": "...", "notes": "...", "h": "<hash del original>" }, "en": { ... } }
alter table public.tasks
  add column lang text check (lang in ('es', 'en')),
  add column translations jsonb not null default '{}'::jsonb;
