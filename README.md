# DevControl - Fase 0 (Fundacao)

Implementacao da fase inicial com React + Vite + Tailwind + React Router + Supabase Auth.

## Requisitos

- Node.js 20+
- npm 10+

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Configure o ambiente em `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

4. Build de producao:

```bash
npm run build
```

## Fluxo de autenticacao

- Rota publica de login: `/login`
- Callback OAuth: `/auth/callback`
- Rota privada: `/app`
- Logout no header da area autenticada
- Sessao persiste entre refreshs via Supabase Auth

## Como testar login Google

1. No Supabase Dashboard, confirme que o provider Google esta habilitado.
2. Em `Authentication > URL Configuration`, garanta que:
- Site URL: `http://localhost:5173`
- Redirect URL adicional: `http://localhost:5173/auth/callback`
3. Rode `npm run dev` e abra `http://localhost:5173/login`.
4. Clique em `Entrar com Google`.
5. Ao voltar do OAuth, voce deve cair em `/app`.

## Observacoes da fase

- `.env.local` esta ignorado no `.gitignore`.
- Nao ha tabelas de negocio nem CRUD nesta fase.
- TODO: dark/light mode fica para fase futura.
