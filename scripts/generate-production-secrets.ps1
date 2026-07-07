# Generate production secrets for Render + Vercel (Windows PowerShell 5.1+)

function ConvertTo-HexLower {
    param([byte[]]$Bytes)
    return ([BitConverter]::ToString($Bytes) -replace '-', '').ToLower()
}

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtBytes = New-Object byte[] 32
$syncBytes = New-Object byte[] 24
$adminBytes = New-Object byte[] 24
$rng.GetBytes($jwtBytes)
$rng.GetBytes($syncBytes)
$rng.GetBytes($adminBytes)
$jwt = ConvertTo-HexLower $jwtBytes
$sync = ConvertTo-HexLower $syncBytes
$admin = ConvertTo-HexLower $adminBytes

Write-Host ""
Write-Host "=== MotiveFX FastAPI production secrets ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Render (motivefx-api) + Vercel (motivefx-ai-site):" -ForegroundColor Yellow
Write-Host "  BACKEND_SYNC_SECRET=$sync"
Write-Host "    ^ MUST be identical on both Render and Vercel"
Write-Host ""
Write-Host "Render only:" -ForegroundColor Yellow
Write-Host "  JWT_SECRET_KEY=$jwt"
Write-Host "  ADMIN_API_KEY=$admin"
Write-Host ""
Write-Host "Vercel only:" -ForegroundColor Yellow
Write-Host "  MOTIVEFX_API_URL=https://motivefx-api.onrender.com"
Write-Host "    ^ update after Render deploy if hostname differs"
Write-Host ""
