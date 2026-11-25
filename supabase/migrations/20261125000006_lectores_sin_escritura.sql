-- Los lectores no escriben nada (ni siquiera filas propias).
create function public.is_viewer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.viewers v where v.user_id = auth.uid());
$$;

do $$
declare t text; op text;
begin
  foreach t in array array['projects', 'people', 'tasks', 'meetings', 'notes', 'files', 'project_members', 'meeting_attendees', 'push_subscriptions']
  loop
    execute format('create policy "lectores no insertan" on public.%I as restrictive for insert to authenticated with check (not public.is_viewer())', t);
    execute format('create policy "lectores no modifican" on public.%I as restrictive for update to authenticated using (not public.is_viewer())', t);
    execute format('create policy "lectores no borran" on public.%I as restrictive for delete to authenticated using (not public.is_viewer())', t);
  end loop;
end $$;

create policy "files: lectores no suben" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'files' or not public.is_viewer());
create policy "files: lectores no borran" on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'files' or not public.is_viewer());
