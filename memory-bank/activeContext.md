# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-16

## Status atual
- **Ondas 0–2:** concluídas e validadas E2E
- **Onda 3:** core entregue (realtime, messaging, print jobs, integrations, LGPD banner)
- **Onda 4:** financeiro completo adiado (spec 005)

## Portas ativas (dev)
| Serviço | Porta |
|---------|-------|
| Web | 3102 |
| API gateway | **8792** (8788 ocupada por inova-app) |
| messaging-bus | 8789 |
| realtime-hub | 8790 |
| integrations | 8791 |
| Postgres | 5440 |
| Redis | 6390 |

## Comandos dev
```bash
docker compose up -d
npm run db:seed
npm run dev:stack   # 5 workers: web, api, msg, rt, int
```

**Demo:** `admin@inovagastro360.local` / `InovaGastro360!` (tenant `demo-burger`)

## E2E validado
Login → catálogo (4 produtos) → pedido #1001 → status accepted → outbox (3 eventos) → print_job criado

## Ambiente Linux (2026-06-16)
- Checklist completo: `memory-bank/linux-windows-alignment.md`
- Spec Kit bash: `.specify/scripts/bash/` (script `sh` em init-options)
- MCP Cloudflare (bindings/builds/observability): autenticados
- MCP GitLab: pendente auth manual no Cursor Settings
- Git remote GitHub: aguardando URL do usuário
