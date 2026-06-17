# Cutover DNS — Web Inova Gastro 360

O Worker `inova-gastro-360-web` está no ar, mas `inovagastro360.inovatitech.com.br` ainda aponta para o **Excellence Dental** (registros DNS manuais na zona).

## Passo 1 — Remover DNS antigo (Dashboard)

1. [Cloudflare DNS](https://dash.cloudflare.com/0252c61a2109e807b883c4d466617ebb/inovatitech.com.br/dns)
2. Apague **todos** os registros do nome `inovagastro360` (A, AAAA ou CNAME)
3. Aguarde ~1 minuto

## Passo 2 — Redeploy do Web

Na raiz do monorepo:

```bash
export NEXT_PUBLIC_API_URL=https://inovagastro360-api.inovatitech.com.br
export NEXT_PUBLIC_REALTIME_URL=https://inovagastro360-rt.inovatitech.com.br
npm run deploy:web
```

O Wrangler recria o custom domain `inovagastro360.inovatitech.com.br` automaticamente.

## Passo 3 — Validar

```bash
curl -I https://inovagastro360.inovatitech.com.br/login
# title deve ser "Inova Gastro 360", não Excellence Dental
```

Login demo: `admin@inovagastro360.local` / `InovaGastro360!` / tenant `demo-burger`

## Alternativa: token com DNS Edit

Se preferir script automatizado, crie um API Token com **Zone → DNS → Edit** e rode:

```bash
export CLOUDFLARE_API_TOKEN=seu_token
export CLOUDFLARE_ACCOUNT_ID=0252c61a2109e807b883c4d466617ebb
./infra/cloudflare/cutover-web-dns.sh
```

## Pages (opcional)

Projeto `inova-gastro-360-web` no Pages foi criado para teste; produção usa **Worker + assets** (`apps/web/wrangler.jsonc`).
