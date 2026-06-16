# Inova Gastro 360

SaaS para hamburgueria, delivery, cozinha (KDS), financeiro e automações.

**Domínio:** https://inovagastro360.inovatitech.com.br

## Stack

- Next.js 15 (apps/web)
- Cloudflare Workers: api-gateway, messaging-bus, realtime-hub, integrations
- PostgreSQL 16 multitenant + Prisma
- SDD + TDD + Spec Kit

## Início rápido

```bash
# 1. Variáveis
cp .env.example .env

# 2. Infra local (portas 5440, 6390 — sem conflito)
docker compose up -d

# 3. Dependências
npm install

# 4. Prisma
npm run db:generate

# 5. Testes
npm run test

# 6. Dev (terminais separados)
npm run dev:web          # http://127.0.0.1:3100
npm run dev -w @inova-gastro-360/api-gateway   # :8788
```

## Portas

Consulte **PORT_REGISTRY.md** antes de alterar binds.

## Memória permanente

- `memory-bank/` — contexto do projeto
- `AGENTS.md` — instruções para agentes
- `.cursor/rules/inova-gastro-360.mdc` — regras always-on
- `.specify/memory/constitution.md` — governança SDD

## Documentação

- [Arquitetura](docs/architecture.md)
- [Specs](specs/)

## Ondas

- **Onda 0** ✅ Fundação (este scaffold)
- **Onda 1** Auth multitenant + Cloudflare (escopo a definir)
