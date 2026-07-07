# Generate production secrets for Vercel (Windows PowerShell 5.1+)

function ConvertTo-HexLower {
    param([byte[]]$Bytes)
    return ([BitConverter]::ToString($Bytes) -replace '-', '').ToLower()
}

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$authBytes = New-Object byte[] 32
$adminBytes = New-Object byte[] 24
$rng.GetBytes($authBytes)
$rng.GetBytes($adminBytes)
$auth = ConvertTo-HexLower $authBytes
$admin = ConvertTo-HexLower $adminBytes

Write-Host ""
Write-Host "=== MotiveFX Vercel production secrets ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel (motivefx-ai-site):" -ForegroundColor Yellow
Write-Host "  AUTH_SECRET=$auth"
Write-Host "  ADMIN_API_KEY=$admin"
Write-Host ""
