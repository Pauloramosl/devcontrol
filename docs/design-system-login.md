# DevControl — Design System Login (V2)

Versão: 2.0  
Escopo: Tela de Login do DevControl  
Fase: 9 — UI/UX Modernização

---

# 1. Conceito Visual

A tela de login do DevControl representa o **núcleo operacional do sistema**.

Ela deve transmitir:

- controle
- conectividade
- fluxo de dados
- inteligência operacional
- tecnologia profissional

O login não deve parecer apenas um formulário.

Ele deve parecer **a entrada para uma central de comando**.

---

# 2. Assinatura Visual do DevControl

A identidade da login é baseada em um elemento chamado:

**Core Node**

O Core Node representa o centro de controle onde todos os módulos se conectam.

Exemplo conceitual:

    •
 •     •
    ●
 •     •
    •


O ponto central representa o **DevControl Core**.

As linhas representam:

- clientes
- projetos
- financeiro
- tarefas
- alertas

---

# 3. Estrutura da Tela

Layout obrigatório:

Split Screen

Desktop:

| HERO VISUAL | AUTH PANEL |
| 60% | 40% |

Tablet:

| HERO |
| AUTH |

Mobile:

| AUTH |
| HERO |


---

# 4. Hero Section (lado esquerdo)

Componentes obrigatórios:

1 Logo / Marca  
2 Headline principal  
3 Subheadline  
4 Core Node Visual  
5 Background Glow

---

# 5. Headline

Texto principal:

**O centro de comando do seu negócio digital**

Subheadline:

Gerencie clientes, projetos, finanças e execução em um único sistema.

---

# 6. Core Node Visual

Elemento central da tela.

Estrutura:

- 1 núcleo central luminoso
- 4–6 pontos orbitais
- linhas conectando os pontos
- partículas leves
- glow azul

O Core Node deve parecer **um sistema vivo**.

---

# 7. Motion System

As animações são parte essencial da identidade.

Todas devem ser:

- suaves
- contínuas
- discretas
- profissionais

---

# 8. Animação 1 — Core Pulse

O núcleo central pulsa lentamente.

scale: 1 → 1.18 → 1
opacity: 0.8 → 1 → 0.8


Duração:


4s
infinite
ease-in-out


---

# 9. Animação 2 — Orbit Nodes

Os pontos orbitais movem-se lentamente.


rotate around center


Duração:


18s
infinite
linear


---

# 10. Animação 3 — Connection Lines

As linhas têm leve movimento horizontal.


translateX


Duração:


20s
infinite
ease-in-out


---

# 11. Animação 4 — Glow Breathing

Glow azul pulsando atrás do Core.


opacity 0.2 → 0.4 → 0.2


Duração:


10s
infinite


---

# 12. Animação 5 — Hero Float

O bloco visual inteiro flutua levemente.


translateY(0)
translateY(-6px)
translateY(0)


Duração:


8s
infinite


---

# 13. Background

Gradiente principal:


linear-gradient(
135deg,
#05070D 0%,
#09111F 50%,
#0F172A 100%
)


Glow radial:


radial-gradient(
circle at center,
rgba(37,99,235,0.25),
transparent 70%
)


---

# 14. Paleta

Primary Blue


#2563EB


Blue Soft


#60A5FA


Cyan Accent


#22D3EE


Dark Background


#05070D
#09111F
#0F172A


---

# 15. Painel de Autenticação

Estilo:

Dark Glass


background: rgba(11,18,32,0.85)
backdrop-blur: 20px
border: 1px solid rgba(96,165,250,0.15)
border-radius: 16px


Shadow:


0 20px 60px rgba(0,0,0,0.45)


---

# 16. Inputs

Estilo:


bg-slate-900/70
border border-white/10
rounded-xl
px-4 py-3


Focus:


border-blue-500
ring-4 ring-blue-500/10


---

# 17. Botão Principal

Gradiente:


linear-gradient(
135deg,
#2563EB,
#3B82F6
)


Hover:


brightness 1.05
translateY(-1px)


Active:


scale(0.98)


---

# 18. Botão Google

Estilo:


bg-slate-900
border border-white/10
hover:border-blue-400/30


Nunca usar botão branco padrão.

---

# 19. Entrada da Página

Ao carregar:

Hero:


fade + slide up


Auth Panel:


fade + blur reduction


Duração:


400ms


---

# 20. Acessibilidade

Se `prefers-reduced-motion` estiver ativo:

Desativar:

- orbit
- float
- glow animation

Manter apenas transições básicas.

---

# 21. Regras Absolutas

Não usar:

- roxo
- violeta
- magenta
- fundos claros
- inputs brancos
- design genérico
- ilustrações cartunescas

---

# 22. Critério de Aceite

A login será considerada pronta se:

- possuir Core Node animado
- possuir glow ativo
- possuir animações suaves
- parecer um sistema vivo
- manter aparência premium
- manter UI totalmente em PT-BR