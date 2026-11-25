-- Lectores: cuentas de solo lectura que ven los datos de un dueño (por ejemplo, el equipo de PainPoint).

create table public.viewers (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  email text not null,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, email)
);
alter table public.viewers enable row level security;
create policy "el dueño administra sus lectores" on public.viewers for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "el lector se ve a sí mismo" on public.viewers for select to authenticated
  using (user_id = (select auth.uid()));

-- ¿El usuario actual puede leer los datos de este dueño?
create function public.can_read(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = auth.uid()
    or exists (select 1 from public.viewers v where v.owner_id = owner and v.user_id = auth.uid());
$$;

-- Lectura para lectores (las políticas de escritura siguen siendo solo del dueño).
do $$
declare t text;
begin
  foreach t in array array['projects', 'people', 'tasks', 'meetings', 'notes', 'files', 'project_members', 'meeting_attendees']
  loop
    execute format('create policy "lectores pueden leer" on public.%I for select to authenticated using (public.can_read(owner_id))', t);
  end loop;
end $$;

create policy "files: lectores pueden leer" on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_read(((storage.foldername(name))[1])::uuid));

-- Usuarios permitidos: el dueño y los lectores que él cargó.
create or replace function public.only_allowed_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) is distinct from 'nahuel@painpoint-ai.com'
     and not exists (select 1 from public.viewers v where lower(v.email) = lower(new.email)) then
    raise exception 'Bitácora: este mail no tiene acceso';
  end if;
  return new;
end $$;

-- Al crear la cuenta de un lector, vincularla.
create function public.link_viewer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.viewers set user_id = new.id where lower(email) = lower(new.email);
  return new;
end $$;
create trigger link_viewer after insert on auth.users for each row execute function public.link_viewer();
