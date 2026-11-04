param([switch]$Voice)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$env:UV_CACHE_DIR = Join-Path $projectRoot '.cache/uv'
Push-Location (Join-Path $projectRoot 'services/agent')
try {
    if ($Voice) { uv sync --frozen --extra voice } else { uv sync --frozen }
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency setup failed' }
    if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
} finally { Pop-Location }
Push-Location (Join-Path $projectRoot 'apps/web')
try {
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency setup failed' }
    if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
} finally { Pop-Location }
Write-Output 'Dependencies installed. Follow README.md to configure local Ollama or cloud providers.'
