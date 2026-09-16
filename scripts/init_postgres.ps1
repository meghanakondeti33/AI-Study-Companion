<#
.SYNOPSIS
    Initializes a local PostgreSQL data cluster for AI Study Companion development.
.DESCRIPTION
    Looks for PostgreSQL binaries via $env:PG_BIN or standard Windows install paths.
    Initializes cluster at $env:PG_DATA or %LOCALAPPDATA%\study_companion_postgres_data.
#>
$ErrorActionPreference = "Stop"

# 1. Resolve PostgreSQL Binaries Directory
$pgBin = $env:PG_BIN

if (-not $pgBin) {
    # Check if postgres is available on PATH
    $pathPg = Get-Command "initdb.exe" -ErrorAction SilentlyContinue
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
        if (Test-Path "$cand\initdb.exe") {
            $pgBin = $cand
            break
        }
    }
}

if (-not $pgBin -or -not (Test-Path "$pgBin\initdb.exe")) {
    Write-Error "PostgreSQL binaries not found. Please set `$env:PG_BIN to your PostgreSQL 'bin' directory (e.g., C:\PostgreSQL\bin)."
    exit 1
}

# 2. Resolve Data Directory
$pgData = if ($env:PG_DATA) { $env:PG_DATA } else { "$env:LOCALAPPDATA\study_companion_postgres_data" }

Write-Host "PostgreSQL Binaries: $pgBin"
Write-Host "Target Data Path:    $pgData"

# 3. Initialize Cluster
if (-not (Test-Path $pgData)) {
    Write-Host "Initializing PostgreSQL cluster at $pgData..."
    & "$pgBin\initdb.exe" -D $pgData -U postgres -A trust -E UTF8
    Write-Host "PostgreSQL cluster successfully initialized."
} else {
    Write-Host "PostgreSQL cluster already exists at $pgData."
}
