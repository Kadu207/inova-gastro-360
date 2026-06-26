# Hetzner VPS — Inova Gastro 360

**IP:** `128.140.77.31` | Postgres `:5440` | Redis `:6390`

## 1. Clonar o repositório na VPS (obrigatório)

Os comandos abaixo **não funcionam** no `~` sem o código. Primeiro:

```bash
cd ~
git clone <URL_DO_SEU_REPOSITORIO_GIT> inova-gastro-360
cd inova-gastro-360
```

Substitua `<URL_DO_SEU_REPOSITORIO_GIT>` pela URL real (GitLab/GitHub).

Se o código ainda não foi enviado (`git push`) da sua máquina de desenvolvimento, faça o push antes de clonar na VPS.

## 2. Configurar ambiente

```bash
cp infra/hetzner/.env.production.example infra/hetzner/.env.production
nano infra/hetzner/.env.production   # DATABASE_URL, JWT_SECRET, senhas
```

## 3. Postgres + Redis (se ainda não rodando)

```bash
docker compose -f infra/hetzner/docker-compose.prod.yml up -d
# ou docker compose up -d na raiz (dev local)
```

## 4. Deploy do stack app (Node)

```bash
bash infra/hetzner/scripts/deploy-vps.sh
```

Ou manualmente na raiz do repo:

```bash
npm ci
npm run db:migrate
npm run db:seed    # primeira vez
docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production up -d
npm run smoke:health
```

## 5. Nginx + TLS + firewall

```bash
sudo cp infra/hetzner/nginx/inovagastro360.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/inovagastro360.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d inovagastro360.inovatitech.com.br
sudo bash infra/hetzner/scripts/setup-ufw.sh
```

## 6. Cutover DNS

Ver `infra/hetzner/CUTOVER.md` e `ROLLBACK.md`.

## Portas (ver PORT_REGISTRY.md)

| Serviço | Porta VPS |
|---------|-----------|
| PostgreSQL | 5440 (localhost) |
| Redis | 6390 |
| API Node | 8792 |
| Web | 3102 |
