# VISION AGENT v0.1

Executor local do VISION CORE. Conecta seus projetos ao Vision Core Server e executa correções autônomas diretamente no seu PC.

## Instalação

```bash
# Opção 1 — npm link (desenvolvimento local)
cd vision-agent
npm link
vision-agent help

# Opção 2 — rodar direto
node bin/vision-agent.js help
```

## Fluxo completo (5 passos)

```bash
# 1. Conectar ao server (rode o vision-core-server primeiro)
vision-agent login

# 2. Registrar seu projeto
vision-agent register C:\Users\imadechumbo\Desktop\technetgamev2-main\backend

# 3. Ver o que o Hermes diagnostica (sem alterar nada)
vision-agent run technetgame-api "Cannot read properties of null reading mimetype" --mode dry-run

# 4. Aplicar correção com snapshot
vision-agent run technetgame-api "Cannot read properties of null reading mimetype" --mode safe-patch

# 5. Se algo der errado — rollback imediato
vision-agent rollback <mission-id>
```

## Comandos

### login
```bash
vision-agent login
vision-agent login --server http://localhost:8787
vision-agent login --token meu-token --server https://visioncore.meusite.com
```
Salva credenciais em `~/.vision-agent/config.json`.

### register
```bash
vision-agent register <path>
vision-agent register . --id meu-app --name "Meu App" --adapter generic
vision-agent register ./backend --adapter technetgame
```
Detecta automaticamente: nome, stack e adapter pelo `package.json`.

### run
```bash
# Só diagnóstico, zero alteração de arquivo
vision-agent run <project-id> "<problema>" --mode dry-run

# Aplica patch com snapshot automático (padrão)
vision-agent run <project-id> "<problema>" --mode safe-patch

# safe-patch + cria PR no GitHub
vision-agent run <project-id> "<problema>" --mode pr

# Com log real para contexto mais preciso
vision-agent run <project-id> "<problema>" --log ./logs/app.log

# Forçar patches de alto risco (use com cuidado)
vision-agent run <project-id> "<problema>" --force-high-risk
```

### status
```bash
vision-agent status
```
Mostra estado do server, projetos registrados e métricas.

### missions
```bash
vision-agent missions
vision-agent missions technetgame-api
```

### rollback
```bash
vision-agent rollback mission_1234567890_abcd1234
```
Restaura os arquivos ao estado exato antes da missão.

## Regras de segurança

- **Nunca aplica patch sem snapshot** — se não conseguir criar snapshot, aborta.
- **Rollback sempre disponível** — para qualquer missão bem-sucedida.
- **Dry-run por padrão** — use `--mode safe-patch` explicitamente para alterar arquivos.
- **Alto risco bloqueado** — patches de alto risco exigem `--force-high-risk`.

## Variáveis de ambiente (alternativa ao login)

```bash
VISION_CORE_URL=http://localhost:8787
VISION_AGENT_TOKEN=meu-token
```

## Estrutura

```
vision-agent/
  bin/
    vision-agent.js      ← executável (#!/usr/bin/env node)
  src/
    index.js             ← dispatcher de comandos
    commands/
      login.js           ← salvar token e URL
      register.js        ← registrar projeto
      run.js             ← executar missão (dry-run/safe-patch/pr)
      status.js          ← status, missions, rollback
    lib/
      api.js             ← cliente HTTP para o Vision Core Server
      config.js          ← config local ~/.vision-agent/config.json
      ui.js              ← output formatado no terminal (ANSI puro)
```

## Exemplo real com TechNetGame

```bash
# Registrar o backend do TechNetGame
vision-agent register "C:\Users\imadechumbo\Desktop\technetgamev2-main\backend"

# Diagnóstico do erro de CORS
vision-agent run technetgame-api "CORS error: blocked by CORS policy" --mode dry-run

# Correção com snapshot
vision-agent run technetgame-api "CORS error: blocked by CORS policy" --mode safe-patch

# Se o build quebrou — rollback imediato
vision-agent rollback <mission-id>
```
