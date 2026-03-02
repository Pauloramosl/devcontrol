create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  value numeric(12, 2) not null,
  periodicity text not null default 'monthly',
  start_date date not null,
  due_day int not null,
  status text not null default 'active' check (status in ('active', 'paused', 'canceled')),
  last_generated_month text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists recurrences_owner_client_idx on public.recurrences (owner_id, client_id);
create index if not exists recurrences_owner_status_idx on public.recurrences (owner_id, status);

alter table public.recurrences enable row level security;

create policy "owners_manage_recurrences"
on public.recurrences
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_recurrences_updated_at on public.recurrences;

create trigger set_recurrences_updated_at
before update on public.recurrences
for each row
execute function public.set_updated_at();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  recurrence_id uuid references public.recurrences (id) on delete set null,
  reference_month text,
  value numeric(12, 2) not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'canceled')),
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoices_owner_due_idx on public.invoices (owner_id, due_date);
create index if not exists invoices_owner_status_idx on public.invoices (owner_id, status);
create index if not exists invoices_owner_client_idx on public.invoices (owner_id, client_id);
create index if not exists invoices_owner_reference_month_idx on public.invoices (owner_id, reference_month);

alter table public.invoices enable row level security;

create policy "owners_manage_invoices"
on public.invoices
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_invoices_updated_at on public.invoices;

create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();
