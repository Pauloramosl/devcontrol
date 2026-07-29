alter table public.whatsapp_conversations
add column if not exists remote_jid text;

alter table public.whatsapp_messages
add column if not exists remote_jid text;

create unique index if not exists whatsapp_conversations_owner_remote_jid_idx
  on public.whatsapp_conversations (owner_id, remote_jid)
  where remote_jid is not null;

create index if not exists whatsapp_messages_owner_remote_jid_idx
  on public.whatsapp_messages (owner_id, remote_jid);

update public.whatsapp_conversations
set remote_jid = phone || '@lid'
where remote_jid is null
  and phone is not null
  and phone !~ '^55'
  and length(phone) between 12 and 15;
