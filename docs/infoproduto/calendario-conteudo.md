# Calendário Editorial — Build in Public (12 semanas)

> Rota D da estratégia (`estrategia.md`). 3 conteúdos/semana, 36 pautas.
> Toda pauta deriva de um artefato real do repo — nada de conteúdo genérico de IA.
> Semanas 10–12 preparam o lançamento da mentoria beta.
> **Primeiro post pronto:** roteiro detalhado em [`primeiro-post-build-in-public.md`](primeiro-post-build-in-public.md) (pauta #1 da semana 1, variante pós-auditoria spec 015).

## Como usar este calendário

- **Formatos:** `Post` (LinkedIn/X, 800–1.500 caracteres), `Vídeo` (curto, 60–90s, tela + narração), `Artigo` (newsletter/blog, 800–1.500 palavras).
- **Ritmo semanal sugerido:** Post (seg) → Vídeo (qua) → Post ou Artigo (sex). Artigo 1x/semana alimenta a newsletter.
- **CTA padrão:** todo conteúdo termina com um convite. Nas semanas 1–9, o CTA dominante é a newsletter ("acompanhe a construção"). Nas semanas 10–12, migra para a lista de espera da mentoria.
- **Checklist antes de publicar:** nenhum screenshot com segredos, tokens, env vars ou dados reais de tenant.
- **Regra de reaproveitamento:** artigo da sexta pode virar 2–3 posts na semana seguinte se alguma pauta falhar.

---

## Fase 1 — Fundação e método (semanas 1–4)

Objetivo: apresentar o projeto, o método SDD e criar o hábito de acompanhar.

### Semana 1 — Apresentação do projeto

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 1 | "Estou construindo um SaaS de delivery com agentes de IA — e vou mostrar tudo em público" | Post | Demo em produção (inovagastro360.inovatitech.com.br) + visão geral do repo | Seguir o perfil para acompanhar a série |
| 2 | "Tour de 90 segundos pelo SaaS que estou construindo com IA" | Vídeo | Demo em produção: cardápio, pedidos, painel realtime | Assinar a newsletter (link na bio) |
| 3 | "Por que escolhi hamburgueria/delivery como primeiro vertical do meu SaaS" | Artigo | `memory-bank/projectbrief.md` | Assinar a newsletter |

### Semana 2 — O método antes do código

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 4 | "Spec Kit: por que escrevo spec antes de código (e a IA agradece)" | Post | `specs/012-cursor-tooling-sdd-tdd/spec.md` + skills `.cursor/skills/speckit-*` | Comentar "SPEC" para receber o template |
| 5 | "Minha constitution: as 10 regras que meus agentes de IA nunca quebram" | Post | `.specify/memory/constitution.md` | Assinar a newsletter |
| 6 | "Como dou memória permanente aos meus agentes no Cursor (memory-bank)" | Vídeo | `memory-bank/activeContext.md` + `AGENTS.md` mostrados na prática | Salvar o post + seguir |

### Semana 3 — Fundação técnica

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 7 | "A spec 000: o que decidi ANTES de escrever a primeira linha do monorepo" | Post | `specs/000-foundation/` | Assinar a newsletter |
| 8 | "Monorepo com 4 Workers Cloudflare desacoplados: a arquitetura em 1 diagrama" | Post | `docs/architecture.md` + wrangler configs (api-gateway, messaging-bus, realtime-hub, integrations) | Comentar dúvidas de arquitetura |
| 9 | "CI no GitHub Actions para monorepo de Workers: o pipeline completo" | Artigo | `.github/workflows/` | Assinar a newsletter |

### Semana 4 — Multitenancy (tema-âncora nº 1)

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 10 | "Multitenant de verdade: por que tenant_id em toda tabela não basta" | Post | `specs/001-auth-multitenant/spec.md` + schema Prisma | Salvar para referência |
| 11 | "RLS no Postgres em 90 segundos: o cadeado que a aplicação não consegue esquecer" | Vídeo | Policies RLS do banco + spec 001 | Assinar a newsletter |
| 12 | "Auth multitenant com agentes de IA: o que a spec me obrigou a pensar antes" | Artigo | `specs/001-auth-multitenant/` (spec + plan + tasks) | Assinar a newsletter |

---

## Fase 2 — Profundidade técnica e bastidores (semanas 5–8)

Objetivo: provar profundidade, gerar salvamentos/compartilhamentos, iniciar conversas 1:1.

### Semana 5 — Domínio: cardápio e pedidos

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 13 | "Modelar um cardápio online parece fácil — até chegar em adicionais e combos" | Post | `specs/002-cardapio-online/` + `specs/014-catalog-admin/` | Comentar como você modelaria |
| 14 | "O ciclo de vida de um pedido: a máquina de estados que segura o negócio" | Post | `specs/003-pedidos-core/spec.md` | Salvar para referência |
| 15 | "Do clique ao ticket na cozinha: um pedido atravessando 4 Workers" | Vídeo | Fluxo real em produção: cardápio → pedido → painel | Assinar a newsletter |

### Semana 6 — Eventos e resiliência (tema-âncora nº 2)

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 16 | "Como o outbox pattern salvou meus pedidos quando o messaging caiu" | Post | `specs/011-messaging-bus/` + tabela outbox no schema | Comentar "OUTBOX" para receber o diagrama |
| 17 | "Event-first: por que mudança de estado no meu SaaS vira evento, não UPDATE direto" | Artigo | `specs/011-messaging-bus/spec.md` + constitution | Assinar a newsletter |
| 18 | "Fila + outbox na prática: mostrando o código do messaging-bus" | Vídeo | Worker messaging-bus + adaptador Node | Seguir para a parte 2 |

### Semana 7 — Realtime e o mundo físico

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 19 | "Painel de pedidos em tempo real sem gambiarras: como estruturei o realtime-hub" | Post | `specs/004-realtime-paineis/` + Worker realtime-hub | Salvar para referência |
| 20 | "O SaaS encontra a impressora térmica: ESC/POS, o protocolo de 40 anos que ainda manda na cozinha" | Post | `specs/006-impressao-local/` + print-agent | Comentar se já sofreu com impressora |
| 21 | "Imprimindo um pedido de verdade: o print-agent em ação" | Vídeo | print-agent ESC/POS rodando com pedido real | Assinar a newsletter |

### Semana 8 — Deploy e produção

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 22 | "Cloudflare Workers + VPS Hetzner: por que não escolhi só um" | Post | `specs/010-cloudflare-workers/` + `specs/013-vps-runtime/` | Comentar sua stack de deploy |
| 23 | "Deploy com smoke test: o script que me impede de quebrar produção" | Vídeo | Scripts de deploy/smoke da VPS | Assinar a newsletter |
| 24 | "Adaptadores Node para rodar Workers na VPS: a decisão de portabilidade que ninguém fala" | Artigo | `specs/013-vps-runtime/` + código dos adaptadores | Assinar a newsletter |

---

## Fase 3 — Confiança, segurança e lançamento (semanas 9–12)

Objetivo: pautas de maior vulnerabilidade/autoridade e transição do CTA para a lista de espera da mentoria.

### Semana 9 — Segurança (tema-âncora nº 3: vulnerabilidade honesta)

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 25 | "RLS no Postgres: a falha que encontrei no meu próprio SaaS" | Post | Spec 015 (hardening de segurança) — achados P0/P1 | Assinar a newsletter (série completa por e-mail) |
| 26 | "Auditoria de segurança no próprio código: meu checklist P0/P1" | Artigo | Spec 015: rate limit em auth, validação de uploads, segredos fora do repo | Assinar a newsletter |
| 27 | "Pedi para os agentes de IA atacarem meu próprio SaaS. Olha o que acharam" | Vídeo | Sessão real de revisão de segurança com agentes no Cursor | Comentar "SEGURANÇA" para o checklist |

### Semana 10 — O método completo (aquecimento do lançamento)

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 28 | "15 specs depois: o que aprendi construindo um SaaS inteiro com SDD + agentes" | Post | Retrospectiva de `specs/000` a `specs/014` | Entrar na lista de espera da mentoria |
| 29 | "O fluxo completo: /speckit-specify → plan → tasks → implement, sem editar código na mão" | Vídeo | Skills speckit executando uma feature real de ponta a ponta | Entrar na lista de espera |
| 30 | "Quanto custou (em tempo e dinheiro) construir este SaaS com agentes de IA" | Artigo | Histórico do repo + memory-bank/progress.md + custos reais (Cursor, Cloudflare, Hetzner) | Entrar na lista de espera |

### Semana 11 — Abertura do carrinho

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 31 | "Vou ensinar o método completo: abriu a mentoria SaaS Multitenant com Agentes de IA" | Post | `ementa-curso.md` (os 8 módulos) + demo em produção como prova | Inscrever-se (link, vagas limitadas) |
| 32 | "O que você constrói em cada módulo da mentoria (tour pela ementa)" | Vídeo | `ementa-curso.md` + artefatos de cada módulo | Inscrever-se |
| 33 | "Perguntas que recebi sobre a mentoria — respostas diretas (preço, código, tempo)" | Post | FAQ real da lista de espera + política de acesso ao código | Inscrever-se (últimos dias) |

### Semana 12 — Fechamento e prova

| # | Título sugerido | Formato | Artefato-fonte | CTA |
|---|---|---|---|---|
| 34 | "Últimas 48h: o que a turma beta vai construir nas próximas 8 semanas" | Post | `ementa-curso.md` — entregáveis por módulo | Inscrever-se (carrinho fecha) |
| 35 | "Por que a beta é ao vivo e limitada (e por que a próxima turma será mais cara)" | Vídeo | Formato da oferta em `ementa-curso.md` | Inscrever-se (encerra hoje) |
| 36 | "Carrinho fechado: os números reais deste lançamento — e o que vem agora" | Artigo | Métricas reais do lançamento (lista, conversão, alunos) | Assinar a newsletter (retorno ao build in public) |

---

## Métricas a acompanhar por conteúdo

| Métrica | Onde | Para quê |
|---|---|---|
| Salvamentos e compartilhamentos | LinkedIn/X | Melhor sinal de valor percebido (melhor que likes) |
| Comentários com pergunta | LinkedIn/X | Insumo direto de pauta e de currículo do curso |
| Cliques na landing / inscritos | Newsletter | Métrica primária da Rota D |
| Taxa de abertura | Newsletter | Saúde da lista (meta > 40%) |
| Respostas a CTA de palavra-chave ("SPEC", "OUTBOX") | LinkedIn | Identificar leads quentes para conversas 1:1 |

Revisão quinzenal: os 3 conteúdos com melhor desempenho definem os temas a dobrar na quinzena seguinte. O calendário é guia, não contrato.
