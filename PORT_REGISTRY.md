# Inova Gastro 360 — Registro de Portas

**Última auditoria:** 2026-06-14 (ambiente local Windows + inventário Docker)

## Portas reservadas para Inova Gastro 360

| Serviço | Porta local | Porta VPS | Binding | Variável |
|---------|-------------|-----------|---------|----------|
| Next.js Web | **3102** | **3102** | 127.0.0.1 | `WEB_PORT` |
| API dev proxy | **3101** | — | 127.0.0.1 | `API_DEV_PORT` |
| PostgreSQL | **5440** | **5440** | 127.0.0.1 | `POSTGRES_PORT` |
| Redis | **6390** | **6390** | 127.0.0.1 | `REDIS_PORT` |
| n8n (opcional local) | **5680** | **5680** | 127.0.0.1 | `N8N_PORT` |
| MinIO API | **9100** | **9100** | 127.0.0.1 | `MINIO_PORT` |
| MinIO Console | **9101** | **9101** | 127.0.0.1 | `MINIO_CONSOLE_PORT` |
| Worker api-gateway (wrangler dev) | **8792** | — | 127.0.0.1 | `WRANGLER_API_PORT` |
| Worker messaging-bus | **8789** | — | 127.0.0.1 | `WRANGLER_MSG_PORT` |
| Worker realtime-hub | **8790** | — | 127.0.0.1 | `WRANGLER_RT_PORT` |
| Worker integrations | **8791** | — | 127.0.0.1 | `WRANGLER_INT_PORT` |

## Portas ocupadas no ambiente local (NÃO usar)

| Porta | Sistema |
|-------|---------|
| 80 | excellence_dental nginx |
| 3333 | dental-lab-system API |
| 5432 | PostgreSQL nativo |
| 5433–5437 | dental-lab, excellence, licencas, casadapaz |
| 54321–54327 | Supabase local |
| 5678 | casadapaz n8n |
| 6380 | casadapaz redis |
| 8000 | casadapaz_ai |
| 8081 | GLPI |
| 8787 | inova-devsecops webhook |
| 8788 | inova-app (outro projeto — NÃO usar) |
| 8090–8091 | GLPI portal / excellence_hml |
| 8880, 8443 | GLPI caddy |
| 9180 | dental-lab web |

## VPS Hetzner — portas já em uso (referência)

| Porta | Sistema provável |
|-------|------------------|
| 80, 443 | Nginx reverse proxy (Excellence Dental e outros) |
| 5434+ | Postgres de outros stacks Docker |

**Regra VPS:** Inova Gastro 360 usa **5440** (Postgres) e **6390** (Redis). Não expor Postgres/Redis publicamente — apenas `127.0.0.1`. Tráfego público via Cloudflare Proxy.

## Domínio

- Produção: `https://inovagastro360.inovatitech.com.br`
- API edge: `api.inovagastro360.inovatitech.com.br` (Worker)
- Realtime: `rt.inovagastro360.inovatitech.com.br` (Worker + DO)
