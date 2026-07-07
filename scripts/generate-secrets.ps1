# Generate staging secrets — run once, paste into .env.staging (Windows PowerShell 5.1+)

function ConvertTo-HexLower {
    param([byte[]]$Bytes)
    return ([BitConverter]::ToString($Bytes) -replace '-', '').ToLower()
}

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtBytes = New-Object byte[] 32
$adminBytes = New-Object byte[] 24
$rng.GetBytes($jwtBytes)
$rng.GetBytes($adminBytes)
$jwt = ConvertTo-HexLower $jwtBytes
$admin = ConvertTo-HexLower $adminBytes

Write-Host ""
Write-Host "Add these to .env.staging:" -ForegroundColor Cyan
Write-Host "JWT_SECRET_KEY=$jwt"
Write-Host "ADMIN_API_KEY=$admin"
Write-Host ""
