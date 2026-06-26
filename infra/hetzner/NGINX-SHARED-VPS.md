# VPS compartilhada — porta 80 já usada por outro container

Nesta VPS, `excellence_dental_prod-nginx-1` ocupa `0.0.0.0:80`. O `systemctl nginx` **não** pode subir na mesma porta.

## Opção A — Cloudflare Tunnel (recomendado se `cloudflared` já roda)

Adicione ingress no config do tunnel existente:

```yaml
  - hostname: inovagastro360.inovatitech.com.br
    service: http://127.0.0.1:3102
  - hostname: inovagastro360-api.inovatitech.com.br
    service: http://127.0.0.1:8792
```

Web usa `/api` no mesmo host — preferir um único hostname com Nginx local em porta alta (opção B).

## Opção B — Nginx em porta 9088 (sem conflito com :80)

```bash
# Na VPS — proxy local na 9088
sudo cp infra/hetzner/nginx/inovagastro360.local.conf /etc/nginx/sites-available/inovagastro360-local.conf
sudo ln -sf /etc/nginx/sites-available/inovagastro360-local.conf /etc/nginx/sites-enabled/
# Edite listen 9088 se necessário
sudo nginx -t && sudo systemctl restart nginx
```

Cloudflare Tunnel aponta `inovagastro360.inovatitech.com.br` → `http://127.0.0.1:9088`.

## Opção C — Vhost no Nginx Docker existente (:80)

Incluir `server_name inovagastro360.inovatitech.com.br` no container `excellence_dental_prod-nginx-1` (requer acesso ao volume de config desse projeto).

## Certbot

Com Tunnel Cloudflare, TLS termina na Cloudflare — **não** rode certbot no host para este app.

Com Nginx local em 9088 + DNS direto na VPS, use `certbot certonly --webroot` ou Tunnel.
