# Tasks: 013-vps-runtime

## Fase A — Decisão e SDD (2026-06-20)

- [x] T001 Spec 013 spec.md + plan.md + tasks.md
- [x] T002 memory-bank activeContext + progress atualizados
- [x] T003 Spec 010 anotada como edge futuro (go-live)
- [x] T004 `.specify/feature.json` → specs/013-vps-runtime

## Fase B — Docker Compose aplicação (VPS)

- [ ] T010 `infra/hetzner/docker-compose.app.yml` — api, msg, rt, int, web, redis
- [ ] T011 `.env.production.example` — DATABASE_URL, JWT_SECRET, URLs internas
- [ ] T012 Scripts `infra/hetzner/scripts/deploy-vps.sh` (build + up)
- [ ] T013 Healthcheck agregado `/health` ou script smoke pós-deploy

## Fase C — Runtime Node (adapter)

- [ ] T020 Pacote ou entry `node-server.ts` por worker (fetch handler → http.createServer)
- [ ] T021 api-gateway: `DATABASE_URL` sem Hyperdrive binding
- [ ] T022 messaging-bus: env `REALTIME_URL`, `INTEGRATIONS_URL` (substituir Service Bindings)
- [ ] T023 realtime-hub: WebSocket sem DO — Redis pub/sub broadcast
- [ ] T024 `npm run start:stack` produção (pm2 ou compose)

## Fase D — Nginx / TLS

- [ ] T030 Config Nginx: web + `/api` + `/ws` upgrade
- [ ] T031 Certificados (certbot ou Cloudflare Full para origem)
- [ ] T032 UFW: 443/80 público; 5440/8789–8792 só localhost/Docker network

## Fase E — Cutover e validação

- [ ] T040 DNS `inovagastro360*` → IP VPS (ou Cloudflare Tunnel)
- [ ] T041 E2E produção VPS: login → pedido → WS painel → print_job
- [ ] T042 Documentar rollback para Workers (spec 010) se necessário

## Fase F — Go-live comercial Cloudflare (futuro)

- [ ] T050 Reavaliar Workers Paid + Hyperdrive + Queues
- [ ] T051 Cutover edge conforme `specs/010-cloudflare-workers/plan.md`

## Desbloqueia

- **Spec 006 print-agent** — após T021 (API acessível na VPS/LAN) ou dev local `:8792`
