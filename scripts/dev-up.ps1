param(
  [int]$Port = 3000,
  [string]$Hostname = '0.0.0.0',
  [int]$TimeoutSec = 30
)

$ErrorActionPreference = 'Stop'
$project = 'D:\dev\Engage_Timetree'
cd $project

# Ensure PM2 process exists and is started
pm2 describe engaged-next-dev *> $null
if ($LASTEXITCODE -ne 0) {
  pm2 start scripts\pm2-dev.js --name engaged-next-dev
} else {
  pm2 start engaged-next-dev
}

# Wait for HTTP to respond
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 ("http://127.0.0.1:$Port/")
    Write-Host ("OK http://127.0.0.1:$Port/ => {0} len={1}" -f $r.StatusCode, $r.RawContentLength)
    exit 0
  } catch {
    Start-Sleep -Milliseconds 750
  }
}

Write-Host "FAILED: dev server did not respond within ${TimeoutSec}s on port $Port"
Write-Host '--- pm2 status ---'
pm2 status
Write-Host '--- last logs ---'
pm2 logs engaged-next-dev --lines 50
exit 1
