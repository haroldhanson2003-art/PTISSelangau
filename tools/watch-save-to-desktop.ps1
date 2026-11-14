param(
  [string]$Source = "C:\Users\harol\OneDrive\Documents\Default Project",
  [string]$Destination = "C:\Users\harol\OneDrive\Desktop\PTIS-Default-Project.zip",
  [int]$DebounceMs = 2500
)

$ErrorActionPreference = 'SilentlyContinue'
$saveScript = Join-Path $PSScriptRoot 'save-to-desktop.ps1'
$lastRun = [DateTime]::MinValue
$pending = $false
$timer = New-Object System.Timers.Timer($DebounceMs)
$timer.AutoReset = $false

$action = {
  $pending = $false
  try { & $using:saveScript -Source $using:Source -Destination $using:Destination | Out-Null } catch {}
}
Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action $action | Out-Null

$fsw = New-Object System.IO.FileSystemWatcher $Source
$fsw.IncludeSubdirectories = $true
$fsw.EnableRaisingEvents = $true
$fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'

$handler = {
  $path = $Event.SourceEventArgs.FullPath
  if (-not $path) { return }
  # ignore temp/zip destination and git internals if any
  if ($path -like '*.tmp' -or $path -like '*PTIS-Default-Project*.zip') { return }
  $timer.Stop(); $timer.Start()
}

Register-ObjectEvent $fsw Changed -SourceIdentifier 'ptis-save-changed' -Action $handler | Out-Null
Register-ObjectEvent $fsw Created -SourceIdentifier 'ptis-save-created' -Action $handler | Out-Null
Register-ObjectEvent $fsw Deleted -SourceIdentifier 'ptis-save-deleted' -Action $handler | Out-Null
Register-ObjectEvent $fsw Renamed -SourceIdentifier 'ptis-save-renamed' -Action $handler | Out-Null

# initial save
try { & $saveScript -Source $Source -Destination $Destination | Out-Null } catch {}

while ($true) { Start-Sleep -Seconds 5 }
