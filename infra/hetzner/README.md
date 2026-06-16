# Hetzner VPS — Inova Gastro 360

## Portas reservadas (ver PORT_REGISTRY.md)

- PostgreSQL: `127.0.0.1:5440` (não expor publicamente)
- Redis: `127.0.0.1:6390`
- n8n: `127.0.0.1:5680` (evitar conflito com 5678)

## Serviços na VPS

```bash
docker compose -f docker-compose.yml up -d
# Adicionar n8n, Chatwoot, MinIO em compose extendido na Onda 3
```

## Hyperdrive

Configurar binding Cloudflare Hyperdrive apontando para Postgres interno da VPS.

## Intervenção do usuário

Provisionar VPS, firewall, e apontar Hyperdrive — autorizado após Onda 0.
