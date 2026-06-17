#!/usr/bin/env bash
# Gera CA + certificado servidor e reinicia Postgres com SSL (Hyperdrive).
set -euo pipefail

REMOTE_DIR="/opt/inova-gastro-360"
SSL_DIR="${REMOTE_DIR}/ssl"

mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

if [[ ! -f ca.crt ]]; then
  openssl genrsa -out ca.key 4096
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -out ca.crt -subj "/CN=InovaGastro360-Postgres-CA"
  openssl genrsa -out server.key 2048
  openssl req -new -key server.key -out server.csr \
    -subj "/CN=128.140.77.31"
  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 3650 -sha256
  chmod 600 server.key ca.key
  chown 70:70 server.key
  chmod 644 server.crt ca.crt
fi

cat > "${REMOTE_DIR}/docker-compose.prod.yml" <<'YAML'
services:
  postgres:
    image: postgres:16-alpine
    container_name: inova-gastro-360-postgres
    restart: unless-stopped
    ports:
      - "5440:5432"
    environment:
      POSTGRES_DB: inova_gastro_360
      POSTGRES_USER: inova_gastro
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    command:
      - postgres
      - -c
      - ssl=on
      - -c
      - ssl_cert_file=/var/lib/postgresql/ssl/server.crt
      - -c
      - ssl_key_file=/var/lib/postgresql/ssl/server.key
    volumes:
      - inova_gastro_pg_data:/var/lib/postgresql/data
      - ./ssl:/var/lib/postgresql/ssl:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inova_gastro -d inova_gastro_360"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  inova_gastro_pg_data:
YAML

cd "$REMOTE_DIR"
docker compose -f docker-compose.prod.yml up -d --force-recreate
docker compose -f docker-compose.prod.yml ps
echo "SSL habilitado em ${SSL_DIR}"
