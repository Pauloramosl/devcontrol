create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  task_id uuid not null references public.tasks (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_comments_owner_task_idx on public.task_comments (owner_id, task_id);
create index if not exists task_comments_owner_created_idx on public.task_comments (owner_id, created_at);

alter table public.task_comments enable row level security;

create policy "owners_manage_task_comments"
on public.task_comments
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists set_task_comments_updated_at on public.task_comments;

create trigger set_task_comments_updated_at
before update on public.task_comments
for each row
execute function public.set_updated_at();
