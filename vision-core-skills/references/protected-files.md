# Protected Files

Critical files must be patch-only:

- server/src/services/harnessMetrics.js
- server/src/services/missionRunner.js
- server/src/services/openclawRouter.js
- server/src/services/passGoldEngine.js
- server/src/services/criticalFileGuard.js
- server/src/services/aegis/**/*.js
- scripts/checkPassGold.js

Forbidden changes:
- full rewrite
- remove PASS GOLD enforcement
- remove Aegis enforcement
- allow Hermes without scanResult
- move Hermes before Scanner
- enable bypassAllowed
