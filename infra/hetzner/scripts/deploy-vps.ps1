# Deploy Inova Gastro 360 na VPS (Windows PowerShell — sem WSL/bash)
# Uso:
#   .\infra\hetzner\scripts\deploy-vps.ps1
#   .\infra\hetzner\scripts\deploy-vps.ps1 -NoPull

param(
  [string]$Remote = $(if ($env:VPS_REMOTE) { $env:VPS_REMOTE } else { "gestaoti@128.140.77.31" }),
  [string]$IdentityFile = $(if ($env:VPS_SSH_KEY) { $env:VPS_SSH_KEY } else { "$env:USERPROFILE\.ssh\id_ed25519_inova" }),
  [string]$RemoteDir = $(if ($env:VPS_DIR) { $env:VPS_DIR } else { "/home/gestaoti/inova-gastro-360" }),
  [switch]$NoPull
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $IdentityFile)) {
  Write-Error "Chave SSH nao encontrada: $IdentityFile"
}

$sshArgs = @(
  "-i", $IdentityFile,
  "-o", "IdentitiesOnly=yes",
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=accept-new"
)

Write-Host "==> Remoto: $Remote  dir: $RemoteDir"

$pullLine = if ($NoPull) {
  "echo skip-git-pull"
} else {
  "git pull --ff-only origin master || git pull --ff-only"
}

# Script remoto em LF puro (nunca CRLF — evita bash: $'\r')
$remoteScript = @"
set -euo pipefail
cd '$RemoteDir'
$pullLine
bash infra/hetzner/scripts/deploy-vps.sh
echo '==> Smoke extra'
curl -sf http://127.0.0.1:8792/health && echo
curl -sf -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3102/login
curl -sf -o /dev/null -w 'nginx9088:%{http_code}\n' http://127.0.0.1:9088/
cd infra/hetzner && docker compose -f docker-compose.app.yml --env-file .env.production ps
echo DEPLOY_OK
"@
$remoteScript = $remoteScript -replace "`r`n", "`n" -replace "`r", "`n"

$tmp = Join-Path $env:TEMP ("inova-deploy-{0}.sh" -f [guid]::NewGuid().ToString("N"))
try {
  # UTF8 sem BOM + LF
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($tmp, $remoteScript, $utf8)

  Get-Content -Raw -Path $tmp | & ssh @sshArgs $Remote "tr -d '\r' | bash -s"
  if ($LASTEXITCODE -ne 0) {
    throw "Deploy remoto falhou (exit $LASTEXITCODE)"
  }
}
finally {
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}

Write-Host "==> Deploy OK"
