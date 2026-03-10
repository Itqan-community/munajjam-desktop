[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [string]$RepoUrl = "https://github.com/Itqan-community/Munajjam.git",
  [string]$RepoRef = "main",
  [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found."
  }
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Error "winget is required for automated Munajjam setup on Windows."
  Write-Error "Install App Installer from Microsoft and retry."
  exit 1
}

Write-Host "Installing required packages with winget..."
winget install --exact --id Git.Git --accept-package-agreements --accept-source-agreements
winget install --exact --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
winget install --exact --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements

Require-Command git

$null = New-Item -ItemType Directory -Force -Path $Root
$null = New-Item -ItemType Directory -Force -Path (Join-Path $Root "logs")

$RepoDir = Join-Path $Root "repo"
$PackageDir = Join-Path $RepoDir "munajjam"
$VenvDir = Join-Path $Root "venv"
$VenvPython = Join-Path $VenvDir "Scripts\\python.exe"
$FfmpegMarker = Join-Path $Root "ffmpeg-path.txt"

if (-not (Test-Path (Join-Path $RepoDir ".git"))) {
  Write-Host "Cloning Munajjam repository..."
  git clone --depth 1 --branch $RepoRef $RepoUrl $RepoDir
} else {
  Write-Host "Updating managed Munajjam repository..."
  git -C $RepoDir fetch origin $RepoRef --depth 1
  git -C $RepoDir checkout $RepoRef
  git -C $RepoDir pull --ff-only origin $RepoRef
}

if (-not (Test-Path $VenvDir)) {
  Write-Host "Creating Python virtual environment..."
  if (Get-Command py.exe -ErrorAction SilentlyContinue) {
    & py ("-" + $PythonVersion) -m venv $VenvDir
  } elseif (Get-Command python.exe -ErrorAction SilentlyContinue) {
    & python -m venv $VenvDir
  } else {
    throw "Python $PythonVersion was not found after winget install."
  }
}

$FfmpegBin = $null
$FfmpegCommand = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
if ($FfmpegCommand) {
  $FfmpegBin = $FfmpegCommand.Source
}

if (-not $FfmpegBin) {
  $WingetPackages = Join-Path $env:LOCALAPPDATA "Microsoft\\WinGet\\Packages"
  if (Test-Path $WingetPackages) {
    $PackageDirEntry = Get-ChildItem -Path $WingetPackages -Directory -Filter "Gyan.FFmpeg_*" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($PackageDirEntry) {
      $Match = Get-ChildItem -Path $PackageDirEntry.FullName -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($Match) {
        $FfmpegBin = $Match.FullName
      }
    }
  }
}

if (-not $FfmpegBin) {
  throw "FFmpeg executable not found after winget install."
}

Set-Content -Path $FfmpegMarker -Value $FfmpegBin -NoNewline

Write-Host "Upgrading packaging tools..."
& $VenvPython -m pip install --upgrade pip setuptools wheel

Write-Host "Installing Munajjam with faster-whisper support..."
& $VenvPython -m pip install "$PackageDir[faster-whisper]"

Write-Host "Verifying managed runtime..."
& $VenvPython -c "import munajjam, sys; print(f'Python: {sys.executable}'); print(f'munajjam: {getattr(munajjam, ""__version__"", ""unknown"")}')"

Write-Host "Managed Munajjam runtime is ready at $Root"
