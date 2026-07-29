create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'baileys',
  status text not null default 'disconnected' check (
    status in ('disconnected', 'connecting', 'qr', 'connected', 'disconnecting', 'reconnecting', 'error')
  ),
  phone_number text,
  qr_code text,
  last_connected_at timestamptz,
  last_disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  phone text not null,
  name text,
  profile_picture_url text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  status text not null default 'open' check (status in ('open', 'archived', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, phone)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  whatsapp_message_id text,
  phone text not null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  type text not null default 'text',
  content text,
  media_url text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'delivered', 'read', 'failed', 'received')
  ),
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_sessions_owner_provider_idx
  on public.whatsapp_sessions (owner_id, provider);

create index if not exists whatsapp_conversations_owner_last_message_idx
  on public.whatsapp_conversations (owner_id, last_message_at desc);

create index if not exists whatsapp_conversations_owner_phone_idx
  on public.whatsapp_conversations (owner_id, phone);

create index if not exists whatsapp_messages_owner_conversation_created_idx
  on public.whatsapp_messages (owner_id, conversation_id, created_at);

create unique index if not exists whatsapp_messages_owner_external_id_idx
  on public.whatsapp_messages (owner_id, whatsapp_message_id)
  where whatsapp_message_id is not null;

alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "owners_manage_whatsapp_sessions"
on public.whatsapp_sessions
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners_manage_whatsapp_conversations"
on public.whatsapp_conversations
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners_manage_whatsapp_messages"
on public.whatsapp_messages
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_whatsapp_sessions_updated_at on public.whatsapp_sessions;

create trigger set_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists set_whatsapp_conversations_updated_at on public.whatsapp_conversations;

create trigger set_whatsapp_conversations_updated_at
before update on public.whatsapp_conversations
for each row
execute function public.set_updated_at();
