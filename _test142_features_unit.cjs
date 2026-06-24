/**
 * _test142_features_unit.cjs — §142 metricas reais + projetos + 4 nos animados
 * Testa: backend routes, bundle.js conteudo, server.js conteudo
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const bundle = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §142 UNIT TESTS ===\n');

// --- server.js routes ---
console.log('[ server.js routes ]');
ok('GET /api/projects exists',  server.includes("app.get('/api/projects'"));
ok('POST /api/projects exists', server.includes("app.post('/api/projects'"));
ok('project_name_required error', server.includes('project_name_required'));
ok('writeJsonFile PROJECTS_DB on POST', server.includes('writeJsonFile(PROJECTS_DB, db)'));
ok('anti_stub: true on GET /api/projects', (() => {
  const idx = server.indexOf("app.get('/api/projects'");
  return idx >= 0 && server.slice(idx, idx + 300).includes('anti_stub: true');
})());

// --- bundle.js: Part B projetos ---
console.log('\n[ bundle.js — projetos ]');
ok('s142InitProjects function exists', bundle.includes('function s142InitProjects()'));
ok('s142LoadProjects inner function',  bundle.includes('function s142LoadProjects()'));
ok('s142AddCreateProjectBtn exists',   bundle.includes('function s142AddCreateProjectBtn()'));
ok('/api/projects fetch in bundle',    bundle.includes("'/api/projects'"));
ok('s142InitProjects called in _runAllInits', bundle.includes('s142InitProjects()'));
ok('+ Novo button text',               bundle.includes("'+ Novo'"));

// --- bundle.js: Part A métricas ---
console.log('\n[ bundle.js — metricas reais ]');
ok('s142StatusWidth map exists', bundle.includes('s142StatusWidth'));
ok('s142StatusColor map exists', bundle.includes('s142StatusColor'));
ok('Go Core in idMap107',        bundle.includes("'Go Core': 'gocore'"));
ok('bar width update via barEl.style.width', bundle.includes('barEl.style.width'));
ok('bar color update via barEl.style.background', bundle.includes('barEl.style.background'));
ok("status 'binary_not_found' mapped", bundle.includes("'binary_not_found': '20%'"));
ok("status 'PENDING_EVIDENCE' mapped", bundle.includes("'PENDING_EVIDENCE': '30%'"));
ok('val status color set to orange for error', bundle.includes("'#f97316'"));

// --- bundle.js: Part C 4 novos nós ---
console.log('\n[ bundle.js — 4 novos nos animados ]');
ok('piharness in AGENT_KEYS',  bundle.includes("'piharness','openclaw'"));
ok('openclaw in AGENT_KEYS',   bundle.includes("'openclaw','scanner'"));
ok('archivist in AGENT_KEYS',  bundle.includes("'archivist','passgold'"));
ok('github in AGENT_KEYS',     bundle.includes("'passgold','github'"));
ok('piharness in AGENT_COLORS', bundle.includes("piharness:'#a78bfa'"));
ok('openclaw in AGENT_ATXT',   bundle.includes("openclaw:'CLAW...'"));
ok('archivist in AGENT_DTXT',  bundle.includes("archivist:'\\u2713 ARCH'") || bundle.includes("archivist:'✓ ARCH'"));
ok('piharness in startMissionAnimation seq', (() => {
  const idx = bundle.indexOf("function startMissionAnimation");
  return idx >= 0 && bundle.slice(idx, idx + 300).includes("'piharness'");
})());
ok('archivist in startMissionAnimation seq', (() => {
  const idx = bundle.indexOf("function startMissionAnimation");
  return idx >= 0 && bundle.slice(idx, idx + 300).includes("'archivist'");
})());
ok('piharness in stopMissionAnimation stMap', (() => {
  const idx = bundle.indexOf("function stopMissionAnimation");
  return idx >= 0 && bundle.slice(idx, idx + 600).includes("piharness");
})());
ok('archivist in stopMissionAnimation stMap', (() => {
  const idx = bundle.indexOf("function stopMissionAnimation");
  return idx >= 0 && bundle.slice(idx, idx + 600).includes("archivist");
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
