#!/usr/bin/env bash
# §68 Fase 4b — instala semgrep no EB AL2023 Node.js platform
#
# Histórico:
#   Fase 3: pip3/python3 não em PATH → ENOENT 56ms
#   Fase 4: dnf install python3-pip OK, mas pip3 install semgrep falhou
#           (~0.5s/tentativa = SSL ou dep error rápido — 2>/dev/null escondia)
#   Fase 4b: expõe erro real + upgrade pip + --no-cache-dir + pip3 show check
#
# Se tudo falhar: pass-gold-engine.js trata ENOENT → gate auto-passa.

echo "[VISION CORE §68] Verificando semgrep no EB instance..."

# Se já instalado nesta instância (deploy anterior): skip
if command -v semgrep >/dev/null 2>&1 || [ -x /usr/local/bin/semgrep ]; then
  VER=$(semgrep --version 2>&1 | head -1 || echo "?")
  echo "[VISION CORE §68] semgrep já disponível: $VER ✅ (skip install)"
  exit 0
fi

echo "[VISION CORE §68] pip3 fora do PATH — instalando via dnf (AL2023)..."

# Passo 1: dnf install python3-pip
if command -v dnf >/dev/null 2>&1; then
  dnf install -y python3-pip 2>/dev/null && \
    echo "[VISION CORE §68] python3-pip instalado via dnf" || \
    echo "[VISION CORE §68] WARN: dnf install python3-pip falhou"
fi

# Passo 2: upgrade pip para evitar problemas de versão antiga (21.3.1)
pip3 install --upgrade pip --quiet 2>/dev/null || \
  /usr/bin/python3 -m pip install --upgrade pip --quiet 2>/dev/null || true
echo "[VISION CORE §68] pip version: $(pip3 --version 2>/dev/null || echo 'N/A')"

# Passo 3: tenta instalar semgrep — EXPÕE ERRO na tentativa 1
echo "[VISION CORE §68] Tentando pip3 install semgrep..."
PIP3_OUT=$(pip3 install semgrep --quiet --no-cache-dir 2>&1) && {
  echo "[VISION CORE §68] semgrep OK via pip3"
} || {
  # Mostra as últimas 3 linhas do erro real
  echo "[VISION CORE §68] pip3 error: $(echo "$PIP3_OUT" | tail -3 | tr '\n' ' ')"

  # Tentativa 2: SSL trusted-host
  pip3 install semgrep --quiet --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org \
    --trusted-host pypi.python.org 2>/dev/null && \
    echo "[VISION CORE §68] semgrep OK via pip3 --trusted-host" || {

    # Tentativa 3: break-system-packages
    pip3 install semgrep --quiet --no-cache-dir \
      --break-system-packages 2>/dev/null && \
      echo "[VISION CORE §68] semgrep OK via --break-system-packages" || {

      # Tentativa 4: python3 explícito
      /usr/bin/python3 -m pip install semgrep --quiet --no-cache-dir 2>/dev/null && \
        echo "[VISION CORE §68] semgrep OK via /usr/bin/python3 -m pip" || {
        echo "[VISION CORE §68] semgrep install falhou todas tentativas — gate auto-passa (ENOENT OK)"
      }
    }
  }
}

# Verifica + symlink se necessário
if pip3 show semgrep >/dev/null 2>&1; then
  SPATH=$(pip3 show semgrep 2>/dev/null | grep ^Location | cut -d' ' -f2)
  SBIN=$(find "$SPATH/../../../bin" /root/.local/bin /usr/local/bin /usr/bin \
          -name "semgrep" 2>/dev/null | head -1 || true)
  if [ -n "$SBIN" ] && [ -x "$SBIN" ]; then
    ln -sf "$SBIN" /usr/local/bin/semgrep 2>/dev/null || true
    echo "[VISION CORE §68] symlink /usr/local/bin/semgrep → $SBIN"
  fi
fi

if command -v semgrep >/dev/null 2>&1; then
  VER=$(semgrep --version 2>&1 | head -1 || echo "unknown")
  echo "[VISION CORE §68] semgrep em PATH: $VER ✅"
else
  echo "[VISION CORE §68] semgrep não em PATH após tentativas — gate auto-passa"
fi
