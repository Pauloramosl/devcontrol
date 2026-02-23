create table if not exists public.project_columns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  column_order int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_columns_owner_project_idx on public.project_columns (owner_id, project_id);
create index if not exists project_columns_owner_order_idx on public.project_columns (owner_id, project_id, column_order);

alter table public.project_columns enable row level security;

create policy "owners_manage_project_columns"
on public.project_columns
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_project_columns_updated_at on public.project_columns;

create trigger set_project_columns_updated_at
before update on public.project_columns
for each row
execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  service_type text,
  column_id uuid not null references public.project_columns (id) on delete cascade,
  title text not null,
  description text,
  priority text,
  due_date date,
  rank text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_owner_project_idx on public.tasks (owner_id, project_id);
create index if not exists tasks_owner_column_rank_idx on public.tasks (owner_id, column_id, rank);
create index if not exists tasks_owner_due_idx on public.tasks (owner_id, due_date);
create index if not exists tasks_owner_client_idx on public.tasks (owner_id, client_id);

alter table public.tasks enable row level security;

create policy "owners_manage_tasks"
on public.tasks
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_tasks_updated_at on public.tasks;

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create table if not exists public.task_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  task_id uuid not null references public.tasks (id) on delete cascade,
  event_type text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);

create index if not exists task_logs_owner_task_idx on public.task_logs (owner_id, task_id);
create index if not exists task_logs_owner_created_idx on public.task_logs (owner_id, created_at);

alter table public.task_logs enable row level security;

create policy "owners_manage_task_logs"
on public.task_logs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
