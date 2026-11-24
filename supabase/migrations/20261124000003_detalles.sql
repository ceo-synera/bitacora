-- Más detalle para organizar: fichas de personas, equipo por proyecto, descripción de proyecto y adjuntos en tareas.

alter table public.people
  add column role text,
  add column phone text,
  add column notes_md text not null default '';

alter table public.projects
  add column description_md text not null default '';

-- Links y archivos adjuntos a una tarea (si se borra la tarea, el archivo queda en Archivos).
alter table public.files
  add column task_id uuid references public.tasks on delete set null;
create index on public.files (task_id);

-- Quién está en cada proyecto y con qué rol.
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique (project_id, person_id)
);
create index on public.project_members (person_id);

alter table public.project_members enable row level security;
create policy "solo el dueño" on public.project_members for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
