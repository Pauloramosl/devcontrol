create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  description text not null,
  category text,
  value numeric(12, 2) not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'canceled')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists expenses_owner_due_idx on public.expenses (owner_id, due_date);
create index if not exists expenses_owner_status_idx on public.expenses (owner_id, status);

alter table public.expenses enable row level security;

create policy "owners_manage_expenses"
on public.expenses
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_expenses_updated_at on public.expenses;

create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();
