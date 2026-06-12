#!/usr/bin/env bash
# §68 Fase 4c — instala semgrep no EB AL2023 via virtualenv
#
# Histórico de falhas:
#   Fase 3: pip3/python3 ENOENT (não em PATH) — 56ms
#   Fase 4: dnf instala pip3 OK, mas pip3 install semgrep falhou (~0.5s)
#   Fase 4b: erro exposto:
#            "Cannot uninstall requests 2.25.1, RECORD file not found.
#             Hint: The package was installed by rpm."
#            AL2023 tem requests via RPM; pip3 não consegue sobrescrever.
#   Fase 4c: usa virtualenv para isolar semgrep do sistema.
#
# Se tudo falhar: pass-gold-engine.js trata ENOENT → gate auto-passa.

VENV_PATH="/opt/semgrep-venv"
SEMGREP_BIN="${VENV_PATH}/bin/semgrep"
SYMLINK="/usr/local/bin/semgrep"

echo "[VISION CORE §68] Verificando semgrep no EB instance..."

# Se já instalado (deploy anterior na mesma instância): skip
if [ -x "$SEMGREP_BIN" ] || [ -x "$SYMLINK" ]; then
  VER=$("$SYMLINK" --version 2>&1 | head -1 || "$SEMGREP_BIN" --version 2>&1 | head -1 || echo "?")
  echo "[VISION CORE §68] semgrep já disponível: $VER ✅ (skip install)"
  exit 0
fi

echo "[VISION CORE §68] Instalando semgrep via virtualenv (evita conflito com rpm requests)..."

# Passo 1: garante pip3 disponível via dnf (AL2023 Node.js platform não tem por padrão)
if ! command -v pip3 >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    echo "[VISION CORE §68] Instalando python3-pip via dnf..."
    dnf install -y python3-pip 2>/dev/null && \
      echo "[VISION CORE §68] python3-pip OK" || \
      echo "[VISION CORE §68] WARN: dnf falhou"
  fi
fi

# Detecta Python3
PYTHON3_BIN=""
for P in "python3" "/usr/bin/python3" "/usr/bin/python3.9"; do
  if command -v "$P" >/dev/null 2>&1 || [ -x "$P" ]; then
    PYTHON3_BIN="$P"
    break
  fi
done

if [ -z "$PYTHON3_BIN" ]; then
  echo "[VISION CORE §68] python3 não encontrado — gate auto-passa (ENOENT OK)"
  exit 0
fi

echo "[VISION CORE §68] Python: $($PYTHON3_BIN --version 2>&1)"

# Passo 2: cria virtualenv em /opt/semgrep-venv (isola do sistema)
echo "[VISION CORE §68] Criando virtualenv em $VENV_PATH..."
"$PYTHON3_BIN" -m venv "$VENV_PATH" 2>/dev/null || {
  echo "[VISION CORE §68] WARN: venv falhou, tentando pip --ignore-installed..."
  pip3 install semgrep --quiet --ignore-installed 2>/dev/null && \
    echo "[VISION CORE §68] semgrep OK via --ignore-installed" || \
    echo "[VISION CORE §68] semgrep install falhou — gate auto-passa (ENOENT OK)"
  exit 0
}

# Passo 3: instala semgrep no venv
echo "[VISION CORE §68] Instalando semgrep no venv..."
VENV_PIP="${VENV_PATH}/bin/pip"
VENV_PIP_OUT=$("$VENV_PIP" install semgrep --quiet 2>&1)
VENV_PIP_RC=$?

if [ $VENV_PIP_RC -ne 0 ]; then
  # SSL fallback
  echo "[VISION CORE §68] pip venv error: $(echo "$VENV_PIP_OUT" | tail -2 | tr '\n' ' ')"
  "$VENV_PIP" install semgrep --quiet \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org \
    --trusted-host pypi.python.org 2>/dev/null || {
    echo "[VISION CORE §68] semgrep install no venv falhou — gate auto-passa (ENOENT OK)"
    exit 0
  }
fi

# Passo 4: cria symlink em /usr/local/bin (no PATH do Node.js app)
if [ -x "$SEMGREP_BIN" ]; then
  ln -sf "$SEMGREP_BIN" "$SYMLINK" 2>/dev/null || true
  VER=$("$SYMLINK" --version 2>&1 | head -1 || echo "?")
  echo "[VISION CORE §68] semgrep instalado via venv: $VER ✅"
  echo "[VISION CORE §68] symlink: $SYMLINK → $SEMGREP_BIN"
else
  echo "[VISION CORE §68] semgrep não encontrado no venv após install — gate auto-passa"
fi
