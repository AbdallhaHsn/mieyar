# ==============================================================================
# نظام الربان المحاسبي - Al-Roban ERP & E-Invoicing
# سكربت التشغيل الشامل (Full Startup Script)
# ==============================================================================
param(
    [switch]$NoBrowser
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "تشغيل نظام الربان المحاسبي - Al-Roban ERP"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       نظام الربان المحاسبي المتكامل (Al-Roban ERP)       " -ForegroundColor Yellow
Write-Host "               سكربت التشغيل التلقائي الشامل             " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. ضبط مسارات .NET لضمان أولوية إصدار 64-bit
$env:Path = "C:\Program Files\dotnet;$env:Path"
$env:DOTNET_ROOT = "C:\Program Files\dotnet"

$rootDir = Split-Path -Parent $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Get-Location
}

Write-Host "`n[1/5] التحقق من المتطلبات الأساسية للبيئة..." -ForegroundColor Yellow

# فحص .NET SDK
try {
    $dotnetVer = & dotnet --version
    Write-Host " [✔] .NET SDK متاح بنجاح: $dotnetVer" -ForegroundColor Green
} catch {
    Write-Host " [✖] لم يتم العثور على .NET 8 SDK! يرجى تثبيته للمتابعة." -ForegroundColor Red
}

# فحص Node.js
try {
    $nodeVer = & node -v
    Write-Host " [✔] Node.js متاح بنجاح: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host " [✖] لم يتم العثور على Node.js! يرجى تثبيته للمتابعة." -ForegroundColor Red
}

# 2. التحقق من الخدمات وقواعد البيانات
Write-Host "`n[2/5] التحقق من حالة خدمات قواعد البيانات والتخزين..." -ForegroundColor Yellow

$sqlService = Get-Service -Name "MSSQL`$SQLEXPRESS", "MSSQLSERVER" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" } | Select-Object -First 1
$redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }

if ($sqlService) {
    Write-Host " [✔] خدمة SQL Server تعمل محلياً: $($sqlService.Name)" -ForegroundColor Green
} else {
    Write-Host " [!] لم يتم العثور على خدمة SQL Server محلية نشطة. يمكن تشغيل Docker Compose إذا كان مثبتاً." -ForegroundColor DarkYellow
}

if ($redisService) {
    Write-Host " [✔] خدمة Redis تعمل محلياً بنجاح." -ForegroundColor Green
} else {
    Write-Host " [!] خدمة Redis المحلية غير مشغلة كخدمة Windows مستقلة." -ForegroundColor DarkYellow
}

# 3. بناء المشروع والتأكد من الجاهزية
Write-Host "`n[3/5] بناء وتجهيز الواجهة الخلفية (.NET Backend)..." -ForegroundColor Yellow
Push-Location $rootDir
$buildResult = & dotnet build AlRobban.sln --configuration Debug --nologo -v q
if ($LASTEXITCODE -eq 0) {
    Write-Host " [✔] تم بناء حل الـ Backend بنجاح دون أخطاء." -ForegroundColor Green
} else {
    Write-Host " [✖] حدث خطأ أثناء بناء الـ Backend." -ForegroundColor Red
}
Pop-Location

# 4. تشغيل الواجهة الخلفية (Backend API) في نافذة منفصلة
Write-Host "`n[4/5] تشغيل الواجهة الخلفية (Backend API)..." -ForegroundColor Yellow
$backendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Al-Roban Backend WebAPI (Port 5000)';
`$env:Path = 'C:\Program Files\dotnet;' + `$env:Path;
`$env:DOTNET_ROOT = 'C:\Program Files\dotnet';
Set-Location '$rootDir';
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host '         Al-Roban WebAPI - جاري التشغيل...         ' -ForegroundColor Green;
Write-Host '   Swagger UI: http://localhost:5000/swagger      ' -ForegroundColor Yellow;
Write-Host '   Health API: http://localhost:5000/api/system/status' -ForegroundColor Yellow;
Write-Host '==================================================' -ForegroundColor Cyan;
dotnet run --project src/Bootstrapper/AlRobban.WebAPI --urls "http://localhost:5000"
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Write-Host " [✔] تم تشغيل خادم الـ WebAPI على الرابط: http://localhost:5000" -ForegroundColor Green

# 5. تشغيل الواجهة الأمامية (Angular Frontend) في نافذة منفصلة
Write-Host "`n[5/5] تشغيل الواجهة الأمامية (Angular Client)..." -ForegroundColor Yellow
$clientDir = Join-Path $rootDir "client"
$frontendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Al-Roban Angular Client (Port 4200)';
Set-Location '$clientDir';
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host '       Al-Roban Angular Client - جاري التشغيل...   ' -ForegroundColor Green;
Write-Host '   URL: http://localhost:4200                     ' -ForegroundColor Yellow;
Write-Host '==================================================' -ForegroundColor Cyan;
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Write-Host " [✔] تم تشغيل واجهة المستخدم على الرابط: http://localhost:4200" -ForegroundColor Green

# 6. فتح المتصفح تلقائياً بعد ثوان معدودة
if (-not $NoBrowser) {
    Write-Host "`nانتظار بدء تشغيل الخدمات لفتح المتصفح..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:4200"
    Start-Process "http://localhost:5000/swagger"
} else {
    Write-Host "`nتم تخطي فتح المتصفح تلقائياً (NoBrowser = true)." -ForegroundColor Cyan
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "           تم تشغيل نظام الربان بنجاح تام!                " -ForegroundColor Yellow
Write-Host "  - الواجهة الأمامية (Angular): http://localhost:4200     " -ForegroundColor White
Write-Host "  - واجهة الـ API والتوثيق: http://localhost:5000/swagger " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
