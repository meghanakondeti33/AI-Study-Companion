<#
.SYNOPSIS
    Starts a local PostgreSQL cluster for AI Study Companion development.
.DESCRIPTION
    Resolves PostgreSQL binaries via $env:PG_BIN or standard install paths.
    Starts PostgreSQL using pg_ctl or postgres daemon on default port 5432.
#>
$ErrorActionPreference = "Stop"

# 1. Resolve PostgreSQL Binaries Directory
$pgBin = $env:PG_BIN

if (-not $pgBin) {
    $pathPg = Get-Command "postgres.exe" -ErrorAction SilentlyContinue
    if ($pathPg) {
        $pgBin = Split-Path $pathPg.Source
    }
}

if (-not $pgBin) {
    $candidatePaths = @(
        "$env:USERPROFILE\anaconda3\envs\pg_env\Library\bin",
        "$env:USERPROFILE\miniconda3\envs\pg_env\Library\bin",
        "$env:LOCALAPPDATA\Programs\PostgreSQL\16\bin",
        "${env:ProgramFiles}\PostgreSQL\16\bin",
        "${env:ProgramFiles}\PostgreSQL\15\bin"
    )
    foreach ($cand in $candidatePaths) {
        if (Test-Path "$cand\postgres.exe") {
            $pgBin = $cand
            break
        }
    }
}

if (-not $pgBin -or -not (Test-Path "$pgBin\postgres.exe")) {
    Write-Error "PostgreSQL binaries not found. Set `$env:PG_BIN to your PostgreSQL 'bin' directory."
    exit 1
}

# 2. Resolve Data Directory
$pgData = if ($env:PG_DATA) { $env:PG_DATA } else { "$env:LOCALAPPDATA\study_companion_postgres_data" }

if (-not (Test-Path $pgData)) {
    Write-Error "PostgreSQL cluster not found at '$pgData'. Please run .\scripts\init_postgres.ps1 first."
    exit 1
}

# 3. Check if PostgreSQL is already running
$pgRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
if ($pgRunning) {
    Write-Host "PostgreSQL is already running (PID: $($pgRunning[0].Id))."
    exit 0
}

Write-Host "Starting PostgreSQL cluster..."
Write-Host "Binaries: $pgBin"
Write-Host "Data:     $pgData"

# 4. Start via pg_ctl if available, or direct postgres.exe
$logFile = "$pgData\server.log"
if (Test-Path "$pgBin\pg_ctl.exe") {
    & "$pgBin\pg_ctl.exe" -D $pgData -l $logFile start
    Write-Host "PostgreSQL started in background. Logs: $logFile"
    Start-Sleep -Seconds 2

    # Create development database if it does not exist
    if (Test-Path "$pgBin\createdb.exe") {
        Write-Host "Ensuring database 'ai_study_companion' exists..."
        & "$pgBin\createdb.exe" -U postgres ai_study_companion 2>$null
    }
} else {
    Write-Host "Starting PostgreSQL in foreground (Ctrl+C to stop)..."
    & "$pgBin\postgres.exe" -D $pgData
}