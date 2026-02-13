#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_DIR="${ROOT_DIR}/.wwebjs_auth"
BACKUP_DIR="${ROOT_DIR}/backups"

mkdir -p "${BACKUP_DIR}"

if [ ! -d "${SESSION_DIR}" ]; then
  echo "Session directory not found: ${SESSION_DIR}"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_DIR}/wwebjs_auth-${STAMP}.tar.gz"

tar -czf "${ARCHIVE}" -C "${SESSION_DIR}" .
echo "Backup created: ${ARCHIVE}"
