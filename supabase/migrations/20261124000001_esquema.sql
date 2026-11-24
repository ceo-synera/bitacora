-- Bitácora: esquema inicial.
-- Todas las tablas tienen owner_id y la misma regla: cada fila la ve y la edita solo su dueño.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  email text,
  team text,
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete set null,
  date date not null,
  title text not null default '',
  notes_md text not null default '',
  recording_url text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete set null,
  meeting_id uuid references public.meetings on delete set null,
  parent_id uuid references public.tasks on delete cascade,
  title text not null,
  notes_md text not null default '',
  assignee_id uuid references public.people on delete set null,
  status text not null default 'todo' check (status in ('inbox', 'todo', 'doing', 'waiting', 'done')),
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  due_date date,
  due_time time,
  recurrence text,
  sort double precision not null default 0,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete set null,
  title text not null default '',
  body_md text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete set null,
  meeting_id uuid references public.meetings on delete set null,
  name text not null,
  kind text not null check (kind in ('upload', 'link')),
  role text check (role in ('agenda', 'presentation', 'minutes')),
  storage_path text,
  url text,
  mime text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  check ((kind = 'upload' and storage_path is not null) or (kind = 'link' and url is not null))
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_name text,
  created_at timestamptz not null default now()
);

-- Registro de avisos enviados, para no mandar dos veces el mismo.
create table public.notification_log (
  owner_id uuid not null references auth.users on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (owner_id, key)
);

create index on public.tasks (owner_id, status);
create index on public.tasks (due_date) where status <> 'done';
create index on public.tasks (parent_id);
create index on public.meetings (owner_id, date desc);
create index on public.files (meeting_id);
create index on public.notes (project_id);

-- updated_at automático
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- RLS: owner_id = auth.uid() en todas las tablas
do $$
declare t text;
begin
  foreach t in array array['projects', 'people', 'meetings', 'tasks', 'notes', 'files', 'push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo el dueño" on public.%I for all to authenticated
         using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

-- notification_log solo lo usa el servidor (service role): RLS sin políticas.
alter table public.notification_log enable row level security;

-- Un solo usuario permitido.
create function public.only_allowed_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) is distinct from 'nahuel@painpoint-ai.com' then
    raise exception 'Bitácora es de un solo usuario';
  end if;
  return new;
end $$;

create trigger only_allowed_user before insert or update of email on auth.users
  for each row execute function public.only_allowed_user();

-- Storage: bucket privado "files", ruta <owner_id>/<project_id|sin-proyecto>/<archivo>
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do nothing;

create policy "files: solo el dueño lee" on storage.objects for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "files: solo el dueño sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "files: solo el dueño modifica" on storage.objects for update to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "files: solo el dueño borra" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
