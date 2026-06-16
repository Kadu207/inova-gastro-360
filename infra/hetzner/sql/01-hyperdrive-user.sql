-- Usuário dedicado para Cloudflare Hyperdrive (produção)
-- Executar na VPS: docker exec -i inova-gastro-360-postgres psql -U inova_gastro -d inova_gastro_360 < infra/hetzner/sql/01-hyperdrive-user.sql
-- Troque 'SUA_SENHA_FORTE' antes de rodar.

CREATE USER inova_hyperdrive WITH PASSWORD 'SUA_SENHA_FORTE';

GRANT CONNECT ON DATABASE inova_gastro_360 TO inova_hyperdrive;
GRANT USAGE ON SCHEMA public TO inova_hyperdrive;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inova_hyperdrive;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inova_hyperdrive;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inova_hyperdrive;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO inova_hyperdrive;
