# Vision Agent Desktop — Build Guide

## Pré-requisitos
- Node.js >= 18
- Windows: Visual Studio Build Tools (para compilação nativa)

## Instalar e buildar

```bash
cd desktop-agent/
npm install
npm run build:win   # → dist/VisionAgentSetup.exe
npm run build:mac   # → dist/Vision Agent-1.0.0.dmg
npm run build:linux # → dist/Vision Agent-1.0.0.AppImage
```

## Rodar em dev (sem build)
```bash
npm install
npx electron .
```

## Configurar a primeira vez
1. Abrir o app
2. Ir em ⚙️ Config
3. Preencher:
   - API URL: https://visioncore-api-gateway.weiganlight.workers.dev
   - Token JWT: (obter em /api/auth/login)
   - Project ID: (opcional)
4. Salvar

## Features
- ⬡ Tray icon com menu (abrir, status, sair)
- 🚀 Mission runner com SSE ao vivo
- 📋 Orbit nodes animados por evento SSE real
- 📊 Report viewer com dados reais (/api/pass-gold/score)
- ⚙️ Configurações persistentes em userData
- ⬆ Update checker via GitHub releases API
- 🔔 Notificação nativa ao PASS GOLD


## V4.3.1 Final Consistency

Desktop Agent não precisa replicar a Orbit do dashboard. O app desktop é um Mission Console: tray, mission runner, live logs, mission report, settings e update checker.

Windows build real:

```powershell
cd desktop-agent
npm install
npm run build:win
```

Saídas esperadas:

- `dist/VisionAgentSetup.exe` — instalador NSIS
- build portable opcional, também gerado pelo electron-builder

PASS GOLD do installer só é válido quando o arquivo existir em `dist/` e abrir no Windows.
