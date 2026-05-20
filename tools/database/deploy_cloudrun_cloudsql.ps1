param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "southamerica-east1",
  [string]$SqlInstance = "cialpa-postgres",
  [string]$DatabaseName = "cialpa",
  [string]$DbUser = "cialpa_api",
  [string]$DbPassword = "",
  [string]$ServiceName = "cialpa-db-api",
  [string]$ArtifactRepository = "cialpa",
  [string]$ImageTag = "",
  [string]$DatabaseUrlSecret = "cialpa-database-url",
  [string]$SyncTokenSecret = "cialpa-database-sync-token",
  [string]$SyncToken = "",
  [string]$RuntimeServiceAccount = "",
  [string]$Tier = "db-f1-micro",
  [string]$PostgresVersion = "POSTGRES_15",
  [switch]$SkipSqlCreate,
  [switch]$SkipBuild,
  [switch]$NoApplySchemaOnStart
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro '$Name' en PATH. Instalar Google Cloud SDK antes de ejecutar este script."
  }
}

function New-SecretValue {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Invoke-Gcloud {
  param([string[]]$CommandArgs)
  & gcloud @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo gcloud $($CommandArgs -join ' ')"
  }
}

function Gcloud-Value {
  param([string[]]$CommandArgs)
  $output = & gcloud @CommandArgs 2>$null
  if ($LASTEXITCODE -ne 0) {
    return ""
  }
  return ($output | Out-String).Trim()
}

function Ensure-Secret {
  param([string]$Name, [string]$Value)
  $exists = Gcloud-Value @("secrets", "describe", $Name, "--project", $ProjectId, "--format=value(name)")
  if (-not $exists) {
    Invoke-Gcloud @("secrets", "create", $Name, "--project", $ProjectId, "--replication-policy=automatic")
  }
  $tmp = New-TemporaryFile
  try {
    Set-Content -LiteralPath $tmp.FullName -Value $Value -NoNewline
    Invoke-Gcloud @("secrets", "versions", "add", $Name, "--project", $ProjectId, "--data-file=$($tmp.FullName)")
  } finally {
    Remove-Item -LiteralPath $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}

Require-Command "gcloud"

if (-not $ImageTag) {
  $ImageTag = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
}
if (-not $DbPassword) {
  $DbPassword = New-SecretValue
}
if (-not $SyncToken) {
  $SyncToken = New-SecretValue
}

$instanceConnectionName = "${ProjectId}:${Region}:${SqlInstance}"
$escapedUser = [uri]::EscapeDataString($DbUser)
$escapedPassword = [uri]::EscapeDataString($DbPassword)
$escapedDatabase = [uri]::EscapeDataString($DatabaseName)
$databaseUrl = "postgresql://${escapedUser}:${escapedPassword}@localhost/${escapedDatabase}?host=/cloudsql/${instanceConnectionName}"
$image = "${Region}-docker.pkg.dev/${ProjectId}/${ArtifactRepository}/${ServiceName}:${ImageTag}"
$applySchema = if ($NoApplySchemaOnStart) { "false" } else { "true" }

Invoke-Gcloud @("config", "set", "project", $ProjectId)
Invoke-Gcloud @(
  "services", "enable",
  "run.googleapis.com",
  "sqladmin.googleapis.com",
  "cloudbuild.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "--project", $ProjectId
)

if (-not $RuntimeServiceAccount) {
  $projectNumber = Gcloud-Value @("projects", "describe", $ProjectId, "--format=value(projectNumber)")
  if (-not $projectNumber) {
    throw "No se pudo resolver projectNumber para $ProjectId."
  }
  $RuntimeServiceAccount = "${projectNumber}-compute@developer.gserviceaccount.com"
}

if (-not $SkipSqlCreate) {
  $instanceExists = Gcloud-Value @("sql", "instances", "describe", $SqlInstance, "--project", $ProjectId, "--format=value(name)")
  if (-not $instanceExists) {
    Invoke-Gcloud @(
      "sql", "instances", "create", $SqlInstance,
      "--project", $ProjectId,
      "--database-version", $PostgresVersion,
      "--region", $Region,
      "--tier", $Tier,
      "--storage-size", "10GB",
      "--storage-type", "SSD",
      "--availability-type", "ZONAL"
    )
  }

  $databaseExists = Gcloud-Value @("sql", "databases", "describe", $DatabaseName, "--instance", $SqlInstance, "--project", $ProjectId, "--format=value(name)")
  if (-not $databaseExists) {
    Invoke-Gcloud @("sql", "databases", "create", $DatabaseName, "--instance", $SqlInstance, "--project", $ProjectId)
  }

  $userExists = Gcloud-Value @("sql", "users", "describe", $DbUser, "--instance", $SqlInstance, "--project", $ProjectId, "--format=value(name)")
  if ($userExists) {
    Invoke-Gcloud @("sql", "users", "set-password", $DbUser, "--instance", $SqlInstance, "--project", $ProjectId, "--password", $DbPassword)
  } else {
    Invoke-Gcloud @("sql", "users", "create", $DbUser, "--instance", $SqlInstance, "--project", $ProjectId, "--password", $DbPassword)
  }
}

Ensure-Secret -Name $DatabaseUrlSecret -Value $databaseUrl
Ensure-Secret -Name $SyncTokenSecret -Value $SyncToken

Invoke-Gcloud @(
  "projects", "add-iam-policy-binding", $ProjectId,
  "--member", "serviceAccount:${RuntimeServiceAccount}",
  "--role", "roles/cloudsql.client",
  "--quiet"
)
Invoke-Gcloud @(
  "secrets", "add-iam-policy-binding", $DatabaseUrlSecret,
  "--project", $ProjectId,
  "--member", "serviceAccount:${RuntimeServiceAccount}",
  "--role", "roles/secretmanager.secretAccessor",
  "--quiet"
)
Invoke-Gcloud @(
  "secrets", "add-iam-policy-binding", $SyncTokenSecret,
  "--project", $ProjectId,
  "--member", "serviceAccount:${RuntimeServiceAccount}",
  "--role", "roles/secretmanager.secretAccessor",
  "--quiet"
)

$repoExists = Gcloud-Value @("artifacts", "repositories", "describe", $ArtifactRepository, "--location", $Region, "--project", $ProjectId, "--format=value(name)")
if (-not $repoExists) {
  Invoke-Gcloud @(
    "artifacts", "repositories", "create", $ArtifactRepository,
    "--project", $ProjectId,
    "--location", $Region,
    "--repository-format", "docker",
    "--description", "CIALPA container images"
  )
}

if (-not $SkipBuild) {
  Invoke-Gcloud @(
    "builds", "submit", ".",
    "--project", $ProjectId,
    "--config", "tools/database/cloudbuild.yaml",
    "--substitutions", "_IMAGE=$image"
  )
}

Invoke-Gcloud @(
  "run", "deploy", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--image", $image,
  "--allow-unauthenticated",
  "--service-account", $RuntimeServiceAccount,
  "--add-cloudsql-instances", $instanceConnectionName,
  "--set-env-vars", "PGSSLMODE=disable,APPLY_SCHEMA_ON_START=$applySchema",
  "--set-secrets", "DATABASE_URL=${DatabaseUrlSecret}:latest,DATABASE_SYNC_TOKEN=${SyncTokenSecret}:latest"
)

$serviceUrl = Gcloud-Value @("run", "services", "describe", $ServiceName, "--project", $ProjectId, "--region", $Region, "--format=value(status.url)")

Write-Host ""
Write-Host "Cloud Run listo: $serviceUrl"
Write-Host "DATABASE_SYNC_URL: $serviceUrl/sync/mec-draft"
Write-Host "Token guardado en Secret Manager: $SyncTokenSecret"
Write-Host ""
Write-Host "Para cargar el mismo token como Script Property de Apps Script, usar la cuenta propietaria del Web App."
