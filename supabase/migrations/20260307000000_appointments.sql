create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  date date not null,
  time text,
  client_name text,
  description text,
  type text not null default 'Reunião',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_owner_date_idx on public.appointments (owner_id, date);
create index if not exists appointments_owner_created_idx on public.appointments (owner_id, created_at);

alter table public.appointments enable row level security;

create policy "owners_manage_appointments"
on public.appointments
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_appointments_updated_at on public.appointments;

create trigger set_appointments_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();
