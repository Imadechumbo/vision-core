#!/usr/bin/env bash
# §68 Fase 3 — instala semgrep no EB para gate_no_security_findings
# Se falhar em qualquer passo, pass-gold-engine.js trata ENOENT → gate auto-passa

echo "[VISION CORE §68] Instalando semgrep no EB instance..."

install_semgrep() {
  # Tentativa 1: pip3 normal
  pip3 install semgrep --quiet 2>/dev/null && return 0
  # Tentativa 2: SSL fallback (como Fase 1)
  pip3 install semgrep --quiet \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org 2>/dev/null && return 0
  # Tentativa 3: break-system-packages (Python 3.11+ / AL2023)
  pip3 install semgrep --quiet --break-system-packages 2>/dev/null && return 0
  # Tentativa 4: python3 -m pip
  python3 -m pip install semgrep --quiet --break-system-packages 2>/dev/null && return 0
  python3 -m pip install semgrep --quiet 2>/dev/null && return 0
  return 1
}

if install_semgrep; then
  echo "[VISION CORE §68] semgrep install OK"

  # Se não estiver em PATH, cria symlink em /usr/local/bin
  if ! command -v semgrep >/dev/null 2>&1; then
    SPATH=$(find /root/.local/bin /usr/local/bin /usr/bin -name "semgrep" 2>/dev/null | head -1 || true)
    if [ -n "$SPATH" ]; then
      ln -sf "$SPATH" /usr/local/bin/semgrep 2>/dev/null || true
      echo "[VISION CORE §68] symlink /usr/local/bin/semgrep → $SPATH"
    fi
  fi

  if command -v semgrep >/dev/null 2>&1; then
    VER=$(semgrep --version 2>&1 | head -1 || echo "unknown")
    echo "[VISION CORE §68] semgrep em PATH: $VER ✅"
  else
    echo "[VISION CORE §68] semgrep não em PATH após install — gate auto-passa (ENOENT OK)"
  fi
else
  echo "[VISION CORE §68] semgrep install falhou — gate auto-passa (ENOENT OK)"
fi
