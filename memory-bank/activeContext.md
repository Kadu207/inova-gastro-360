# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-09-01

## Security audit — correções restantes
- F03/F05–F08/F10–F12 implementados localmente, sem commit
- Realtime isolado por `tenantId:branchId`; guest pay/status exige prova por telefone
- JWT web somente em memória, refresh por cookie HttpOnly; navegação filtrada por papel
- LGPD export restrito a admins e sem pedidos quando não existe vínculo verificável no schema
- Testes direcionados: auth 14, realtime 7, runtime-node 13, messaging 5, rotas API 19 — todos verdes
- Typecheck dos 7 workspaces alterados: verde

## Deploy + Git ✅
- PR [#36](https://github.com/Kadu207/inova-gastro-360/pull/36) **MERGED** em `master`
- VPS: `sync-git-vps.sh master` + recreate realtime/messaging/api
- `DATABASE_URL` = `inova_gastro_app` (RLS)
- Asaas: não finalizado (credenciais pendentes)

## Feature Spec Kit
- Ativa: `specs/018-tenant-admin`
- Próxima: `specs/019-os-shell-responsive`

## Runtime
- VPS `gestaoti@128.140.77.31` (SSH `inovati` :65025) → `~/inova-gastro-360`
