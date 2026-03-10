#!/usr/bin/env bash
set -euo pipefail

ROOT=""
REPO_URL="https://github.com/Itqan-community/Munajjam.git"
REPO_REF="main"
PYTHON_VERSION="3.12"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      ROOT="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --repo-ref)
      REPO_REF="$2"
      shift 2
      ;;
    --python-version)
      PYTHON_VERSION="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ROOT" ]]; then
  echo "Missing required --root argument" >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for automated Munajjam setup on macOS." >&2
  echo "Install Homebrew from https://brew.sh and retry." >&2
  exit 1
fi

echo "Installing required packages with Homebrew..."
brew install git ffmpeg "python@${PYTHON_VERSION}"

mkdir -p "$ROOT/logs"

REPO_DIR="$ROOT/repo"
PACKAGE_DIR="$REPO_DIR/munajjam"
VENV_DIR="$ROOT/venv"
PYTHON_BIN="$(brew --prefix "python@${PYTHON_VERSION}")/bin/python${PYTHON_VERSION}"
VENV_PYTHON="$VENV_DIR/bin/python"
FFMPEG_BIN="$(brew --prefix ffmpeg)/bin/ffmpeg"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python ${PYTHON_VERSION} was not found after Homebrew install." >&2
  exit 1
fi

if [[ ! -x "$FFMPEG_BIN" ]]; then
  echo "FFmpeg was not found after Homebrew install." >&2
  exit 1
fi

printf '%s\n' "$FFMPEG_BIN" > "$ROOT/ffmpeg-path.txt"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Cloning Munajjam repository..."
  git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$REPO_DIR"
else
  echo "Updating managed Munajjam repository..."
  git -C "$REPO_DIR" fetch origin "$REPO_REF" --depth 1
  git -C "$REPO_DIR" checkout "$REPO_REF"
  git -C "$REPO_DIR" pull --ff-only origin "$REPO_REF"
fi

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating Python virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "Upgrading packaging tools..."
"$VENV_PYTHON" -m pip install --upgrade pip setuptools wheel

echo "Installing Munajjam with faster-whisper support..."
"$VENV_PYTHON" -m pip install "${PACKAGE_DIR}[faster-whisper]"

echo "Verifying managed runtime..."
"$VENV_PYTHON" -c "import munajjam, sys; print(f'Python: {sys.executable}'); print(f'munajjam: {getattr(munajjam, \"__version__\", \"unknown\")}')"

echo "Managed Munajjam runtime is ready at $ROOT"
