# Al-Roban ERP - Environment Setup Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "      Al-Roban ERP System - Environment Setup   " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1. Ensure 64-bit .NET is prioritized in current session
$env:Path = "C:\Program Files\dotnet;$env:Path"
$env:DOTNET_ROOT = "C:\Program Files\dotnet"

# 2. Check .NET SDK
Write-Host "`n[1/4] Checking .NET SDK..." -ForegroundColor Yellow
$sdkVersion = & dotnet --version
Write-Host "Active .NET SDK: $sdkVersion" -ForegroundColor Green

# 3. Check Node & Angular
Write-Host "`n[2/4] Checking Node.js & Angular CLI..." -ForegroundColor Yellow
$nodeVersion = & node -v
Write-Host "Node.js Version: $nodeVersion" -ForegroundColor Green

# 4. Check Solution Build
Write-Host "`n[3/4] Building Backend Solution (AlRobban.sln)..." -ForegroundColor Yellow
& dotnet build AlRobban.sln --configuration Debug

# 5. Summary
Write-Host "`n[4/4] Setup Complete!" -ForegroundColor Green
Write-Host "To run Docker services (SQL Server, Redis, RabbitMQ):" -ForegroundColor White
Write-Host "  docker compose up -d" -ForegroundColor Gray
Write-Host "To run Backend API:" -ForegroundColor White
Write-Host "  dotnet run --project src/Bootstrapper/AlRobban.WebAPI" -ForegroundColor Gray
Write-Host "To run Frontend Client:" -ForegroundColor White
Write-Host "  cd client; npm start" -ForegroundColor Gray
