# Tasks: 013-vps-runtime

## Fase A — Decisão e SDD (2026-06-20)

- [x] T001 Spec 013 spec.md + plan.md + tasks.md
- [x] T002 memory-bank activeContext + progress atualizados
- [x] T003 Spec 010 anotada como edge futuro (go-live)
- [x] T004 `.specify/feature.json` → specs/013-vps-runtime

## Fase B — Docker Compose aplicação (VPS)

- [x] T010 `infra/hetzner/docker-compose.app.yml` — api, msg, rt, int, web, redis
- [x] T011 `.env.production.example` — DATABASE_URL, JWT_SECRET, URLs internas
- [x] T012 Scripts `infra/hetzner/scripts/deploy-vps.sh` (build + up)
- [x] T013 Healthcheck agregado `/health/stack` + `npm run smoke:health`

## Fase C — Runtime Node (adapter)

- [x] T020 Pacote `@inova-gastro-360/runtime-node` + `node-server.ts` por worker
- [x] T021 api-gateway: `DATABASE_URL` + `MESSAGING_URL` (sem Hyperdrive em Node)
- [x] T022 messaging-bus: `REALTIME_URL`, `INTEGRATIONS_URL`
- [x] T023 realtime-hub: WebSocket + Redis pub/sub (`createRedisRealtimeServer`)
- [x] T024 `npm run start:stack` produção

## Fase D — Nginx / TLS

- [x] T030 Config Nginx: `infra/hetzner/nginx/inovagastro360.conf`
- [x] T031 Certificados — documentado (certbot paths no nginx)
- [x] T032 UFW: `infra/hetzner/scripts/setup-ufw.sh`

## Fase E — Cutover e validação

- [x] T040 DNS — `infra/hetzner/CUTOVER.md`
- [x] T041 E2E produção — checklist em CUTOVER.md
- [x] T042 Rollback — `infra/hetzner/ROLLBACK.md`

## Fase F — Go-live comercial Cloudflare (futuro)

- [ ] T050 Reavaliar Workers Paid + Hyperdrive + Queues
- [ ] T051 Cutover edge conforme `specs/010-cloudflare-workers/plan.md`

## Desbloqueia

- **Spec 006 print-agent** — após T021 (API acessível na VPS/LAN) ou dev local `:8792`
