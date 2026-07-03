# Feature Specification: 015-security-hardening

**Feature Branch**: `feat/015-security-hardening`
**Created**: 2026-07-02
**Status**: In Progress
**Product**: Inova Gastro 360
**Input**: Auditoria técnica de 2026-07-02 — 27 achados (5 críticos, 10 altos). Endurecer segurança, completar autenticação, ativar RLS em runtime e criar fundação de onboarding/billing para viabilizar comercialização (SaaS e boilerplate).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Segredos obrigatórios em produção (Priority: P0)

Como **operador da plataforma**, quero que a API se recuse a operar sem `JWT_SECRET` e `OUTBOX_FLUSH_SECRET` configurados, para que nenhum ambiente rode com segredos de desenvolvimento.

**Acceptance Scenarios**:

1. **Given** `JWT_SECRET` ausente, **When** qualquer rota autenticada ou de login é chamada, **Then** a API responde 500 `server_misconfigured` e loga o motivo — nunca usa fallback hardcoded.
2. **Given** `OUTBOX_FLUSH_SECRET` ausente, **When** `POST /internal/outbox/flush` é chamado, **Then** responde 403 — a presença de `DATABASE_URL` não autoriza mais o flush.
3. **Given** seed executado sem `SEED_ADMIN_PASSWORD`, **When** roda em ambiente não-CI, **Then** gera senha aleatória e a imprime uma única vez (não versionada).

### User Story 2 - Login protegido contra brute-force (Priority: P0)

Como **operador**, quero rate limiting no login para impedir força bruta de senhas.

**Acceptance Scenarios**:

1. **Given** mais de 10 tentativas de login falhas do mesmo IP+e-mail em 15 minutos, **When** nova tentativa chega, **Then** responde 429 `too_many_attempts` com `retry-after`.
2. **Given** janela expirada, **When** nova tentativa chega, **Then** o contador reinicia e o login funciona normalmente.

### User Story 3 - CORS restrito (Priority: P0)

Como **operador**, quero que a API aceite apenas origens permitidas.

**Acceptance Scenarios**:

1. **Given** `CORS_ALLOWED_ORIGINS` configurado, **When** request chega com `Origin` fora da lista, **Then** a resposta não inclui `access-control-allow-origin` para essa origem.
2. **Given** `CORS_ALLOWED_ORIGINS` ausente em dev, **When** request local chega, **Then** origens locais (`localhost`/`127.0.0.1`) continuam funcionando.

### User Story 4 - Sessão completa: refresh e logout (Priority: P1)

Como **usuário do painel**, quero que minha sessão seja renovada automaticamente e que o logout revogue a sessão no servidor.

**Acceptance Scenarios**:

1. **Given** refresh token válido, **When** `POST /api/v1/auth/refresh`, **Then** retorna novo access token (e rotaciona o refresh token, invalidando o anterior).
2. **Given** refresh token revogado ou expirado, **When** refresh é chamado, **Then** responde 401.
3. **Given** usuário logado, **When** `POST /api/v1/auth/logout`, **Then** a sessão é removida do banco e o refresh token deixa de funcionar.
4. **Given** access token expirado no web, **When** uma chamada API falha com 401, **Then** o front tenta refresh transparente antes de redirecionar ao login.

### User Story 5 - RLS ativo em runtime (Priority: P1)

Como **operador multitenant**, quero defense-in-depth no Postgres: mesmo que um handler esqueça o `WHERE tenant_id`, o RLS impede vazamento cross-tenant.

**Acceptance Scenarios**:

1. **Given** migration RLS aplicada, **When** conexão da API abre transação com `SET LOCAL app.current_tenant_id`, **Then** queries só retornam linhas do tenant corrente.
2. **Given** contexto de tenant não configurado, **When** query em tabela protegida roda com o role da aplicação, **Then** retorna zero linhas (fail-closed).
3. **Given** role de aplicação sem BYPASSRLS, **When** RLS habilitado com FORCE, **Then** nem o owner das tabelas bypassa as policies.

### User Story 6 - Comunicação interna autenticada (Priority: P1)

Como **operador**, quero que rotas internas entre workers e o WebSocket de realtime exijam credencial.

**Acceptance Scenarios**:

1. **Given** `INTERNAL_SHARED_SECRET` configurado, **When** `/internal/publish`, `/internal/notify` ou `/broadcast` recebem request sem o header `x-internal-secret` correto, **Then** respondem 403.
2. **Given** cliente WebSocket sem token JWT válido para a filial, **When** tenta conectar em `/ws`, **Then** a conexão é rejeitada.

### User Story 7 - Onboarding de tenant (Priority: P2)

Como **super admin da plataforma**, quero provisionar um novo tenant (empresa + filial + usuário admin) via API para ativar clientes sem SQL manual.

**Acceptance Scenarios**:

1. **Given** usuário com role `super_admin`, **When** `POST /api/v1/admin/tenants` com nome/slug/admin, **Then** cria tenant, company, branch, usuário admin e vínculo de filial em transação única.
2. **Given** usuário sem role `super_admin`, **When** chama a rota, **Then** responde 403.
3. **Given** slug já existente, **When** tenta criar, **Then** responde 409.

### User Story 8 - Fundação de billing (Priority: P2)

Como **operador SaaS**, quero planos e assinaturas modelados no banco para preparar a cobrança.

**Acceptance Scenarios**:

1. **Given** migration aplicada, **Then** existem tabelas `subscription_plans` e `subscriptions` com RLS por tenant (planos são globais; assinaturas por tenant).
2. **Given** tenant provisionado, **When** onboarding conclui, **Then** assinatura `trial` é criada automaticamente com o plano padrão.

## Success Criteria

- Nenhum segredo ou senha real versionada no repositório (senha demo removida de docs/scripts — usar env/placeholders).
- `npm run test` verde incluindo novos testes de refresh, rate limit, CORS, RBAC e provisioning.
- RLS aplicado por migration e exercitado por teste de integração cross-tenant.
- Front web renova sessão via refresh sem intervenção do usuário.
- Segundo tenant ativável via API em menos de 1 minuto.

## Out of Scope

- Gateway de pagamento real (spec 007) — apenas fundação de dados de billing.
- UI de signup self-service — onboarding é via API super_admin nesta fase.
- Migração do usuário do banco para role dedicado na VPS (documentada como passo operacional).
