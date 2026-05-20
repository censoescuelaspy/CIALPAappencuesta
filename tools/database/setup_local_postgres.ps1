param(
  [string]$DataDir = "",
  [int]$Port = 55432,
  [string]$DatabaseName = "cialpa",
  [string]$PgBin = ""
)

$ErrorActionPreference = "Stop"

if (-not $DataDir) {
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
  $DataDir = Join-Path $repoRoot ".local\postgres_data"
}

function Find-PostgresBin {
  if ($PgBin -and (Test-Path (Join-Path $PgBin "psql.exe"))) {
    return $PgBin
  }

  $cmd = Get-Command "psql.exe" -ErrorAction SilentlyContinue
  if ($cmd) {
    return Split-Path $cmd.Source -Parent
  }

  $root = Join-Path $env:ProgramFiles "PostgreSQL"
  if (-not (Test-Path $root)) {
    throw "No se encontro PostgreSQL. Ejecute npm run db:install-tools."
  }

  $bin = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
    ForEach-Object { Join-Path $_.FullName "bin" } |
    Where-Object { Test-Path (Join-Path $_ "psql.exe") } |
    Select-Object -First 1

  if (-not $bin) {
    throw "No se encontro psql.exe dentro de $root."
  }
  return $bin
}

function Invoke-Pg {
  param(
    [string]$Exe,
    [string[]]$Args
  )
  & (Join-Path $script:PgBinResolved $Exe) @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo $Exe $($Args -join ' ')"
  }
}

$script:PgBinResolved = Find-PostgresBin
$initdb = Join-Path $script:PgBinResolved "initdb.exe"
$pgCtl = Join-Path $script:PgBinResolved "pg_ctl.exe"
$psql = Join-Path $script:PgBinResolved "psql.exe"
$pgIsReady = Join-Path $script:PgBinResolved "pg_isready.exe"

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
  Write-Host "Inicializando cluster PostgreSQL local en $DataDir..."
  & $initdb "--pgdata=$DataDir" "--username=postgres" "--auth=trust" "--encoding=UTF8"
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo inicializar PostgreSQL local."
  }
}

& $pgIsReady "-h" "127.0.0.1" "-p" "$Port" "-U" "postgres" | Out-Null
if ($LASTEXITCODE -ne 0) {
  $logFile = Join-Path $DataDir "server.log"
  Write-Host "Iniciando PostgreSQL local en puerto $Port..."
  & $pgCtl "-D" $DataDir "-l" $logFile "-o" "-p $Port" "start"
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo iniciar PostgreSQL local. Ver $logFile."
  }
}

$exists = & $psql "-h" "127.0.0.1" "-p" "$Port" "-U" "postgres" "-d" "postgres" "-tAc" "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
if (($exists | Out-String).Trim() -ne "1") {
  Write-Host "Creando base de datos local $DatabaseName..."
  Invoke-Pg "createdb.exe" @("-h", "127.0.0.1", "-p", "$Port", "-U", "postgres", $DatabaseName)
}

$databaseUrl = "postgresql://postgres@127.0.0.1:${Port}/${DatabaseName}"
$env:DATABASE_URL = $databaseUrl
$env:PGSSLMODE = "disable"

Write-Host "Aplicando schema.sql con npm run db:schema..."
npm.cmd run db:schema
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo aplicar schema.sql."
}

Write-Host ""
Write-Host "PostgreSQL local listo."
Write-Host "DATABASE_URL=$databaseUrl"
Write-Host "Detener: `"$pgCtl`" -D `"$DataDir`" stop"
