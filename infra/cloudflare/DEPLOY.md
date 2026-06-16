# Deploy Cloudflare — Inova Gastro 360

**Ordem:** Hyperdrive (VPS) → Workers → DNS → Web (Pages)

## Pré-requisitos

- [ ] Conta Cloudflare com domínio `inovatitech.com.br`
- [ ] `wrangler login` no PC de deploy
- [ ] `CLOUDFLARE_ACCOUNT_ID` no ambiente (opcional)
- [ ] Postgres na VPS (`127.0.0.1:5440`) + migrations aplicadas
- [ ] Hyperdrive configurado (ver `infra/hetzner/hyperdrive.md`)

## 1. Secrets (produção)

```bash
# Na raiz do monorepo
cd apps/workers/api-gateway
npx wrangler secret put JWT_SECRET
# Cole uma string >= 32 caracteres

# Se NÃO usar Hyperdrive ainda (não recomendado em prod):
npx wrangler secret put DATABASE_URL

cd ../messaging-bus
# sem secrets obrigatórios em v1

cd ../realtime-hub
# sem secrets obrigatórios

cd ../integrations
npx wrangler secret put N8N_WEBHOOK_URL      # opcional
npx wrangler secret put CHATWOOT_WEBHOOK_URL # opcional
```

## 2. Hyperdrive no api-gateway

1. Cloudflare Dashboard → Hyperdrive → Create
2. Connection string apontando para VPS (usuário `inova_hyperdrive`)
3. Copiar ID e adicionar em `apps/workers/api-gateway/wrangler.jsonc`:

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "<SEU_HYPERDRIVE_ID>"
  }
]
```

4. Ajustar `lib/db.ts` para usar `env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL` em produção.

## 3. Deploy Workers (ordem)

```bash
# Na raiz do monorepo
npm run deploy:workers
```

Ou manualmente:

```bash
npm run deploy -w @inova-gastro-360/messaging-bus
npm run deploy -w @inova-gastro-360/realtime-hub
npm run deploy -w @inova-gastro-360/integrations
npm run deploy -w @inova-gastro-360/api-gateway   # por último (depende dos bindings)
```

## 4. DNS (cutover)

| Host | Tipo | Destino |
|------|------|---------|
| `inovagastro360` | CNAME | Pages project ou tunnel |
| `api.inovagastro360` | CNAME | `inova-gastro-360-api-gateway.<account>.workers.dev` |
| `rt.inovagastro360` | CNAME | `inova-gastro-360-realtime-hub.<account>.workers.dev` |

**Importante:** remover vínculo do domínio com Excellence Dental antes do cutover.

## 5. Web (Next.js)

### Opção A — Cloudflare Pages

```bash
cd apps/web
npm run build
npx wrangler pages deploy .next --project-name=inova-gastro-360-web
```

Variáveis no Pages:
- `NEXT_PUBLIC_API_URL=https://api.inovagastro360.inovatitech.com.br`
- `NEXT_PUBLIC_REALTIME_URL=https://rt.inovagastro360.inovatitech.com.br`

### Opção B — VPS + Node

```bash
npm run build -w @inova-gastro-360/web
npm run start -w @inova-gastro-360/web
```

## 6. Pós-deploy (smoke test)

```bash
curl https://api.inovagastro360.inovatitech.com.br/health
curl https://api.inovagastro360.inovatitech.com.br/api/v1/status
curl -X POST https://api.inovagastro360.inovatitech.com.br/api/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"...","password":"...","tenantSlug":"demo-burger"}'
```

- [ ] Login web em produção
- [ ] Cardápio carrega produtos
- [ ] Criar pedido + painel atualiza
- [ ] WebSocket realtime (`wss://rt.../ws?branchId=`)

## 7. Segurança

- [ ] SSL Full (strict)
- [ ] WAF managed rules
- [ ] Rate limit em `/api/v1/auth/login`
- [ ] Turnstile no login (futuro)
- [ ] Postgres **não** exposto na internet pública

## 8. Próximo após deploy

→ Print-agent local (spec 006)  
→ n8n + Chatwoot webhooks em produção  
→ Onda 4 financeiro (quando autorizado)
