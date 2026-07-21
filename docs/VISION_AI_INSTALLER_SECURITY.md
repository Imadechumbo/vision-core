# Vision AI Installer — Segurança e Threat Model

**Estado:** threat model da Fase 0; implementação NOT_RUN.

| Ameaça | Controle obrigatório | Prova futura |
|---|---|---|
| Instalador/binário adulterado | origem allowlisted, HTTPS, assinatura/checksum | fixture com hash inválido |
| Command injection | executável + argumentos estruturados; nunca shell concatenado | payload adversarial |
| Path traversal/overwrite | canonicalização, raiz gerenciada, no-follow, confirmação | traversal/junction tests |
| DLL hijacking | caminho absoluto, cwd controlado, PATH mínimo | fixture DLL lateral |
| Elevação silenciosa | preview e confirmação humana por ação | cancelamento UAC |
| Download parcial malicioso | `.partial`, resume validado, hash antes de promover | interrupção + checksum |
| Endpoint exposto | bind loopback; rejeitar host externo | probe de interfaces |
| Porta ocupada | detectar dono, sugerir porta, nunca matar | servidor fixture |
| Config manipulada | schema/version/hash e backup | config adulterada |
| Secret em logs | redaction antes de persistir | token canário ausente |
| Processo duplicado/crash | PID validado, lock, timeout e encerramento gracioso | restart/crash fixtures |
| Cleanup destrutivo | boundary resolvida, não seguir junction, confirmação | diretório sentinela |
| Provider irreversível | preview, backup, confirmação, remoção específica | round-trip de registro |
| Dependência não confiável | catálogo oficial pinado e integridade | origem não allowlisted |

## Regras invariantes

Least privilege; nenhuma telemetria sem consentimento; nenhum secret em config, log ou evidência; nenhuma URL externa como provider local; nenhuma ação destrutiva sem preview e confirmação; nenhum status de sucesso sem evidência PONYTAIL-VAI-001.

## Trust boundaries

1. UI ↔ comandos Tauri validados.
2. Core ↔ filesystem/processos externos.
3. Download Manager ↔ internet/origens oficiais.
4. Runtime ↔ localhost OpenAI-compatible.
5. Connector ↔ Vision Core autenticado.
