create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index notes_owner_created_idx
  on public.notes (user_id, created_at desc, id desc);

alter table public.notes enable row level security;

revoke all on public.notes from anon, authenticated;
grant select, delete on public.notes to authenticated;
grant insert (body), update (body) on public.notes to authenticated;

create policy "Read own notes" on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own notes" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Edit own notes" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete own notes" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);
