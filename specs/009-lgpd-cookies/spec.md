# Feature Specification: 009-lgpd-cookies

**Status**: Concluído — Onda 4
**Product**: Inova Gastro 360

## Entregue Onda 4

- Modal de preferências de cookies (essencial sempre ativo / analytics / marketing), com link real para `/privacidade`
- Tabela `consent_records` (Prisma + migração `20260731160000_lgpd_009`) com `tenant_id`, `branch_id`, `user_id`, `subject_id`, IP/user-agent e RLS por tenant
- API pública `POST /api/v1/lgpd/consent` (sem auth, resolve tenant via branch/subdomínio, grava consentimento)
- Páginas públicas `/privacidade` e `/termos` com conteúdo pt-BR completo (Inova Gastro 360 / inovagastro360.inovatitech.com.br), estilizadas com CSS próprio do projeto
- API `GET /api/v1/lgpd/export` — exportação JSON dos dados do titular autenticado (perfil, sessões, consentimentos, solicitações de esquecimento, trilha de auditoria)
- Tabela `erasure_requests` + workflow "direito ao esquecimento":
  - `POST /api/v1/lgpd/erasure` — cria solicitação (admin do tenant)
  - `GET /api/v1/lgpd/erasure` — lista solicitações do tenant (admin)
  - `PATCH /api/v1/lgpd/erasure/:id` — atualiza status (`pending` → `in_progress`/`completed`/`rejected`), com `audit_logs`
  - Isolamento cross-tenant garantido (RLS + verificação de tenant na rota)
- Página admin `apps/web/src/app/(os)/dashboard/lgpd/page.tsx` — exportar dados do titular e gerenciar solicitações de esquecimento
- `CookieBanner.tsx` evoluído: usa `apps/web/src/lib/lgpd.ts` (subjectId persistente, serialização de preferências, `apiFetch` para submeter consentimento) e link real para `/privacidade`
- Testes: `apps/workers/api-gateway/src/routes/lgpd.test.ts` (consent, export, erasure CRUD, RBAC, isolamento cross-tenant) e `apps/web/src/lib/lgpd.test.ts` (utilitários de front-end)

## Fora de escopo (próximas ondas)

- Anonimização/purga automática de dados após aprovação de esquecimento (hoje o status é registrado; a purga efetiva é manual/operacional)
- Relatório de impacto (DPIA) e inventário de dados pessoais
- Notificação automática ao titular sobre conclusão da solicitação
