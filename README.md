# DevControl - Fase 1 (Clientes + Tags)

Implementacao da Fase 1 do PRD modular:
- autenticacao (fase anterior)
- clientes + tags + relacao N:N com RLS por owner

## Requisitos

- Node.js 20+
- npm 10+

## Variaveis de ambiente

Crie/edite `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Nao use `service_role` no frontend.

## Rodar o app

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Supabase CLI (migrations obrigatorias)

1. Inicializar projeto Supabase local (se ainda nao existir pasta `supabase/`):

```bash
npx supabase init
```

2. Login na CLI (se necessario):

```bash
npx supabase login
```

3. Linkar projeto remoto (se necessario):

```bash
npx supabase link --project-ref <PROJECT_REF>
```

4. Aplicar migrations no banco remoto:

```bash
npx supabase db push
```

## Estrutura desta fase

- Migration em `supabase/migrations/` para:
  - `clients`
  - `client_tags`
  - `client_tag_relations`
  - RLS + policies por `owner_id`
  - indices e trigger de `updated_at` em `clients`

- Rotas frontend:
  - `/app/clients`
  - `/app/clients/new`
  - `/app/clients/:id`
  - `/app/clients/:id/edit`
  - `/app/tags`

## Teste manual rapido

1. Faça login.
2. Acesse `/app/tags` e crie algumas tags.
3. Acesse `/app/clients/new` e crie um cliente.
4. Abra o detalhe do cliente (`/app/clients/:id`) e associe/desassocie tags.
5. Volte para `/app/clients` e teste:
  - busca por nome/email
  - filtro por status
  - filtro por tag
