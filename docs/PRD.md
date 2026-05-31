# Product Requirements Document (PRD) - DevControl

## 1. Visão Geral (Overview)

O **DevControl** é uma aplicação modular voltada para gestão interna, construída para evoluir em fases. O sistema integra a gestão de clientes, projetos, tarefas (através de boards Kanban) e um módulo financeiro completo (contas a receber e a pagar), oferecendo uma visão unificada para freelancers, agências ou pequenas empresas controlarem o andamento dos serviços prestados e do seu fluxo de caixa.

O sistema foca em segurança (isolamento de dados por usuário) e uma interface moderna.

---

## 2. Público-Alvo e Casos de Uso

- **Público-Alvo:** Freelancers, estúdios de design, agências digitais e pequenas empresas de prestação de serviço.
- **Principais Dores Resolvidas:**
  - Desorganização no controle de escopos e prazos de projetos.
  - Dificuldade de saber "o que precisa ser feito hoje" (resolvido com Alertas e Kanban Global).
  - Planilhas financeiras complexas (resolvido com o Financeiro unificado para despesas e receitas).

---

## 3. Arquitetura e Tecnologias

A stack escolhida prioriza desenvolvimento rápido, tipagem dinâmica (no momento), segurança via banco de dados e componentização:

- **Frontend:** React, Vite, Tailwind CSS, React Router DOM.
- **Backend / BaaS:** Supabase.
  - Banco de Dados: PostgreSQL.
  - Autenticação: Supabase Auth.
  - Segurança de Dados: Row Level Security (RLS) habilitado em todas as tabelas. Os dados são isolados através de uma política que filtra por `owner_id`.
- **Estilo / UI:** O projeto segue uma estética visual baseada no Design System interno "DevControl", que prevê o uso focado em Dark Mode com glassmorphism, hierarquia tonal, e elementos com estado de pulso dinâmico (completamente aplicado na fase atual na tela de login).

---

## 4. Módulos e Funcionalidades (Baseado nas Fases de Desenvolvimento)

### Módulo de Autenticação e Conta (Fases 0 e 9)
- **Login Seguro:** Autenticação unificada por OAuth (Google) via Supabase. Sessão persistente.
- **Design Premium:** Tela de login no padrão DevControl (layout em split-screen, paleta azul/preto, glassmorphism e micro-interações).

### Módulo de Clientes (Fase 1)
- **Gestão Cadastral:** Criação, edição, visualização e exclusão de clientes (com exclusão em cascata).
- **Sistema de Tags (N:N):** Criação de tags customizáveis e associação múltipla de tags a clientes.
- **Filtros e Buscas:** Busca de clientes por nome/e-mail, filtro por status (ativo/inativo) e filtro por tags associadas.

### Módulo de Projetos (Fase 2)
- **Controle de Projetos:** Criação de projetos diretamente atrelados aos clientes.
- **Detalhamento do Escopo:** Campos detalhados para tipo de serviço, valor, datas de início e entrega, texto do escopo e texto da proposta.
- **Listagem e Gestão:** Filtros por status de projeto e cliente; visão unificada das entregas de cada conta.

### Módulo de Kanban / Gestão de Tarefas (Fases 3, 4 e 5)
- **Kanban por Projeto:** Cada projeto conta com o seu board. Criação de colunas customizadas e tarefas com recurso de _drag-and-drop_ integrado a um algoritmo de "LexoRank" (para garantir ordenação estável).
- **Log de Atividades:** Registro das mudanças de estado/movimentação de cards dentro de cada tarefa.
- **Kanban Global:** Uma visão de "Swimlanes" agregada, onde é possível visualizar tarefas de todos os projetos na mesma tela.
  - O sistema impede mover tarefas entre projetos diferentes, mantendo a integridade do Kanban Global.
  - Filtros robustos: Busca de texto, filtro por cliente, projeto, prioridade, status de "atrasada" e diferentes formas de ordenação (vencimento, prioridade e rank).
- **Pipelines:** Criação de "templates" de Kanban. Ao criar um novo projeto, é possível aplicar o template clonando suas colunas automaticamente, poupando tempo de setup de fluxos padronizados.

### Módulo Financeiro (Fases 6 e 7)
- **Recorrências e Faturas (Contas a Receber):**
  - Gestão de recorrências/assinaturas de clientes.
  - Geração em lote (com "1 clique") de todas as faturas (Invoices) do mês ativo. O sistema impede a duplicação de faturas no mesmo mês.
  - Baixa de pagamentos informando os métodos (Pix, Cartão, Transferência, etc.).
- **Despesas (Contas a Pagar):**
  - Lançamento de saídas/gastos, com data de vencimento e categorias.
  - Controle e baixa (status pendente e pago).
- **Fluxo de Caixa e Previsões:**
  - O Dashboard financeiro calcula automaticamente Entradas Previstas, Saídas Previstas e o Saldo Previsto do mês com base em itens pendentes ou vencidos.

### Módulo de Alertas Internos (Fase 8)
- **Central de Notificações:** Tela focada no monitoramento de ações necessárias (Call to Action diário do usuário).
- **Derivações Inteligentes:**
  - Cobranças e despesas vencidas.
  - Próximos vencimentos (janela de 7 dias).
  - Tarefas ativas com data de vencimento atrasada.
- **Interface:** Badge em tempo real no menu lateral que indica o total de pendências a resolver.

---

## 5. Mapa de Telas (Sitemap)

A navegação está estruturada com as seguintes rotas base:

**Acesso Público:**
- `/login` : Tela de entrada com UI Premium (DevControl).
- `/auth/callback` : Rota invisível de roteamento do OAuth.

**Acesso Restrito (Dashboard de Usuário):**
- `/app` : Home / Visão Geral
- `/app/alerts` : Central de Alertas
- `/app/clients` : Lista de Clientes
  - `/app/clients/new` | `/app/clients/:id/edit` : Criar/Editar Cliente
  - `/app/clients/:id` : Detalhes do Cliente
- `/app/tags` : Gestão Global de Tags
- `/app/projects` : Lista de Projetos
  - `/app/projects/new` | `/app/projects/:id/edit` : Criar/Editar Projeto
  - `/app/projects/:id` : Detalhes do Projeto
  - `/app/projects/:id/kanban` : Kanban do Projeto Selecionado
- `/app/kanban` : Visão do Kanban Global (Todos os Projetos)
- `/app/pipelines` : Lista de Templates de Pipeline
  - `/app/pipelines/:id` : Edição de Colunas do Pipeline
- `/app/finance` : Dashboard Financeiro Base
  - `/app/finance/recurrences` : Lista de Recorrências/Contratos Mensais
  - `/app/finance/recurrences/new` | `/:id` : Criar/Editar Recorrência
  - `/app/finance/invoices` : Lista de Cobranças (Faturas / Receitas)
  - `/app/finance/expenses` : Lista de Despesas (Saídas)
  - `/app/finance/expenses/new` | `/:id` : Criar/Editar Despesa

---

## 6. Próximos Passos (Evolução Contínua)

O sistema foi estruturado e concluído em sua fase primária até a fase 9. Os potenciais avanços incluem:

1. **Adoção Total do Design System:** Expandir o "DevControl" (já aplicado no Login e de forma parcial na arquitetura de CSS) para a área autenticada, aplicando dark-mode-first global.
2. **Camada de Relatórios Avançados:** Gráficos para o módulo Financeiro (faturamento acumulado) e de Produtividade (velocidade de entrega de projetos).
3. **PWA e Service Worker:** Como lembrete fixado pelo usuário ("Re-enable the service worker in 'assets/js/app.js' when development is finished..."), será necessário focar na experiência progressiva no fim do ciclo de desenvolvimento de layout.
