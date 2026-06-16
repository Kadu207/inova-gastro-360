# Contexto técnico — Inova Gastro 360

## Ambiente local
- Node.js v24+
- Docker Desktop
- npm workspaces + Turborepo

## Serviços Docker (docker-compose.yml)
- Postgres 16 → `127.0.0.1:5440`
- Redis 7 → `127.0.0.1:6390`

## Cloudflare (produção)
- Pages/Workers para Next.js e API edge
- Queues para mensageria
- Durable Objects para realtime
- Hyperdrive → Postgres na Hetzner
- WAF + Proxy + Turnstile

## VPS Hetzner (usuário provisiona)
- Docker Compose: Postgres, n8n, Chatwoot, MinIO
- Nginx/Traefik na frente
- Portas internas conforme PORT_REGISTRY.md

## CI/CD
GitHub Actions: lint → typecheck → unit → contract → build → wrangler dry-run → E2E
