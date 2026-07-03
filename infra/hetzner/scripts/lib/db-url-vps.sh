#!/usr/bin/env bash
# Resolve DATABASE_URL para scripts rodando no host VPS (--network host).
# Usa infra/hetzner/.env.production (mesma credencial do api-gateway), não
# POSTGRES_PASSWORD do container (que é do superuser postgres, não inova_gastro).

resolve_vps_host_database_url() {
  local env_file="$1"
  local url=""

  if [[ -f "$env_file" ]]; then
    url="$(grep '^DATABASE_URL=' "$env_file" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi

  if [[ -z "$url" || "$url" == *CHANGE_ME* ]]; then
    echo "Erro: DATABASE_URL ausente ou placeholder em $env_file" >&2
    echo "  bash infra/hetzner/scripts/fix-env-db-url-vps.sh" >&2
    echo "  bash infra/hetzner/scripts/smoke-db-vps.sh" >&2
    return 1
  fi

  url="${url//host.docker.internal/127.0.0.1}"

  if [[ "$url" != *sslmode=* ]]; then
    if [[ "$url" == *'?'* ]]; then
      url="${url}&sslmode=require"
    else
      url="${url}?sslmode=require"
    fi
  fi

  printf '%s' "$url"
}
