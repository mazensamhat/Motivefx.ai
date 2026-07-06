# Generate staging secrets — run once, paste into .env.staging
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtBytes = New-Object byte[] 32
$adminBytes = New-Object byte[] 24
$rng.GetBytes($jwtBytes)
$rng.GetBytes($adminBytes)
$jwt = [Convert]::ToHexString($jwtBytes).ToLower()
$admin = [Convert]::ToHexString($adminBytes).ToLower()

Write-Host ""
Write-Host "Add these to .env.staging:" -ForegroundColor Cyan
Write-Host "JWT_SECRET_KEY=$jwt"
Write-Host "ADMIN_API_KEY=$admin"
Write-Host ""
