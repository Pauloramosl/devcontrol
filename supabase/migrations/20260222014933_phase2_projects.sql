create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  service_type text,
  budget_value numeric,
  scope_text text,
  proposal_text text,
  start_date date,
  due_date date,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists projects_owner_client_idx on public.projects (owner_id, client_id);
create index if not exists projects_owner_status_idx on public.projects (owner_id, status);

alter table public.projects enable row level security;

create policy "owners_manage_projects"
on public.projects
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();
