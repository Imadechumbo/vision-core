# Stress Fixture — Vision Core Pipeline Test

Projeto de teste com bugs graduados por nível de severidade.

## Níveis de stress

| Nível | Arquivo | Tipo de bug | Agente esperado |
|-------|---------|-------------|-----------------|
| L1 | level1_syntax.py | Sintaxe Python | Scanner |
| L2 | level2_logic.py | Lógica de negócio | PatchEngine |
| L3 | level3_security.py | Segurança (AEGIS) | Aegis |
| L4 | level4_runtime.py | Runtime/crash | PatchEngine |

## Uso

Este projeto é um fixture de teste para o Vision Core pipeline.
Não usar em produção.
