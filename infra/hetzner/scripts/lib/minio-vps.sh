#!/usr/bin/env bash
# Helpers MinIO na VPS compartilhada (stack inova-platform-core).
# shellcheck disable=SC2034

minio_vps_default_container() {
  docker ps --format '{{.Names}}' | grep -i minio | head -1 || true
}

minio_vps_primary_network() {
  local container="${1:?container}"
  docker inspect "$container" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | head -1
}

minio_vps_published_port() {
  local container="${1:?container}"
  local mapping
  mapping="$(docker port "$container" 9000 2>/dev/null | head -1 || true)"
  if [[ -n "$mapping" ]]; then
    echo "${mapping##*:}"
    return 0
  fi
  echo ""
}

minio_vps_connect_container() {
  local container="${1:?container}"
  local network="${2:?network}"
  local target="${3:?target}"
  if docker network connect "$network" "$target" 2>/dev/null; then
    echo "==> $target conectado à rede $network (MinIO interno)"
  elif docker inspect "$target" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw "$network"; then
    echo "==> $target já na rede $network"
  else
    echo "Aviso: não foi possível conectar $target à rede $network" >&2
    return 1
  fi
}

minio_vps_connect_api() {
  local container="${1:?container}"
  local api="${2:-inova-gastro-360-api}"
  local network
  network="$(minio_vps_primary_network "$container")"
  if [[ -z "$network" ]]; then
    echo "Erro: rede Docker não encontrada para $container" >&2
    return 1
  fi
  minio_vps_connect_container "$container" "$network" "$api"
}

minio_vps_connect_media_stack() {
  local container="${1:?container}"
  local network
  network="$(minio_vps_primary_network "$container")"
  if [[ -z "$network" ]]; then
    echo "Erro: rede Docker não encontrada para $container" >&2
    return 1
  fi
  minio_vps_connect_container "$container" "$network" "inova-gastro-360-api"
  minio_vps_connect_container "$container" "$network" "inova-gastro-360-nginx"
}

minio_vps_public_base_url() {
  local app_base="${1:-https://inovagastro360.inovatitech.com.br}"
  local bucket="${2:-inova-gastro-360}"
  echo "${app_base%/}/media/${bucket}"
}

minio_vps_s3_endpoint() {
  local container="${1:?container}"
  local host_port
  host_port="$(minio_vps_published_port "$container")"
  if [[ -n "$host_port" ]]; then
    echo "http://host.docker.internal:${host_port}"
  else
    echo "http://${container}:9000"
  fi
}

minio_vps_host_endpoint() {
  local container="${1:?container}"
  local host_port
  host_port="$(minio_vps_published_port "$container")"
  if [[ -n "$host_port" ]]; then
    echo "http://127.0.0.1:${host_port}"
  else
    echo "docker-network://${container}"
  fi
}

minio_vps_mc_run() {
  local container="${1:?container}"
  shift
  local config_vol="${MINIO_MC_CONFIG_VOL:-}"
  if [[ -z "$config_vol" ]]; then
    docker run --rm --network "container:${container}" minio/mc "$@"
  else
    docker run --rm --network "container:${container}" \
      -v "${config_vol}:/root/.mc" minio/mc "$@"
  fi
}

minio_vps_mc_init_config_vol() {
  MINIO_MC_CONFIG_VOL="$(docker volume create inova-gastro-minio-mc-config 2>/dev/null || echo inova-gastro-minio-mc-config)"
  export MINIO_MC_CONFIG_VOL
}
