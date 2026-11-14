param(
  [string]$Source = "C:\Users\harol\OneDrive\Documents\Default Project",
  [string]$Destination = "C:\Users\harol\OneDrive\Desktop\PTIS-Default-Project.zip"
)

$ErrorActionPreference = 'Stop'
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("PTIS-Default-Project-" + [guid]::NewGuid().ToString() + ".zip")
try {
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  Compress-Archive -Path (Join-Path $Source '*') -DestinationPath $tmp -Force
  Move-Item -Path $tmp -Destination $Destination -Force
  Write-Output ("Saved: " + $Destination + " (" + (Get-Item $Destination).Length + " bytes) " + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}
