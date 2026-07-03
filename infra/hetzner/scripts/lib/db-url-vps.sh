#!/usr/bin/env bash
# Resolve DATABASE_URL para scripts rodando no host VPS (--network host).

_normalize_vps_host_url() {
  local url="$1"
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

_read_env_var() {
  local env_file="$1"
  local key="$2"
  if [[ ! -f "$env_file" ]]; then
    return 1
  fi
  grep "^${key}=" "$env_file" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

# URL da API (DATABASE_URL) — tipicamente inova_gastro_app após T053.
resolve_vps_host_database_url() {
  local env_file="$1"
  local url="$(_read_env_var "$env_file" DATABASE_URL)"

  if [[ -z "$url" || "$url" == *CHANGE_ME* ]]; then
    echo "Erro: DATABASE_URL ausente ou placeholder em $env_file" >&2
    echo "  bash infra/hetzner/scripts/fix-env-db-url-vps.sh" >&2
    echo "  bash infra/hetzner/scripts/smoke-db-vps.sh" >&2
    return 1
  fi

  _normalize_vps_host_url "$url"
}

# URL do owner de migrations (inova_gastro) — CREATE FUNCTION, ALTER POLICY, seed, rotate.
# Nunca usar inova_gastro_app aqui (permission denied for schema public).
resolve_vps_migration_database_url() {
  local env_file="$1"
  local url="$(_read_env_var "$env_file" MIGRATION_DATABASE_URL)"

  if [[ -z "$url" || "$url" == *CHANGE_ME* || "$url" == *inova_gastro_app* ]]; then
    url=""
  fi

  if [[ -z "$url" ]]; then
    local bak
    bak="$(ls -t "${env_file}.bak."* 2>/dev/null | head -1 || true)"
    if [[ -n "$bak" ]]; then
      url="$(_read_env_var "$bak" DATABASE_URL)"
      if [[ "$url" == *inova_gastro_app* ]]; then
        url=""
      fi
    fi
  fi

  if [[ -z "$url" ]]; then
    local current="$(_read_env_var "$env_file" DATABASE_URL)"
    if [[ -n "$current" && "$current" != *inova_gastro_app* ]]; then
      url="$current"
    fi
  fi

  if [[ -z "$url" ]]; then
    local pg_pw="$(_read_env_var "$env_file" POSTGRES_PASSWORD)"
    if [[ -n "$pg_pw" && "$pg_pw" != *CHANGE_ME* ]]; then
      url="postgresql://inova_gastro:${pg_pw}@127.0.0.1:5440/inova_gastro_360?sslmode=require"
    fi
  fi

  if [[ -z "$url" ]]; then
    local container="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"
    if docker exec "$container" printenv POSTGRES_PASSWORD >/dev/null 2>&1; then
      local pw
      pw="$(docker exec "$container" printenv POSTGRES_PASSWORD)"
      url="postgresql://inova_gastro:${pw}@127.0.0.1:5440/inova_gastro_360?sslmode=require"
    fi
  fi

  if [[ -z "$url" || "$url" == *CHANGE_ME* ]]; then
    echo "Erro: MIGRATION_DATABASE_URL não resolvida (role inova_gastro)." >&2
    echo "  bash infra/hetzner/scripts/fix-migration-url-vps.sh" >&2
    echo "  Ou defina MIGRATION_DATABASE_URL=postgresql://inova_gastro:...@host.docker.internal:5440/..." >&2
    return 1
  fi

  _normalize_vps_host_url "$url"
}
