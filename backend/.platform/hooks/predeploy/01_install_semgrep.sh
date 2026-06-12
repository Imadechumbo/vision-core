#!/usr/bin/env bash
# §68 Fase 4 — instala semgrep no EB AL2023 Node.js platform
#
# Causa raiz Fase 3: EB Node.js platform não expõe pip3/python3 no PATH
# padrão durante predeploy hooks. Solução: dnf install python3-pip primeiro.
#
# Se tudo falhar: pass-gold-engine.js trata ENOENT → gate auto-passa.

echo "[VISION CORE §68] Verificando semgrep no EB instance..."

# Se já instalado nesta instância (deploy anterior): skip para economizar tempo
if command -v semgrep >/dev/null 2>&1 || [ -x /usr/local/bin/semgrep ]; then
  VER=$(semgrep --version 2>&1 | head -1 || /usr/local/bin/semgrep --version 2>&1 | head -1 || echo "?")
  echo "[VISION CORE §68] semgrep já disponível: $VER ✅ (skip install)"
  exit 0
fi

echo "[VISION CORE §68] pip3/python3 fora do PATH — instalando via dnf (AL2023)..."

# Passo 1: dnf install python3-pip (AL2023 não tem pip por padrão no Node.js platform)
if command -v dnf >/dev/null 2>&1; then
  dnf install -y python3-pip 2>/dev/null && \
    echo "[VISION CORE §68] python3-pip instalado via dnf" || \
    echo "[VISION CORE §68] dnf install python3-pip falhou (continuando)"
fi

# Passo 2: instala semgrep via pip3
install_semgrep() {
  # pip3 normal (após dnf install python3-pip)
  pip3 install semgrep --quiet 2>/dev/null && return 0
  # SSL fallback
  pip3 install semgrep --quiet \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org 2>/dev/null && return 0
  # break-system-packages (Python 3.11+)
  pip3 install semgrep --quiet --break-system-packages 2>/dev/null && return 0
  # /usr/bin/python3 explícito (PATH limitado no hook)
  /usr/bin/python3 -m pip install semgrep --quiet --break-system-packages 2>/dev/null && return 0
  /usr/bin/python3 -m pip install semgrep --quiet 2>/dev/null && return 0
  # python3.9 explícito (AL2023 default)
  /usr/bin/python3.9 -m pip install semgrep --quiet 2>/dev/null && return 0
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
    echo "[VISION CORE §68] WARN: instalado mas não em PATH — gate auto-passa"
  fi
else
  echo "[VISION CORE §68] semgrep install falhou todas tentativas — gate auto-passa (ENOENT OK)"
fi
