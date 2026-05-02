# VISION CORE V2.9.8 FINAL HARDENED

Patch incremental sobre V2.9.8 Command Chat.

## Corrige
- Dropdown nativo branco -> dropdown dark custom.
- Timeline duplicada -> mantém apenas a primeira.
- Espaçamento do Command Center.
- Guard final contra `/api/api`.
- Exportação de logs.
- Replay de missão.
- Persistência local do chat.

## Deploy
```powershell
cd frontend
npx wrangler pages deploy . --project-name visioncoreai --commit-dirty=true
```
