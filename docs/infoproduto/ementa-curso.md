# Ementa — Curso/Mentoria "SaaS Multitenant com Agentes de IA"

> Rota A da estratégia (`estrategia.md`). Caso real de ponta a ponta: o Inova Gastro 360,
> SaaS de hamburgueria/delivery em produção (inovagastro360.inovatitech.com.br).
> Promessa central: **sair com um SaaS multitenant funcional e com o método (SDD + Spec Kit + agentes) para evoluí-lo sozinho.**

## Para quem é / para quem não é

| É para | Não é para |
|---|---|
| Dev BR (júnior avançado a sênior) que quer construir um SaaS próprio usando agentes de IA com disciplina de engenharia | Quem procura "renda passiva sem programar" |
| Dev que já usa Cursor/Copilot mas sente que a IA gera código sem direção | Quem não sabe programar nada (pré-requisito: JS/TS básico e Git) |
| Freelancer/consultor que quer entregar SaaS multitenant para clientes | Quem quer curso teórico de arquitetura sem colocar a mão no código |

**Projeto do aluno:** cada aluno constrói o próprio SaaS multitenant (o vertical é livre — delivery, agendamento, pet shop) aplicando cada módulo ao seu projeto. O Inova Gastro 360 é o mapa; o território é do aluno.

---

## Estrutura: 8 módulos

Duração de referência: 8 semanas na mentoria beta (1 módulo/semana), autoconduzido no evergreen.

### M1 — Metodologia: SDD + Spec Kit + agentes com memória

Por que a IA sem processo gera lixo em escala — e como o processo resolve.

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 1.1 O problema do "vibe coding" e o que é Spec-Driven Development | Entender por que spec antes de código muda o resultado dos agentes | `specs/012-cursor-tooling-sdd-tdd/spec.md` | Diagnóstico escrito do próprio fluxo atual com IA |
| 1.2 Constitution: as regras invioláveis do projeto | Escrever os princípios que os agentes nunca podem quebrar | `.specify/memory/constitution.md` | Constitution do projeto do aluno (v1) |
| 1.3 Memory-bank: memória persistente entre sessões de agente | Configurar contexto que sobrevive ao fim do chat | `memory-bank/activeContext.md`, `projectbrief.md`, `AGENTS.md` | Memory-bank inicializado no repo do aluno |
| 1.4 As 14 skills speckit no Cursor: specify → plan → tasks → implement | Rodar o ciclo completo numa feature de brinquedo | `.cursor/skills/speckit-*` | Primeira spec gerada e implementada via skills |

### M2 — Fundação: monorepo, Workers e CI

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 2.1 A spec de fundação: decidir a arquitetura antes do código | Aprender a registrar decisões estruturais como spec | `specs/000-foundation/` | Spec 000 do projeto do aluno |
| 2.2 Monorepo com 4 Workers desacoplados (api-gateway, messaging-bus, realtime-hub, integrations) | Entender fronteiras de serviço e Service Bindings | `docs/architecture.md` + wrangler configs | Monorepo criado com pelo menos 2 workers |
| 2.3 Next.js + Prisma + Postgres: o trio de aplicação | Subir app web + ORM + banco local | Schema Prisma do projeto | App rodando local com migration inicial |
| 2.4 CI no GitHub Actions: teste verde antes de merge | Pipeline que bloqueia regressão desde o dia 1 | `.github/workflows/` | CI verde no repo do aluno |

### M3 — Auth e multitenancy com RLS

O módulo mais valioso do curso — é onde a maioria dos SaaS falha em silêncio.

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 3.1 Modelagem multitenant: tenant_id em tudo, e por quê | Desenhar o modelo de dados com isolamento por tenant | `specs/001-auth-multitenant/spec.md` | Schema multitenant do projeto do aluno |
| 3.2 RLS no Postgres: defesa em profundidade no banco | Escrever e testar policies de Row-Level Security | Policies RLS + migrations do projeto | RLS ativo e testado em todas as tabelas de domínio |
| 3.3 Auth de ponta a ponta: sessão, papéis e contexto de tenant | Implementar login com propagação de tenant até a query | `specs/001-auth-multitenant/` (plan + tasks) | Auth funcional com 2 tenants isolados |
| 3.4 TDD nos caminhos críticos: testes de isolamento entre tenants | Provar por teste que o tenant A nunca vê o tenant B | Suíte de testes de multitenancy + constitution (testes críticos) | Teste automatizado de isolamento passando no CI |

### M4 — Domínio: catálogo, pedidos e eventos (outbox)

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 4.1 Modelando o domínio: catálogo com variações e regras reais | Traduzir regras de negócio confusas em spec e schema | `specs/002-cardapio-online/` + `specs/014-catalog-admin/` | Spec + schema do domínio central do aluno |
| 4.2 A máquina de estados do pedido | Implementar ciclo de vida com transições explícitas | `specs/003-pedidos-core/spec.md` | Máquina de estados da entidade central do aluno |
| 4.3 Event-first com outbox pattern: mudança de estado vira evento | Implementar outbox + processamento assíncrono confiável | `specs/011-messaging-bus/` + tabela outbox | Outbox funcionando com pelo menos 1 evento consumido |
| 4.4 Estudo de caso: o dia em que o messaging caiu e nenhum pedido se perdeu | Analisar resiliência na prática (incidente real) | Logs/spec do incidente + retry no messaging-bus | Postmortem escrito de um cenário de falha do próprio projeto |

### M5 — Realtime e integração com o mundo físico

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 5.1 Painéis em tempo real: arquitetura do realtime-hub | Entregar atualização instantânea sem polling | `specs/004-realtime-paineis/` + Worker realtime-hub | Painel realtime da entidade central do aluno |
| 5.2 Impressão local com ESC/POS: o print-agent | Conectar o SaaS a hardware local (impressora térmica) | `specs/006-impressao-local/` + código do print-agent | Agente local funcional OU integração equivalente do seu vertical (opcional) |
| 5.3 Integrações externas: o worker integrations e webhooks | Isolar terceiros (pagamentos, chat, automação) num worker próprio | `specs/007-pagamentos/`, `specs/008-chatwoot-n8n/` | Spec de 1 integração externa do projeto do aluno |

### M6 — Deploy: VPS + Cloudflare, do zero à produção

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 6.1 A decisão híbrida: Workers na Cloudflare, runtime na VPS | Avaliar trade-offs de custo, controle e portabilidade | `specs/010-cloudflare-workers/` + `specs/013-vps-runtime/` | ADR (registro de decisão) de deploy do aluno |
| 6.2 Adaptadores Node: rodar o mesmo código de Worker na VPS | Escrever a camada de portabilidade | Código dos adaptadores Node (spec 013) | Worker do aluno rodando fora da Cloudflare |
| 6.3 Deploy na VPS Hetzner com scripts e smoke tests | Automatizar deploy com verificação pós-deploy | Scripts de deploy/smoke da VPS | Deploy automatizado com smoke test verde |
| 6.4 DNS, HTTPS e domínio: colocando no ar de verdade | Publicar com Cloudflare na frente (TLS, cache, WAF) | Configuração de produção do inovagastro360.inovatitech.com.br | SaaS do aluno acessível em domínio próprio com HTTPS |

### M7 — Segurança e hardening (caso real da spec 015)

Módulo construído sobre a auditoria real do próprio Inova Gastro 360 — com as falhas que foram encontradas e corrigidas.

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 7.1 A auditoria P0/P1: o que encontrei no meu próprio SaaS | Aprender a classificar e priorizar achados de segurança | Spec 015 (hardening) — relatório de achados | Auditoria P0/P1 do próprio projeto (com agentes de IA) |
| 7.2 Segredos fora do repo: cofres, env e o erro que quase todo mundo comete | Sanear segredos e configurar gestão segura | Spec 015 — saneamento de segredos | Repo do aluno sem nenhum segredo versionado |
| 7.3 Rate limit em auth e validação de uploads | Fechar as duas portas de abuso mais comuns | Spec 015 — rate limit + validação de upload | Rate limit e validação ativos e testados |
| 7.4 Revalidando o RLS: testes adversariais de isolamento | Atacar o próprio sistema antes que alguém ataque | Suíte de testes adversariais da spec 015 | Bateria de testes adversariais no CI do aluno |

### M8 — Do MVP ao negócio: billing, onboarding e go-to-market

| Aula | Objetivo | Artefato do repo | Entregável do aluno |
|---|---|---|---|
| 8.1 Billing e assinaturas num SaaS multitenant | Modelar planos, cobrança e inadimplência | `specs/005-financeiro/` + `specs/007-pagamentos/` | Spec de billing do projeto do aluno |
| 8.2 Onboarding de tenant: do cadastro ao primeiro valor | Reduzir o tempo até o "aha moment" do cliente | Fluxo de onboarding do Inova Gastro 360 | Fluxo de onboarding implementado (mínimo viável) |
| 8.3 LGPD e cookies: o mínimo legal sem travar o produto | Cumprir o básico regulatório BR | `specs/009-lgpd-cookies/` | Checklist LGPD aplicado ao projeto do aluno |
| 8.4 Go-to-market para dev: conseguir os 3 primeiros clientes | Sair do código e vender (o caso real do Inova Gastro 360) | Histórico comercial do projeto + memory-bank/progress.md | Plano de 30 dias para os 3 primeiros clientes |

---

## Formatos de oferta

### Formato 1 — Mentoria beta ao vivo (estreia)

| Item | Definição |
|---|---|
| Turma | 8–15 alunos (limitada de verdade — capacidade de acompanhamento) |
| Duração | 8 semanas, 1 encontro ao vivo/semana (90 min: módulo + revisão de projetos) |
| Suporte | Comunidade fechada (WhatsApp/Discord) + revisão assíncrona dos entregáveis |
| Preço | R$ 1.500–2.500 (abaixo do teto de R$ 5k; alunos beta assumem risco e pagam menos) |
| Contrapartida | Depoimento e permissão de uso das dúvidas como material do curso gravado |
| Gravação | Todos os encontros gravados — viram a base do curso evergreen |

### Formato 2 — Curso gravado evergreen (após a beta)

| Item | Definição |
|---|---|
| Conteúdo | Gravações da beta reeditadas + aulas de estúdio para os pontos fracos identificados |
| Preço | R$ 497–997 (curso solo) / R$ 1.497–1.997 (curso + 3 sessões de dúvidas em grupo/mês) |
| Plataforma | Hotmart ou Kiwify na largada (checkout + área de membros prontos); área própria só quando o volume justificar |
| Atualização | 1 revisão/semestre — o repo continua evoluindo e o curso acompanha |

### Bônus possíveis (escolher 2–3, não todos)

- **Biblioteca de specs:** as 15 specs reais (000–014) como referência anotada.
- **Pack de skills:** as 14 skills speckit prontas para instalar no Cursor.
- **Sessão de arquitetura 1:1** (só na mentoria, primeiros inscritos).
- **Template de constitution + memory-bank** pronto para copiar.
- **Acesso antecipado ao boilerplate** (Rota B) com desconto de aluno.

### Política de acesso ao código

| Nível | O que inclui | Condições |
|---|---|---|
| Leitura guiada (incluso em todos os formatos) | Acesso de leitura a um **repo espelhado** do Inova Gastro 360, com trechos sensíveis removidos | Vinculado à conta do aluno; sem redistribuição |
| Licença de uso (mentoria e tier superior do curso) | Direito de usar trechos e padrões no projeto próprio do aluno, inclusive comercial | Contrato simples: proibida a redistribuição, revenda ou publicação do código como template/boilerplate |
| Sem acesso ao repo principal | O repo de produção nunca é compartilhado | Segredos, dados de clientes e histórico ficam fora do alcance |

Pré-requisito inegociável antes de qualquer acesso: conclusão da faxina de segurança P0/P1 (spec 015) no espelho compartilhado.

---

## Critérios de sucesso do curso

| Métrica | Meta |
|---|---|
| Conclusão dos entregáveis por módulo (beta) | ≥ 60% dos alunos |
| Alunos com SaaS no ar (domínio + HTTPS) ao fim do M6 | ≥ 50% |
| NPS da beta | ≥ 8/10 recomendariam |
| Depoimentos utilizáveis na página do evergreen | ≥ 5 |

Esses números decidem se a Rota A avança para o evergreen ou se a ementa volta para revisão (ver gates em `estrategia.md`).
