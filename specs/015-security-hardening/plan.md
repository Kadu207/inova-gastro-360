# Plan: 015-security-hardening

**Data**: 2026-07-02 · **Spec**: `spec.md`

## Decisões técnicas

| Tema | Decisão | Racional |
|------|---------|----------|
| JWT secret | `getJwtSecret(env)` central que lança `ConfigError` se ausente; handler converte em 500 `server_misconfigured` | Fail-fast sem fallback; um único ponto de leitura |
| Rate limit | In-memory por processo (Map com janela deslizante), chave `ip:email`, 10 tentativas/15min | VPS roda 1 processo por container; Redis fica como evolução (interface isolada) |
| CORS | `CORS_ALLOWED_ORIGINS` (CSV) na env; sem env em dev → permite localhost; produção define domínios | Eco de `Origin` permitido + `vary: origin` |
| Refresh | Rota `POST /auth/refresh` com rotação: valida JWT tipo refresh + hash bcrypt na tabela `sessions`; emite novo par e apaga sessão antiga. `POST /auth/logout` remove sessão | Sessões já existem; só faltava o endpoint |
| Web | `apiFetch()` wrapper: em 401 tenta refresh 1x e repete; armazena `refreshToken` no login | Mínimo invasivo nas páginas existentes |
| RLS | Migration Prisma `rls_enable` com conteúdo do `rls.sql` + `FORCE ROW LEVEL SECURITY`; helper `withTenant(sql, tenantId, fn)` que roda `SET LOCAL` em transação (tenantId validado como UUID) | Handlers adotam gradualmente; policies novas para tabelas billing |
| Interno | Header `x-internal-secret` verificado em messaging-bus, integrations e realtime (`/broadcast`); api-gateway envia o header via `publishOutboxEvent`/dispatch | Secret único `INTERNAL_SHARED_SECRET` |
| WebSocket | `/ws?branchId=&token=` — valida JWT e membership da branch antes do upgrade; painéis passam token | Fecha vazamento realtime |
| RBAC | `requireRole(user, ...roles)` em middleware; provisioning exige `super_admin`; rotas admin de catálogo exigem papéis de gestão | ROLES já existem em config |
| Onboarding | `POST /api/v1/admin/tenants` transacional (tenant, company, branch, admin user, user_branch_access, subscription trial) | Usa `CreateTenantSchema` estendido |
| Billing | Tabelas `subscription_plans` (global) e `subscriptions` (tenant, RLS); plano `starter` seedado; assinatura `trial` no onboarding | Fundação para spec 007 |
| Senha demo | Seed usa `SEED_ADMIN_PASSWORD` (fallback aleatório impresso); scripts smoke exigem `SMOKE_PASSWORD`; docs trocam senha por placeholder | Rotação da senha real é passo operacional na VPS |
| Refactor | `parseJsonBody` movido para `apps/workers/api-gateway/src/lib.ts` | Elimina 5 duplicações |

## Riscos

- RLS pode quebrar queries existentes → mitigado: role de app é o mesmo usuário atual (owner) até o passo operacional; testes de integração validam com `SET LOCAL`.
- Rate limit in-memory zera a cada restart → aceitável para o perfil de ataque atual.
- Rotação de refresh token exige web atualizado em conjunto → mesmo PR.

## Passo operacional pós-merge (VPS)

1. Definir `JWT_SECRET`, `OUTBOX_FLUSH_SECRET`, `INTERNAL_SHARED_SECRET`, `CORS_ALLOWED_ORIGINS` em `.env.production`.
2. `npx prisma migrate deploy` (aplica RLS + billing).
3. Rotacionar senha do admin demo (`UPDATE users SET password_hash=...` via script `rotate-admin-password-vps.sh`).
4. Recriar containers.
