# FlowLab Pipeline
param([switch]$Scraper, [switch]$Classificar, [switch]$Tudo)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "FlowLab Pipeline" -ForegroundColor Cyan

if ($Scraper -or $Tudo) {
    Write-Host "[1] Scraper..." -ForegroundColor Yellow
    Push-Location $backend
    try { python scripts/run_scraper.py; if ($LASTEXITCODE -ne 0) { throw "Scraper failed" } }
    finally { Pop-Location }
    Write-Host "Scraper OK" -ForegroundColor Green
}

if ($Classificar -or $Tudo) {
    Write-Host "[2] Gemini..." -ForegroundColor Yellow
    Push-Location $backend
    try { python scripts/run_classifier.py; if ($LASTEXITCODE -ne 0) { throw "Classifier failed" } }
    finally { Pop-Location }
    Write-Host "Gemini OK" -ForegroundColor Green
}

Write-Host "[3] Copying JSONs..." -ForegroundColor Yellow
$s1 = Join-Path $backend "data\raw\startups_cubo.json"
$s2 = Join-Path $backend "data\processed\departamentos_startups.json"
$d1 = Join-Path $frontend "src\data\startups_cubo.json"
$d2 = Join-Path $frontend "src\data\departamentos_startups.json"
Copy-Item -LiteralPath $s1 -Destination $d1 -Force
Copy-Item -LiteralPath $s2 -Destination $d2 -Force
Write-Host "JSONs OK" -ForegroundColor Green

Write-Host "[4] npm run build..." -ForegroundColor Yellow
Push-Location $frontend
try { npm run build; if ($LASTEXITCODE -ne 0) { throw "Build failed" } }
finally { Pop-Location }
Write-Host "Build OK" -ForegroundColor Green
Write-Host "Done. Run: cd frontend; npm start" -ForegroundColor Cyan
