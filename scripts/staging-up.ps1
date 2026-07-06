# Start full staging stack locally (Docker required)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env.staging")) {
    Copy-Item ".env.staging.example" ".env.staging"
    Write-Host "Created .env.staging from example — edit it, then re-run." -ForegroundColor Yellow
    & "$Root\scripts\generate-secrets.ps1"
    exit 1
}

Write-Host "Building and starting staging stack on http://localhost:8080 ..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Staging is up:" -ForegroundColor Green
    Write-Host "  App:  http://localhost:8080"
    Write-Host "  API:  http://localhost:8080/api/health"
    Write-Host "  Logs: docker compose -f docker-compose.staging.yml logs -f"
}
