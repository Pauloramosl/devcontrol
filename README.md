# DevControl

## Visao geral

Projeto modular para gestao interna, evoluindo por fases.

- Fase 0 - Fundacao: setup React + Vite + Tailwind + React Router + Supabase Auth.
- Fase 1 - Clientes + Tags: modulo de clientes com tags (N:N), RLS por owner e CRUD basico.

## Setup

### Requisitos

- Node.js 20+
- npm 10+

### Variaveis de ambiente

Crie/edite `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Nao use `service_role` no frontend.

### Rodar o app

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

### Supabase CLI e migrations

Se ainda nao existir pasta `supabase/`:

```bash
npx supabase init
```

Se necessario, autentique:

```bash
npx supabase login
```

Se necessario, linke o projeto remoto:

```bash
npx supabase link --project-ref <PROJECT_REF>
```

Aplicar migrations:

```bash
npx supabase db push
```

## Fase 0 - Fundacao

Implementacao da fase inicial com React + Vite + Tailwind + React Router + Supabase Auth.

### Escopo implementado

- Rota publica de login: `/login`
- Callback OAuth: `/auth/callback`
- Rota privada: `/app`
- Logout no header da area autenticada
- Sessao persiste entre refreshs via Supabase Auth

### Como testar login Google

1. No Supabase Dashboard, confirme que o provider Google esta habilitado.
2. Em `Authentication > URL Configuration`, garanta:
- Site URL: `http://localhost:5173`
- Redirect URL adicional: `http://localhost:5173/auth/callback`
3. Rode `npm run dev` e abra `http://localhost:5173/login`.
4. Clique em `Entrar com Google`.
5. Ao voltar do OAuth, voce deve cair em `/app`.

### Observacoes da fase

- `.env.local` esta ignorado no `.gitignore`.
- Nao ha tabelas de negocio nem CRUD nesta fase.
- TODO: dark/light mode fica para fase futura.

## Fase 1 - Clientes + Tags

Implementacao da Fase 1 com clientes e tags, mantendo owner isolation por RLS.

### Estrutura de banco (migration)

Migration em `supabase/migrations/` para:

- `clients`
- `client_tags`
- `client_tag_relations`
- RLS + policies por `owner_id`
- indices para filtros/listagens
- trigger de `updated_at` em `clients`

### Rotas frontend

- `/app/clients`
- `/app/clients/new`
- `/app/clients/:id`
- `/app/clients/:id/edit`
- `/app/tags`

### Funcionalidades entregues

- CRUD basico de clientes (criar, listar, editar, detalhe).
- Busca por nome/email.
- Filtro por status.
- Filtro por tag.
- Associacao/desassociacao de tags por cliente.
- Exclusão de cliente implementada (com cascade automático para projetos).
- Estados de loading/empty/error nas telas principais.

### Teste manual rapido da fase

1. Faca login.
2. Acesse `/app/tags` e crie algumas tags.
3. Acesse `/app/clients/new` e crie um cliente.
4. Abra o detalhe do cliente (`/app/clients/:id`) e associe/desassocie tags.
5. Volte para `/app/clients` e teste:
- busca por nome/email
- filtro por status
- filtro por tag

## Regra para proximas fases

Nao sobrescrever o README inteiro.
Adicionar sempre uma nova secao ao final para manter o historico evolutivo.

## Fase 2 — Projetos

Modulo de projetos vinculado a clientes existentes, com isolamento por `owner_id` via RLS.

### Como aplicar migrations

```bash
npx supabase db push
```

### Rotas criadas

- `/app/projects`
- `/app/projects/new`
- `/app/projects/:id`
- `/app/projects/:id/edit`

### Estrutura da tabela

Tabela `projects`:

- `id` uuid primary key default `gen_random_uuid()`
- `owner_id` uuid not null references `auth.users(id)`
- `client_id` uuid not null references `clients(id)` on delete cascade
- `service_type` text
- `budget_value` numeric
- `scope_text` text
- `proposal_text` text
- `start_date` date
- `due_date` date
- `status` text not null default `'active'`
- `created_at` timestamptz default `now()`
- `updated_at` timestamptz default `now()`

Com suporte a:

- RLS habilitado
- Policy `FOR ALL` com:
  - `USING (owner_id = auth.uid())`
  - `WITH CHECK (owner_id = auth.uid())`
- Indices:
  - `projects_owner_client_idx (owner_id, client_id)`
  - `projects_owner_status_idx (owner_id, status)`
- Trigger `updated_at` em updates

### Como testar manualmente

1. Rode `npx supabase db push`.
2. Rode `npm run dev`.
3. Acesse `/app/projects/new`, selecione um cliente e crie um projeto.
4. Acesse `/app/projects` e teste filtro por status e filtro por cliente.
5. Abra `/app/projects/:id`, edite em `/app/projects/:id/edit` e teste exclusao no detalhe.

## Fase 3 — Kanban por Projeto

Kanban por projeto com colunas customizaveis, tasks por coluna, drag-and-drop persistido e logs de atividade.

### Tabelas criadas

- `project_columns`
- `tasks`
- `task_logs`

Todas com:

- `owner_id`
- RLS com policy `FOR ALL`:
  - `USING (owner_id = auth.uid())`
  - `WITH CHECK (owner_id = auth.uid())`

### Como usar kanban

1. Abra um projeto em `/app/projects/:id`.
2. Clique em `Kanban` para ir a `/app/projects/:id/kanban`.
3. Crie colunas e tasks.
4. Arraste colunas e tasks para reordenar/mover.
5. Edite task pelo botao `Editar task`.
6. Veja eventos na area `Atividade`.
7. Ajustes: drop zone da coluna inteira, drag move apenas 1 card e edicao via modal unico.
8. Reorder de colunas restaurado e reorder interno de tasks implementado.

### Como aplicar migrations

```bash
npx supabase db push
```

### Rotas criadas

- `/app/projects/:id/kanban`

### Como testar drag-and-drop

1. Crie pelo menos 2 colunas e 3 tasks.
2. Mova tasks para topo, meio e fim da mesma coluna.
3. Mova task para outra coluna.
4. Reordene colunas.
5. Recarregue a pagina e confirme persistencia.

### Observacao sobre rank

Foi implementado LexoRank simplificado em `src/lib/rank.js`:

- `rankBetween(a, b)`
- `rankAfter(a)`
- `rankBefore(b)`

Se nao houver espaco entre ranks, o sistema reindexa a coluna e tenta novamente.
