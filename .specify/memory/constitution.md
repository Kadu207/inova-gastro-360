<!--
Sync Impact Report
- Version change: template → 1.0.0
- Project: Inova Gastro 360
- Principles: SDD, TDD, multitenant, event-first, Cloudflare Workers
- Templates: spec/plan/tasks aligned
-->

# Inova Gastro 360 Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

Toda capacidade de produção MUST seguir: constitution → specify → plan → tasks → implement. Nenhum código de produção sem spec aprovada em `specs/`. Features MUST ser user stories independentemente testáveis com cenários de aceite em português.

### II. Test-First Discipline

TDD obrigatório em regras críticas: pedidos, status, caixa, pagamentos, permissões, isolamento multitenant. Ciclo red-green-refactor. CI MUST bloquear merge se testes falharem.

### III. Multitenant Isolation

Todo acesso a dados MUST incluir `tenant_id` (e `branch_id` quando aplicável). Row-Level Security no PostgreSQL é obrigatório. Testes de vazamento cross-tenant MUST existir. Violação é bloqueador de release.

### IV. Event-First Architecture

Mudanças de estado de pedido MUST publicar eventos via outbox → Cloudflare Queues. Workers de aplicação e mensageria MUST ser desacoplados via Service Bindings. Proibido acoplamento circular entre Workers.

### V. Simplicity & Observability

Preferir a solução mais simples que atende o spec (YAGNI). Logs estruturados JSON com `trace_id` em toda requisição. Segredos ONLY em Wrangler Secrets / env — nunca no repositório.

## Quality Gates

- Spec MUST passar checklist antes de `/speckit-plan`
- Plan MUST passar constitution check antes de `/speckit-tasks`
- `/speckit-analyze` MUST reportar zero inconsistências críticas antes de implementar
- Smoke suite MUST passar antes de tag de release
- PORT_REGISTRY.md MUST ser consultado antes de expor novas portas

## Security & Compliance

- HTTPS obrigatório em produção via Cloudflare Proxy
- RBAC por perfil; princípio do menor privilégio
- Rate limiting em rotas sensíveis
- LGPD: consentimento, auditoria, exportação de dados do titular
- Uploads: validação MIME, tamanho máximo, sem execução

## Development Workflow

1. Ler `memory-bank/activeContext.md` e `AGENTS.md` no início de cada sessão
2. Executar fases Spec Kit em ordem; atualizar memória ao final
3. Responder e documentar specs em português (pt-BR)
4. Nome do produto: **Inova Gastro 360** (não usar "Inova Food")

## Governance

Esta constitution supersede práticas ad-hoc. Emendas exigem bump semântico de versão e sync de templates. PRs MUST verificar compliance com princípios I–V.

**Version**: 1.0.0 | **Ratified**: 2026-06-14 | **Last Amended**: 2026-06-14
