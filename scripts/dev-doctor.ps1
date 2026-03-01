param(
  [int]$Port = 3000,
  [string]$TailIp = '100.106.43.20'
)

$ErrorActionPreference = 'Continue'

Write-Host "== LISTENER (port $Port) =="
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Format-Table -AutoSize

Write-Host "== PROCESS =="
$pid = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if($pid){ Get-Process -Id $pid -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path | Format-Table -AutoSize }

Write-Host '== PM2 STATUS =='
pm2 status

function Test-Url($u){
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 6 $u
    Write-Host ("OK  {0} => {1} len={2}" -f $u, $r.StatusCode, $r.RawContentLength)
  } catch {
    Write-Host ("ERR {0} => {1}" -f $u, $_.Exception.Message)
  }
}

Write-Host '== HTTP CHECKS =='
Test-Url "http://127.0.0.1:$Port/"
Test-Url "http://localhost:$Port/"
Test-Url ("http://${TailIp}:$Port/")
Test-Url "http://127.0.0.1:$Port/api/auth/me"

Write-Host '== LAST LOGS (50) =='
pm2 logs engaged-next-dev --lines 50

