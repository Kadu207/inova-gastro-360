# Cutover Cloudflare — VPS (Tunnel) vs Worker Web

## Sintoma (HTTPS ainda no deploy antigo)

| Teste | VPS `:9088` (OK) | HTTPS público (errado) |
|-------|------------------|------------------------|
| Chunk login | `page-6958148aa0624d11.js` | `page-126fac65bd2500e1.js` |
| `POST /api/v1/auth/login` | **200** + `accessToken` | **405** (corpo vazio) |
| HTML `/login` | static export (`serve out`) | contém `self.__next_f` (RSC / Worker) |

A stack Docker na VPS está correta. O tráfego HTTPS ainda é atendido pelo **Worker `inova-gastro-360-web`** (custom domain no edge), não pelo **Cloudflare Tunnel** → `127.0.0.1:9088`.

## Causa

`apps/web/wrangler.jsonc` registrava:

```json
"routes": [{ "pattern": "inovagastro360.inovatitech.com.br", "custom_domain": true }]
```

Isso vincula o hostname ao Worker/Pages na borda Cloudflare. O Tunnel fica ignorado para esse host.

## Correção (Dashboard Cloudflare)

Ordem recomendada:

### 1. Remover custom domain do Worker

1. [Workers & Pages](https://dash.cloudflare.com/) → **inova-gastro-360-web**
2. **Settings** → **Domains & Routes** (ou **Triggers** → **Custom Domains**)
3. Remover `inovagastro360.inovatitech.com.br`
4. Se existir projeto **Pages** `inova-gastro-360-web` com o mesmo domínio, remover também

### 2. DNS — hostname só via Tunnel

1. [DNS da zona `inovatitech.com.br`](https://dash.cloudflare.com/)
2. Registro `inovagastro360`:
   - **Tipo:** CNAME
   - **Destino:** `<tunnel-id>.cfargotunnel.com` (mesmo padrão dos outros hosts do tunnel)
   - **Proxy:** ligado (nuvem laranja)
3. Apagar A/AAAA/CNAME que apontem para Pages ou IP fixo antigo

### 3. Zero Trust — Public Hostname do Tunnel (VPS inovati / Docker Swarm)

**Arquitetura nesta VPS:**
- `cloudflared` = serviço **Docker Swarm** (`cloudflared_cloudflared.…`)
- Outros apps usam `http://n8n_editor:5678` (rede Swarm `network_public` — **não é manually attachable**)
- Inova Gastro = stack separado em `inova-gastro-360-app_inova_internal` (bridge)
- `casadapaz` / `skillsmcp` usam **`http://128.140.77.31:PORTA`** (IP do host) — **mesmo padrão recomendado**

**Desabilite** o cloudflared duplicado: `sudo systemctl disable --now cloudflared`

#### URL de origem recomendada (persiste após restart)

| Campo | Valor |
|-------|--------|
| Hostname | `inovagastro360.inovatitech.com.br` |
| Service | **`http://128.140.77.31:9088`** |

Requisito: nginx com `ports: "9088:9088"` no compose (bind `0.0.0.0:9088`).

Validar **do namespace do cloudflared** (obrigatório):

```bash
CF=$(docker ps --format '{{.Names}}' | grep '^cloudflared_cloudflared' | head -1)

docker run --rm --network "container:${CF}" curlimages/curl:8.5.0 \
  curl -sS -o /dev/null -w "host-ip: %{http_code}\n" --max-time 5 http://128.140.77.31:9088/login
```

Esperado: `host-ip: 200`. Se `000`, teste IP do nginx na rede Inova:

```bash
NGINX_IP=$(docker inspect inova-gastro-360-nginx \
  -f '{{index .NetworkSettings.Networks "inova-gastro-360-app_inova_internal" "IPAddress"}}')
echo "nginx IP: $NGINX_IP"

docker run --rm --network "container:${CF}" curlimages/curl:8.5.0 \
  curl -sS -o /dev/null -w "ip: %{http_code}\n" "http://${NGINX_IP}:9088/login"
```

Se `ip: 200`, use temporariamente `http://<NGINX_IP>:9088` no dashboard (IP muda ao recriar container).

#### Alternativa: `network connect` (perde no restart do cloudflared)

```bash
docker network connect inova-gastro-360-app_inova_internal "$CF" 2>/dev/null || true
# URL: http://inova-gastro-360-nginx:9088
```

Após **cada** `docker restart` do cloudflared, reconectar:

```bash
bash infra/hetzner/scripts/tunnel-connect-inova.sh
# ou cron: */5 * * * * /usr/local/bin/tunnel-connect-inova.sh
```

**Não use** `docker network connect network_public` — Swarm retorna `not manually attachable`.

#### DNS (crítico para erro 1033 sem logs no cloudflared)

Se `curl https://inovagastro360…` retorna **1033** e `docker logs` **não** mostra request para esse host, o tráfego **não chega** ao tunnel.

1. **DNS** → registro `inovagastro360`:
   - Tipo: **CNAME**
   - Target: `76fd5075-38c4-4bdb-9d4d-4c9b0ae98f80.cfargotunnel.com`
   - Proxy: Proxied
2. **Zero Trust** → Tunnel → **Public Hostnames** → `inovagastro360.inovatitech.com.br` deve existir
3. Purge cache

Teste com logs ao vivo:

```bash
docker logs -f "$CF" 2>&1 &
curl -sS https://inovagastro360.inovatitech.com.br/login | head -c 100
# Deve aparecer linha de proxy ou ERR com originService=inovagastro360
```
### 4. Cache

**Caching** → **Configuration** → **Purge Everything**

## Validar

### VPS (bash)

```bash
echo "local:" $(curl -s http://127.0.0.1:9088/login | grep -o 'page-[a-f0-9]*\.js' | head -1)
echo "HTTPS:" $(curl -s https://inovagastro360.inovatitech.com.br/login | grep -o 'page-[a-f0-9]*\.js' | head -1)

curl -sS -o /dev/null -w "POST HTTPS: %{http_code}\n" -X POST https://inovagastro360.inovatitech.com.br/api/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"admin@inovagastro360.local","password":"InovaGastro360!","tenantSlug":"demo-burger"}'
```

Esperado: mesmo chunk nos dois (`page-6958148aa0624d11.js`) e **POST HTTPS: 200**.

### Windows (PowerShell)

```powershell
cd $env:TEMP
(Invoke-WebRequest -Uri "https://inovagastro360.inovatitech.com.br/login" -UseBasicParsing).Content |
  Select-String -Pattern 'page-[a-f0-9]+\.js' -AllMatches |
  ForEach-Object { $_.Matches.Value } | Select-Object -First 1

'{"email":"admin@inovagastro360.local","password":"InovaGastro360!","tenantSlug":"demo-burger"}' |
  Set-Content -Encoding utf8 body.json
curl.exe -sS -w "`nHTTP:%{http_code}`n" -X POST "https://inovagastro360.inovatitech.com.br/api/v1/auth/login" `
  -H "content-type: application/json" --data-binary "@body.json"
```

**Atenção:** no PowerShell, `curl` é alias de `Invoke-WebRequest`. Use sempre **`curl.exe`**.

Login demo: `admin@inovagastro360.local` / `InovaGastro360!` / tenant `demo-burger`

## Não fazer durante cutover VPS

- `npm run deploy:web` com `custom_domain` no `wrangler.jsonc` (reanexa o hostname ao Worker)
- Apontar Tunnel para `:3102` sem nginx — use `:9088` (proxy `/api` + `/ws` + web)
- Usar `127.0.0.1:9088` no Tunnel se `cloudflared` roda em Docker (erro **1033** / **530**)

## Troubleshooting

| Sintoma | Causa | Correção |
|---------|-------|----------|
| **1033** sem linha no `docker logs` | DNS não aponta ao tunnel / hostname ausente no Zero Trust | CNAME → `76fd5075….cfargotunnel.com` + Public Hostname |
| **530** com ERR `lookup inova-gastro-360-nginx` | `network connect` perdido após restart | `tunnel-connect-inova.sh` ou URL `128.140.77.31:9088` |
| `nginx: 200` no teste mas HTTPS **530** | URL errada no dashboard ou DNS | Confirmar v31+ e CNAME |
| HTTPS **502** logo após `restart` | web/serve ainda subindo ou tunnel desconectado | Aguardar 10s; testar `curl http://127.0.0.1:9088/cardapio`; `tunnel-connect-inova.sh` |
| **502** persistente (`Connection refused` upstream `:3102`) | nginx cacheou IP antigo do container `web` | `docker compose restart nginx-proxy` ou config com `resolver 127.0.0.11` + `proxy_pass` variável |
| `network_public not manually attachable` | Rede Swarm overlay | Usar IP host `128.140.77.31:9088` (como casadapaz) |
