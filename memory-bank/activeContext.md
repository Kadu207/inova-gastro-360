# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-08-18

## Deploy VPS (hardening segurança) ✅
- Código sincronizado via scp (branch local ainda sem push)
- Recriados: `realtime-hub`, `messaging-bus`, `api-gateway`
- `DATABASE_URL` confirmado: `inova_gastro_app` (RLS ativo)
- Health: realtime 200, api 200, messaging ok na rede Docker
- Testes locais: auth / realtime-hub / orders / print-jobs / catalog-upload / db / image-policy ✅
- Smoke: WS sem auth → 401; broadcast sem secret → 403; API pública → 200
- **Asaas:** não finalizado (credenciais pendentes)

## Feature Spec Kit
- Ativa: `specs/018-tenant-admin`
- Próxima: `specs/019-os-shell-responsive`

## Runtime
- VPS `gestaoti@128.140.77.31` (SSH `inovati` :65025) → `~/inova-gastro-360`

## Login demo
- `demo-burger` / `admin@inovagastro360.local` / `SEED_ADMIN_PASSWORD`
