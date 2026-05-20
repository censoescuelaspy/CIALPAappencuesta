param(
  [switch]$InstallDocker,
  [switch]$SkipGcloud,
  [switch]$SkipPostgres
)

$ErrorActionPreference = "Stop"

function Test-Tool {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-PathEntry {
  param([string]$Directory)
  if (-not $Directory -or -not (Test-Path $Directory)) { return $false }

  $parts = @($env:PATH -split ';' | Where-Object { $_ })
  if (-not ($parts -contains $Directory)) {
    $env:PATH = "$Directory;$env:PATH"
  }

  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $userParts = @($userPath -split ';' | Where-Object { $_ })
  if (-not ($userParts -contains $Directory)) {
    $nextUserPath = if ($userPath) { "$Directory;$userPath" } else { $Directory }
    [Environment]::SetEnvironmentVariable("Path", $nextUserPath, "User")
    Write-Host "Agregado a PATH de usuario: $Directory"
  }
  return $true
}

function Find-GcloudBin {
  $candidates = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin",
    "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin"
  )
  return $candidates | Where-Object { Test-Path (Join-Path $_ "gcloud.cmd") } | Select-Object -First 1
}

function Find-PostgresBin {
  $root = Join-Path $env:ProgramFiles "PostgreSQL"
  if (-not (Test-Path $root)) { return $null }
  return Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
    ForEach-Object { Join-Path $_.FullName "bin" } |
    Where-Object { Test-Path (Join-Path $_ "psql.exe") } |
    Select-Object -First 1
}

function Install-ToolPackage {
  param(
    [string]$Name,
    [string]$WingetId,
    [string]$ChocolateyId
  )

  if (Test-Tool "winget") {
    Write-Host "Instalando $Name con winget..."
    winget install --id $WingetId --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -eq 0) { return }
    Write-Warning "winget no pudo instalar $Name. Intentando Chocolatey si esta disponible."
  }

  if (Test-Tool "choco") {
    Write-Host "Instalando $Name con Chocolatey..."
    choco install $ChocolateyId -y
    if ($LASTEXITCODE -eq 0) { return }
  }

  throw "No se pudo instalar $Name. Instale manualmente el paquete $WingetId o $ChocolateyId."
}

$needed = @()

if (-not (Test-Tool "gcloud")) {
  $gcloudBin = Find-GcloudBin
  if ($gcloudBin) {
    Add-PathEntry $gcloudBin | Out-Null
  }
}

if (-not (Test-Tool "psql")) {
  $postgresBin = Find-PostgresBin
  if ($postgresBin) {
    Add-PathEntry $postgresBin | Out-Null
  }
}

if (-not $SkipGcloud -and -not (Test-Tool "gcloud")) {
  $needed += [pscustomobject]@{
    Name = "Google Cloud SDK"
    WingetId = "Google.CloudSDK"
    ChocolateyId = "google-cloud-sdk"
  }
}

if (-not $SkipPostgres -and -not (Test-Tool "psql")) {
  $needed += [pscustomobject]@{
    Name = "PostgreSQL"
    WingetId = "PostgreSQL.PostgreSQL"
    ChocolateyId = "postgresql"
  }
}

if ($InstallDocker -and -not (Test-Tool "docker")) {
  $needed += [pscustomobject]@{
    Name = "Docker Desktop"
    WingetId = "Docker.DockerDesktop"
    ChocolateyId = "docker-desktop"
  }
}

if (-not $needed.Count) {
  Write-Host "No hay herramientas pendientes: gcloud/psql/Docker segun opciones solicitadas."
  exit 0
}

foreach ($tool in $needed) {
  Install-ToolPackage -Name $tool.Name -WingetId $tool.WingetId -ChocolateyId $tool.ChocolateyId
}

Write-Host ""
Write-Host "Instalacion solicitada completada."
Write-Host "Abra una nueva terminal si gcloud o psql no aparecen inmediatamente en PATH."
Write-Host "Verificacion sugerida: gcloud --version; psql --version"
