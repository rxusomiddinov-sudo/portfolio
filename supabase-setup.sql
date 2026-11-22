create table if not exists public.portfolio_admins (
  email text primary key
);

create table if not exists public.portfolio_content (
  id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;
alter table public.portfolio_content enable row level security;

grant select on public.portfolio_admins to authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

drop policy if exists portfolio_admins_select on public.portfolio_admins;
create policy portfolio_admins_select on public.portfolio_admins
  for select to authenticated
  using (email = auth.jwt() ->> 'email');

drop policy if exists portfolio_content_select on public.portfolio_content;
create policy portfolio_content_select on public.portfolio_content
  for select
  using (true);

drop policy if exists portfolio_content_insert on public.portfolio_content;
create policy portfolio_content_insert on public.portfolio_content
  for insert to authenticated
  with check (exists (select 1 from public.portfolio_admins where email = auth.jwt() ->> 'email'));

drop policy if exists portfolio_content_update on public.portfolio_content;
create policy portfolio_content_update on public.portfolio_content
  for update to authenticated
  using (exists (select 1 from public.portfolio_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.portfolio_admins where email = auth.jwt() ->> 'email'));

drop policy if exists portfolio_content_delete on public.portfolio_content;
create policy portfolio_content_delete on public.portfolio_content
  for delete to authenticated
  using (exists (select 1 from public.portfolio_admins where email = auth.jwt() ->> 'email'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'portfolio_content'
  ) then
    alter publication supabase_realtime add table public.portfolio_content;
  end if;
end $$;
