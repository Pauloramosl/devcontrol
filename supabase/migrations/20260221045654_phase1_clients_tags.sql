create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  email text,
  phone text,
  company text,
  document_number text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.client_tag_relations (
  client_id uuid not null references public.clients (id) on delete cascade,
  tag_id uuid not null references public.client_tags (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (client_id, tag_id)
);

create index if not exists clients_owner_status_idx on public.clients (owner_id, status);
create index if not exists clients_owner_name_idx on public.clients (owner_id, name);
create index if not exists client_tags_owner_name_idx on public.client_tags (owner_id, name);
create index if not exists client_tag_relations_owner_client_idx on public.client_tag_relations (owner_id, client_id);
create index if not exists client_tag_relations_owner_tag_idx on public.client_tag_relations (owner_id, tag_id);

alter table public.clients enable row level security;
alter table public.client_tags enable row level security;
alter table public.client_tag_relations enable row level security;

create policy "owners_manage_clients"
on public.clients
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners_manage_client_tags"
on public.client_tags
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners_manage_client_tag_relations"
on public.client_tag_relations
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;

create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();
