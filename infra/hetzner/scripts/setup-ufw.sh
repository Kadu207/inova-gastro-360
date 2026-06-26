#!/usr/bin/env bash
# UFW baseline — spec 013 T032 (executar na VPS como root)
set -euo pipefail

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Postgres 5440, Redis 6390, workers 8789-8792 — NÃO expor publicamente
ufw --force enable
ufw status verbose
