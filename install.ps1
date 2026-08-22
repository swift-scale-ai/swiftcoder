param(
  [string]$Version = $(if ($env:SWIFTCODER_VERSION) { $env:SWIFTCODER_VERSION } else { "latest" }),
  [string]$InstallDir = $(if ($env:SWIFTCODER_INSTALL_DIR) { $env:SWIFTCODER_INSTALL_DIR } else { "$env:LOCALAPPDATA\Programs\SwiftCoder\bin" })
)

$ErrorActionPreference = "Stop"
$Repository = "swift-scale-ai/swiftcoder"

if ($Version -eq "latest") {
  $Tag = (Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest").tag_name
} elseif ($Version.StartsWith("v")) { $Tag = $Version } else { $Tag = "v$Version" }
if ($Tag -notmatch '^v\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$') { throw "Invalid SwiftCoder release tag: $Tag" }

$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
switch ($Architecture) { "arm64" { $Arch = "arm64" }; "x64" { $Arch = "x64" }; default { throw "Unsupported CPU architecture: $Architecture" } }

$Base = "swiftcoder-cli-windows-$Arch"
if ($Arch -eq "x64") {
  try { $SupportsAvx2 = [System.Runtime.Intrinsics.X86.Avx2]::IsSupported } catch { $SupportsAvx2 = $false }
  if (-not $SupportsAvx2) { $Base = "$Base-baseline" }
}
$Archive = "$Base.zip"
$DownloadBase = "https://github.com/$Repository/releases/download/$Tag"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("swiftcoder-" + [guid]::NewGuid())

try {
  New-Item -ItemType Directory -Path $TempDir | Out-Null
  $ArchivePath = Join-Path $TempDir $Archive
  $ChecksumsPath = Join-Path $TempDir "checksums.txt"
  Invoke-WebRequest -Uri "$DownloadBase/$Archive" -OutFile $ArchivePath
  Invoke-WebRequest -Uri "$DownloadBase/swiftcoder-cli-checksums.txt" -OutFile $ChecksumsPath
  $ChecksumLine = Get-Content $ChecksumsPath | Where-Object { $_ -match "^[0-9a-fA-F]{64}\s+$([regex]::Escape($Archive))$" } | Select-Object -First 1
  if (-not $ChecksumLine) { throw "No checksum published for $Archive" }
  $Expected = ($ChecksumLine -split '\s+')[0].ToLowerInvariant()
  $Actual = (Get-FileHash -Algorithm SHA256 $ArchivePath).Hash.ToLowerInvariant()
  if ($Actual -ne $Expected) { throw "Checksum verification failed for $Archive" }
  $Extracted = Join-Path $TempDir "extracted"
  Expand-Archive -Path $ArchivePath -DestinationPath $Extracted
  $Binary = Get-ChildItem -Path $Extracted -Filter "swiftcoder.exe" -File -Recurse | Select-Object -First 1
  if (-not $Binary) { throw "The release archive does not contain swiftcoder.exe" }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Copy-Item -Force $Binary.FullName (Join-Path $InstallDir "swiftcoder.exe")
  Write-Host "Installed SwiftCoder CLI $Tag to $InstallDir\swiftcoder.exe"
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $PathEntries = @($UserPath -split ';' | Where-Object { $_ })
  if ($PathEntries -notcontains $InstallDir) {
    [Environment]::SetEnvironmentVariable("Path", (($PathEntries + $InstallDir) -join ';'), "User")
    Write-Host "Added $InstallDir to your user PATH. Open a new terminal before running SwiftCoder."
  }
  Write-Host "Next: swiftcoder login"
} finally { if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir } }
