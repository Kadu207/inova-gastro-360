# Tasks: 009-lgpd-cookies (retrospectivo)

## Entregue (básico Onda 3)

- [x] T001 Componente CookieBanner com aria dialog
- [x] T002 Persistência localStorage `cookie-consent`
- [x] T003 Integrado no root layout
- [x] T004 Texto LGPD + link política (placeholder)

## Onda 4 — avançado (concluído)

- [x] T010 Modal preferências (essencial/analytics/marketing) — `CookieBanner.tsx`
- [x] T011 API POST `consent_records` + `tenant_id` + RLS — `routes/lgpd.ts`, migração `20260731160000_lgpd_009`
- [x] T012 Página política privacidade + termos — `app/privacidade`, `app/termos`
- [x] T013 Exportação dados titular (JSON) — `GET /api/v1/lgpd/export`
- [x] T014 Direito ao esquecimento (workflow admin) — `erasure_requests` + rotas POST/GET/PATCH + `dashboard/lgpd`
- [x] T015 Testes UI consent + API — `apps/web/src/lib/lgpd.test.ts`, `apps/workers/api-gateway/src/routes/lgpd.test.ts`

## Notas de implementação

- `resolvePublicTenantId` foi ajustado para **não** cair no tenant demo quando um `branch_id` inválido é enviado (evita gravar consentimento no tenant errado).
- `writeAuditLog` foi generalizado para aceitar `userId` nulo e ações livres; `writeLgpdAuditLog` cobre as ações de LGPD (`lgpd.erasure_request.created`, `lgpd.erasure_request.status_updated`, etc.).
- Página admin `apps/web/src/app/(os)/dashboard/lgpd/page.tsx` adicionada ao menu (`apps/web/src/lib/nav.ts`) como "Privacidade / LGPD".
