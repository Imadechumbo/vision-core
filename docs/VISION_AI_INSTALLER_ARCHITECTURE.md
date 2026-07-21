# Vision AI Installer — Arquitetura

**Estado:** PLANEJADO (Fase 0). Zero código Tauri/Rust.

## Limites

```text
Desktop UI
  -> Application services
     -> Hardware Detector / Compatibility / Advisor / Storage Planner
     -> Dependency / Download / Runtime / Update-Rollback managers
     -> Colibri Adapter / OpenAI API Adapter / Vision Core Connector
     -> Health-Test / Evidence Recorder / Local Logs
```

O aplicativo Tauri será a fronteira de consentimento. O core Rust fará filesystem, subprocessos, hashing e lifecycle. HTML/CSS/TypeScript exibirá estado e solicitará ações; não montará shell commands.

## Estado e dados

- Estado somente no diretório de aplicação do usuário, nunca no repositório.
- JSON versionado por schema, escrita atômica e backup antes de migração.
- Diretórios de runtime/model/cache/log escolhidos pelo usuário e validados contra traversal, junction, overwrite e falta de espaço.
- Logs JSONL rotacionados e sanitizados; argumentos sensíveis são redigidos.

## Adapters

- **Colibri:** clone/commit exato, build/doctor/lifecycle; configuração externa, upstream imutável.
- **OpenAI-compatible:** localhost por padrão, porta configurável, `/v1/models`, chat, streaming opcional, timeout e cancelamento.
- **Vision Core:** consumidor de contrato existente. Como o contrato local reversível ainda não existe, permanece `BLOCKED_CONTRACT`.

## Reprodutibilidade

Plano de instalação imutável registra versões, origens, checksums, caminhos normalizados e decisões. Toda etapa é idempotente ou falha visivelmente. Downloads usam `.partial`; promoção exige checksum. Cleanup opera apenas dentro de raízes gerenciadas verificadas.

## Evolução sem abstração falsa

V0.1 implementará apenas Windows/NVIDIA/Colibri/GLM-5.2. Interfaces futuras só serão extraídas quando uma segunda plataforma/runtime real existir.
