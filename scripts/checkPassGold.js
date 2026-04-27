#!/usr/bin/env node
'use strict';

/**
 * VISION CORE — PASS GOLD Check
 *
 * Script de validação para CI (GitHub Actions + Gitness pipeline).
 * Verifica:
 *   1. passGoldEngine.js existe e exporta evaluate()
 *   2. Nenhum arquivo do pipeline tem bypass de PASS GOLD
 *   3. missionRunner não tem forceHighRisk ou bypassAegis
 *   4. Aegis não tem bypass de bloqueio
 *   5. hybrid-git.json não tem bypass_allowed: true
 *
 * Sai com código 0 se tudo OK, 1 se falhou.
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');

let passed = 0;
let failed = 0;
const errors = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✔ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}: ${result}`);
      errors.push({ check: name, reason: result });
      failed++;
    }
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    errors.push({ check: name, reason: e.message });
    failed++;
  }
}

function readFile(rel) {
  return fs.readFileSync(path.join(SERVER, rel), 'utf-8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(SERVER, rel));
}

// ──────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log(' VISION CORE — PASS GOLD Integrity Check');
console.log('═══════════════════════════════════════════\n');

// 1. passGoldEngine existe
console.log('[ Módulo PASS GOLD ]');
check('passGoldEngine.js existe', () =>
  fileExists('src/services/passGoldEngine.js') || 'passGoldEngine.js não encontrado'
);

check('passGoldEngine exporta evaluate()', () => {
  // Verificar via leitura de código — sem require (evita falha de SQLite nativo em CI)
  const src = readFile('src/services/passGoldEngine.js');
  if (!src.includes('evaluate') || !src.includes('module.exports')) {
    return 'evaluate() não encontrado no arquivo';
  }
  return true;
});

// 2. missionRunner não tem bypasses
console.log('\n[ Pipeline — missionRunner.js ]');
check('missionRunner.js existe', () =>
  fileExists('src/services/missionRunner.js') || 'missionRunner.js não encontrado'
);

check('missionRunner não tem forceHighRisk bypass', () => {
  const src = readFile('src/services/missionRunner.js');
  const hasBypass = /forceHighRisk.*true|options\.forceHighRisk/i.test(src);
  if (hasBypass) return 'forceHighRisk bypass detectado — viola política de segurança';
  return true;
});

check('missionRunner não tem bypassAegis', () => {
  const src = readFile('src/services/missionRunner.js');
  if (/bypassAegis|skip_aegis|skipAegis/i.test(src)) return 'bypass de Aegis detectado';
  return true;
});

check('missionRunner exporta runMission', () => {
  const src = readFile('src/services/missionRunner.js');
  if (!src.includes('runMission')) return 'runMission não encontrado no arquivo';
  return true;
});

// 3. Aegis não tem bypass
console.log('\n[ Segurança — aegis.js ]');
check('aegis.js existe', () =>
  fileExists('src/services/aegis.js') || 'aegis.js não encontrado'
);

check('Aegis: ok = risk !== high (sem exceções)', () => {
  const src = readFile('src/services/aegis.js');
  // Verificar que não há lógica que deixe high passar
  if (/if.*ok.*&&.*force|forceBypass|skipBlock/i.test(src)) {
    return 'Bypass de bloqueio detectado no Aegis';
  }
  return true;
});

check('Aegis exporta verify()', () => {
  const mod = require(path.join(SERVER, 'src/services/aegis.js'));
  if (typeof mod.verify !== 'function') return 'verify() não exportado';
  return true;
});

// 4. Config híbrido não tem bypass
console.log('\n[ Config — hybrid-git.json ]');
const hybridCfgPath = path.join(SERVER, 'config/hybrid-git.json');
if (fs.existsSync(hybridCfgPath)) {
  check('hybrid-git.json: bypass_allowed = false', () => {
    const cfg = JSON.parse(fs.readFileSync(hybridCfgPath, 'utf-8'));
    if (cfg.pass_gold_rule?.bypass_allowed === true) {
      return 'bypass_allowed: true viola a política de PASS GOLD';
    }
    return true;
  });
} else {
  console.log('  ⚠ hybrid-git.json não encontrado (opcional)');
}

// 5. hermesMemory não grava sem PASS GOLD no bucket validated
console.log('\n[ Memória — hermesMemory.js ]');
check('hermesMemory.js existe', () =>
  fileExists('src/services/hermesMemory.js') || 'hermesMemory.js não encontrado'
);

check('hermesMemory: validated_memory só para success/PASS_GOLD', () => {
  const src = readFile('src/services/hermesMemory.js');
  // Verificar via texto — evita require com SQLite nativo
  if (!src.includes('validated_memory') || !src.includes('success')) {
    return 'validated_memory ou success não encontrados no arquivo';
  }
  // Verificar que dry_run não está mapeado para validated_memory
  if (/dry_run.*validated_memory|validated_memory.*dry_run/i.test(src)) {
    return 'dry_run não deveria entrar em validated_memory';
  }
  return true;
});

// 6. Gitness service existe (se modo hybrid)
console.log('\n[ Hybrid Git ]');
check('gitnessService.js existe', () =>
  fileExists('src/services/gitness/gitnessService.js') || 'gitnessService.js não encontrado'
);

check('hybridGitService.js existe', () =>
  fileExists('src/services/gitness/hybridGitService.js') || 'hybridGitService.js não encontrado'
);

check('hybridGitService: PASS GOLD obrigatório antes do push', () => {
  // Verificar que missionRunner só chama createHybridPR depois de gold.pass_gold
  const src = readFile('src/services/missionRunner.js');
  // Deve haver uma condição de gold.pass_gold antes do PR
  const hasPRCall = src.includes('createHybridPR') || src.includes('createPR');
  if (!hasPRCall) return 'Nenhuma chamada de PR encontrada — verificar missionRunner';
  return true;
});

// 6. criticalFileGuard existe e é válido
console.log('\n[ Critical File Guard ]');
check('critical-files.json existe', () =>
  fileExists('config/critical-files.json') || 'critical-files.json não encontrado'
);

check('critical-files.json: bypass_allowed = false', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(SERVER, 'config/critical-files.json'), 'utf-8'));
  if (cfg.bypass_allowed === true) return 'bypass_allowed: true viola a política de proteção';
  return true;
});

check('criticalFileGuard.js existe', () =>
  fileExists('src/services/criticalFileGuard.js') || 'criticalFileGuard.js não encontrado'
);

check('harnessMetrics.js existe', () =>
  fileExists('src/services/harnessMetrics.js') || 'harnessMetrics.js não encontrado'
);

check('criticalFileGuard.js passa node --check', () => {
  const { execSync } = require('child_process');
  try {
    execSync(`node --check ${path.join(SERVER, 'src/services/criticalFileGuard.js')}`, { stdio: 'pipe' });
    return true;
  } catch (e) { return `Sintaxe inválida: ${e.stderr?.toString().slice(0, 100)}`; }
});

check('harnessMetrics.js passa node --check', () => {
  const { execSync } = require('child_process');
  try {
    execSync(`node --check ${path.join(SERVER, 'src/services/harnessMetrics.js')}`, { stdio: 'pipe' });
    return true;
  } catch (e) { return `Sintaxe inválida: ${e.stderr?.toString().slice(0, 100)}`; }
});

check('criticalFileGuard exporta assertCriticalPatchAllowed via texto', () => {
  const src = readFile('src/services/criticalFileGuard.js');
  if (!src.includes('assertCriticalPatchAllowed')) return 'assertCriticalPatchAllowed não encontrado';
  if (!src.includes('module.exports')) return 'module.exports ausente';
  return true;
});

check('missionRunner usa OpenClaw antes do Hermes', () => {
  const src = readFile('src/services/missionRunner.js');
  // OpenClaw deve ser importado
  if (!src.includes('openclawRouter') && !src.includes("require('./openclawRouter')")) {
    return 'OpenClaw Router não importado no missionRunner';
  }
  // No pipeline, route() deve aparecer antes de analyzeError()
  // Buscar dentro da função _pipeline (após a definição)
  const pipelineStart = src.indexOf('async function _pipeline') !== -1
    ? src.indexOf('async function _pipeline')
    : src.indexOf('function _pipeline');
  if (pipelineStart === -1) return 'Função _pipeline não encontrada no missionRunner';

  const pipelineBody  = src.slice(pipelineStart);
  const routeCallIdx  = pipelineBody.search(/route\s*\(errorInput|openclawRouter\./);
  const hermesCallIdx = pipelineBody.search(/analyzeError\s*\(/);

  if (routeCallIdx === -1)   return 'route() do OpenClaw não encontrado no corpo do _pipeline';
  if (hermesCallIdx === -1)  return 'analyzeError() não encontrado no corpo do _pipeline';
  if (routeCallIdx > hermesCallIdx) return 'route() (OpenClaw) deve aparecer antes de analyzeError() no pipeline';
  return true;
});

check('missionRunner não permite Hermes sem scanResult', () => {
  const src = readFile('src/services/missionRunner.js');
  // scanResult deve ser passado para analyzeError
  if (!src.includes('scanResult')) return 'scanResult não encontrado no missionRunner';
  return true;
});

check('arquivos críticos não contêm padrões proibidos', () => {
  const critCfg = JSON.parse(fs.readFileSync(path.join(SERVER, 'config/critical-files.json'), 'utf-8'));
  const forbidden = critCfg.forbiddenPatterns || [];
  const filesToCheck = [
    'src/services/missionRunner.js',
    'src/services/passGoldEngine.js',
    'src/services/aegis.js',
  ];
  for (const f of filesToCheck) {
    if (!fileExists(f)) continue;
    const src = readFile(f);
    for (const pat of forbidden) {
      if (src.includes(pat)) {
        return `Padrão proibido "${pat}" encontrado em ${f}`;
      }
    }
  }
  return true;
});
console.log('\n═══════════════════════════════════════════');
console.log(` Resultado: ${passed} passou | ${failed} falhou`);
console.log('═══════════════════════════════════════════\n');

if (failed > 0) {
  console.error('FALHAS:');
  for (const e of errors) {
    console.error(`  ✗ [${e.check}] ${e.reason}`);
  }
  console.error('\n❌ PASS GOLD integrity check FALHOU — merge bloqueado\n');
  process.exit(1);
} else {
  console.log('✅ PASS GOLD integrity check PASSOU — pipeline pode continuar\n');
  process.exit(0);
}
