$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$previewUrl = "http://127.0.0.1:4173/"
$previewLog = Join-Path $projectRoot "roys-preview.log"
$previewErrorLog = Join-Path $projectRoot "roys-preview.err.log"

Set-Location -LiteralPath $projectRoot

Write-Host "Preparando a versão estável da Roy's V2..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  throw "O build falhou. A versão anterior não foi substituída."
}

$listeners = @(
  Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
)

foreach ($processId in ($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
  $commandLine = [string]$processInfo.CommandLine
  if (
    $commandLine.IndexOf($projectRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $commandLine.IndexOf("vite", [StringComparison]::OrdinalIgnoreCase) -ge 0
  ) {
    Write-Host "Encerrando servidor anterior deste projeto..."
    Stop-Process -Id $processId -Force
  } else {
    throw "A porta 4173 está sendo usada por outro programa. Feche-o e tente novamente."
  }
}

Remove-Item -LiteralPath $previewLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $previewErrorLog -Force -ErrorAction SilentlyContinue

$arguments = @(
  "/c",
  "npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort 1> `"$previewLog`" 2> `"$previewErrorLog`""
)
Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList $arguments `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden

$available = $false
for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $previewUrl -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $available = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $available) {
  $details = if (Test-Path $previewErrorLog) {
    Get-Content -Raw $previewErrorLog
  } else {
    "O servidor não produziu um relatório de erro."
  }
  throw "O app não respondeu em $previewUrl`n$details"
}

Write-Host "Roy's V2 pronta em $previewUrl"
Start-Process $previewUrl
