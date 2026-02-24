create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pipelines_owner_name_idx on public.pipelines (owner_id, name);

alter table public.pipelines enable row level security;

create policy "owners_manage_pipelines"
on public.pipelines
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_pipelines_updated_at on public.pipelines;

create trigger set_pipelines_updated_at
before update on public.pipelines
for each row
execute function public.set_updated_at();

create table if not exists public.pipeline_columns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  column_order int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pipeline_columns_owner_pipeline_order_idx
on public.pipeline_columns (owner_id, pipeline_id, column_order);

alter table public.pipeline_columns enable row level security;

create policy "owners_manage_pipeline_columns"
on public.pipeline_columns
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_pipeline_columns_updated_at on public.pipeline_columns;

create trigger set_pipeline_columns_updated_at
before update on public.pipeline_columns
for each row
execute function public.set_updated_at();
