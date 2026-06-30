# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Produção VPS ✅ (master — PR #13 merged)

- Spec 014 catálogo + fotos OK
- Spec 003 pedidos: código no ar; smoke `smoke-orders-vps.sh` (T016)
- Branch VPS: `master` @ origin/master

### Próximo deploy VPS (após pull)

```bash
git fetch origin master && git reset --hard origin/master
bash infra/hetzner/scripts/npm-ci-vps.sh    # Next 15.5.19 (CVE #15)
bash infra/hetzner/scripts/build-web-vps.sh
bash infra/hetzner/scripts/smoke-orders-vps.sh
```

### T027 R2 (prep, não cutover)

- Docs: `infra/hetzner/docs/R2-STORAGE.md`
- Script: `configure-r2-env-vps.sh` (requer credenciais Cloudflare)

### Demo

`https://inovagastro360.inovatitech.com.br` — `admin@inovagastro360.local` / `InovaGastro360!`
