# PASS GOLD Doctrine

PASS GOLD is the only approval gate.

Nothing is promoted, merged, released, marked stable, or used as rollback baseline unless pass_gold === true.

Required gates:
- OpenClaw route valid
- Scanner target resolution
- Hermes RCA with scanResult
- PatchEngine safe patch
- Aegis OK
- Validation OK
- Critical File Guard OK when applicable
- CI confirms checks
