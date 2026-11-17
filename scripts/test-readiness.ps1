param([switch]$Automated,[switch]$Smoke)
$ErrorActionPreference = 'Stop'
try {
    $testRoot = Split-Path -Parent $PSScriptRoot
    Set-Location -LiteralPath $testRoot
    if ($Automated -and $Smoke) { throw 'Choose either Automated or Smoke, not both.' }
    if (-not (Test-Path -LiteralPath (Join-Path $testRoot 'tests/browser/readiness-flow.mjs'))) { throw 'Run this launcher from the diagnostic checkout.' }
    $null = Get-Command node -ErrorAction Stop
    $null = Get-Command docker -ErrorAction Stop
    Write-Host 'IELTS Lab: LOCAL test only. No production data, real users, payments or AI charges.'
    Write-Host 'Checking Docker and the existing isolated test database...'
    cmd.exe /d /c 'docker --context desktop-linux info --format "{{.ServerVersion}}" >nul 2>&1'
    if ($LASTEXITCODE -ne 0) {
        $desktop = 'C:/Program Files/Docker/Docker/Docker Desktop.exe'
        if (-not (Test-Path -LiteralPath $desktop)) { throw 'Open Docker Desktop, then double-click TEST-READINESS.cmd again.' }
        Start-Process -FilePath $desktop -WindowStyle Hidden
        $deadline = (Get-Date).AddSeconds(60)
        do {
            Start-Sleep -Seconds 2
            cmd.exe /d /c 'docker --context desktop-linux info --format "{{.ServerVersion}}" >nul 2>&1'
            if ($LASTEXITCODE -eq 0) { break }
        } while ((Get-Date) -lt $deadline)
        if ($LASTEXITCODE -ne 0) { throw 'Docker is still starting. Wait until Docker Desktop says Running, then retry.' }
    }
    $container = 'supabase_db_ielts-diagnostic-20261006'
    cmd.exe /d /c 'docker --context desktop-linux inspect supabase_db_ielts-diagnostic-20261006 >nul 2>&1'
    if ($LASTEXITCODE -ne 0) { throw 'The dedicated local diagnostic database is missing. No database was reset. Ask for local test setup.' }
    $running = docker --context desktop-linux inspect --format '{{.State.Running}}' $container
    if ($running -ne 'true') {
        docker --context desktop-linux start $container
        if ($LASTEXITCODE -ne 0) { throw 'Could not start the isolated local database.' }
    }
    $ports = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3010,55621) }
    if ($ports) { throw 'Port 3010 or 55621 is already in use. Close the previous readiness test with quit, then retry. No existing process was killed.' }
    $candidates = @(
        (Join-Path $testRoot 'node_modules/playwright/index.mjs'),
        'C:/Users/Admin/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs',
        'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
    )
    $playwright = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $playwright) { throw 'The local browser test engine is missing. No project dependencies were changed.' }
    if (-not (Test-Path -LiteralPath 'node_modules/tsx')) { throw 'Project dependencies are missing. Run npm ci in this checkout, then retry.' }
    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
    $env:TEST_DATABASE_URL = $env:DATABASE_URL
    $env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55621'
    $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only'
    $env:SUPABASE_SERVICE_ROLE_KEY = 'diagnostic-storage-test-key-only'
    $env:ENCRYPTION_KEY = '11' * 32
    $env:DIAGNOSTIC_WRITING_PROVIDER = 'gemini'
    $env:CHECKOUT_ENABLED = 'false'
    $env:ATTEMPTS_ENABLED = 'false'
    Remove-Item Env:QSTASH_TOKEN,Env:GEMINI_API_KEY,Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
    $arguments = @('--conditions=react-server','--import','tsx','tests/browser/readiness-flow.mjs',$playwright)
    if ($Smoke) { $arguments += '--manual-smoke' } elseif (-not $Automated) { $arguments += '--manual' }
    if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) {
        Write-Host 'No production build found; using the local development server. Initial compilation may take a moment.'
        $arguments += '--dev'
    } else { Write-Host 'Using your existing local production build; no rebuild required.' }
    Write-Host 'Preparing local QA accounts and the real readiness question pack...'
    & node @arguments
    if ($LASTEXITCODE -ne 0) { throw "Local test exited with code $LASTEXITCODE. See the details above." }
    Write-Host 'Local test finished. The app server and QA identity server have stopped.'
    exit 0
} catch {
    Write-Host ''
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Production and your .env files were not changed.'
    exit 1
}
