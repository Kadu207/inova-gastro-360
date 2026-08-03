# Favicon — Inova Gastro 360

Monograma **IG** (verde `#22c55e` em fundo `#0a0c0f`).

## Arquivos

| Path | Uso |
|------|-----|
| `apps/web/src/app/icon.png` | Favicon App Router (192×192) |
| `apps/web/src/app/apple-icon.png` | Apple touch (180×180) |
| `apps/web/src/app/favicon.ico` | `/favicon.ico` (Next metadata file) |
| `apps/web/public/favicon.png` | 32×32 PNG estático |
| `apps/web/public/favicon-48.png` | 48×48 — upload WordPress / Identidade do site |
| `apps/web/public/favicon.ico` | Cópia ICO para clientes que pedem `/favicon.ico` via static |

## Publicar na VPS

Após merge em `master`:

```bash
cd ~/inova-gastro-360
git pull origin master
docker compose -f infra/hetzner/docker-compose.app.yml up -d --force-recreate web
```

Hard refresh no browser (ou aba anônima) em https://inovagastro360.inovatitech.com.br

## WordPress (fora deste monorepo)

1. Baixe `apps/web/public/favicon-48.png` (ou o ICO).
2. WP Admin → **Aparência → Personalizar → Identidade do site → Ícone do site**.
3. Envie o PNG/ICO e publique.
