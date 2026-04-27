'use strict';

/**
 * VISION CORE — File Scanner
 *
 * Antes de gerar o patch, escaneia o projeto para encontrar
 * qual arquivo realmente contém o código relacionado ao erro.
 *
 * Estratégia de score por categoria de erro:
 *   mimetype/multer/req.file  → buscar upload handlers
 *   EADDRINUSE / PORT         → buscar server listen
 *   CORS                      → buscar cors middleware
 *   auth / token / jwt        → buscar auth middleware
 *   (genérico)                → buscar qualquer match de palavras do erro
 *
 * Retorna: { file, relativePath, score, snippets, allCandidates }
 */

const fs   = require('fs');
const path = require('path');

// ── Extensões escaneáveis ─────────────────────────────────────────────────
const SCANNABLE = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts']);

// ── Diretórios a ignorar ──────────────────────────────────────────────────
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.vault', 'dist', 'build',
  'coverage', '.next', '.nuxt', 'out', 'public', 'static',
]);

// ── Categorias de erro com keywords e sinais de score ────────────────────
const ERROR_CATEGORIES = [
  {
    name: 'upload_multer',
    // Detectar pelo texto do erro
    errorPatterns: [
      /req\.file/i, /mimetype/i, /multer/i,
      /Cannot read prop.*file/i, /file.*null/i,
    ],
    // Sinais que pontuam o arquivo alvo
    fileSignals: [
      { pattern: /require\(['"]multer['"]\)/,          score: 10, label: 'multer import'         },
      { pattern: /upload\.single\s*\(/,                score:  8, label: 'upload.single()'       },
      { pattern: /upload\.array\s*\(/,                 score:  8, label: 'upload.array()'        },
      { pattern: /upload\.fields\s*\(/,                score:  8, label: 'upload.fields()'       },
      { pattern: /multer\s*\(\s*\{/,                   score:  7, label: 'multer config'          },
      { pattern: /req\.file/g,                          score:  6, label: 'req.file usage'        },
      { pattern: /req\.files/g,                         score:  5, label: 'req.files usage'       },
      { pattern: /\.mimetype/,                          score:  9, label: '.mimetype access'      },
      { pattern: /diskStorage|memoryStorage/,           score:  5, label: 'multer storage'        },
    ],
  },
  {
    name: 'server_port',
    errorPatterns: [/EADDRINUSE/i, /address already in use/i, /listen.*port/i],
    fileSignals: [
      { pattern: /\.listen\s*\(/,                       score: 10, label: 'app.listen()'          },
      { pattern: /process\.env\.PORT/,                  score:  8, label: 'process.env.PORT'      },
      { pattern: /const\s+PORT\s*=/,                    score:  7, label: 'PORT constant'         },
      { pattern: /createServer/,                        score:  6, label: 'createServer'           },
    ],
  },
  {
    name: 'cors',
    errorPatterns: [/CORS/i, /cross.origin/i, /Access-Control/i, /blocked by CORS/i],
    fileSignals: [
      { pattern: /require\(['"]cors['"]\)/,              score: 10, label: 'cors import'           },
      { pattern: /app\.use\s*\(\s*cors/,                 score:  9, label: 'app.use(cors)'         },
      { pattern: /Access-Control-Allow-Origin/,          score:  8, label: 'CORS header'           },
      { pattern: /\.options\s*\(\s*['"][*]/,             score:  5, label: 'OPTIONS handler'       },
    ],
  },
  {
    name: 'auth_token',
    errorPatterns: [/jwt/i, /token.*invalid/i, /unauthorized/i, /401/i, /auth/i],
    fileSignals: [
      { pattern: /require\(['"]jsonwebtoken['"]\)/,      score: 10, label: 'jwt import'            },
      { pattern: /jwt\.verify\s*\(/,                     score:  9, label: 'jwt.verify()'          },
      { pattern: /jwt\.sign\s*\(/,                       score:  8, label: 'jwt.sign()'            },
      { pattern: /req\.headers\.authorization/,          score:  7, label: 'authorization header'  },
      { pattern: /Bearer\s/,                             score:  6, label: 'Bearer token'          },
    ],
  },
  {
    name: 'database',
    errorPatterns: [/ECONNREFUSED.*27017/i, /mongodb/i, /mongoose/i, /sequelize/i, /knex/i, /prisma/i],
    fileSignals: [
      { pattern: /mongoose\.connect/,                    score: 10, label: 'mongoose.connect'      },
      { pattern: /require\(['"]mongoose['"]\)/,          score:  8, label: 'mongoose import'       },
      { pattern: /new Sequelize/,                        score:  9, label: 'Sequelize instance'    },
      { pattern: /DataSource|createConnection/,          score:  7, label: 'DB connection'         },
    ],
  },
];

// ── Listar arquivos recursivamente ────────────────────────────────────────
function listFiles(dir, maxDepth = 6, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, maxDepth, depth + 1));
    } else if (entry.isFile() && SCANNABLE.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

// ── Extrair snippets relevantes de um arquivo ─────────────────────────────
function extractSnippets(content, signals, maxPerSignal = 2) {
  const snippets = [];
  const lines = content.split('\n');

  for (const signal of signals) {
    let count = 0;
    for (let i = 0; i < lines.length && count < maxPerSignal; i++) {
      if (signal.pattern.test(lines[i])) {
        // Pegar contexto: 2 linhas antes + a linha + 3 linhas depois
        const start   = Math.max(0, i - 2);
        const end     = Math.min(lines.length - 1, i + 3);
        const context = lines.slice(start, end + 1).join('\n');
        snippets.push({ label: signal.label, line: i + 1, context });
        count++;
      }
    }
    // Reset lastIndex para regex global
    if (signal.pattern.global) signal.pattern.lastIndex = 0;
  }

  return snippets;
}

// ── Detectar categoria do erro ────────────────────────────────────────────
function detectCategory(errorInput) {
  for (const cat of ERROR_CATEGORIES) {
    if (cat.errorPatterns.some(p => p.test(errorInput))) {
      return cat.name;
    }
  }
  return 'generic';
}

// ── Gerar sinais genéricos a partir das palavras do erro ──────────────────
function genericSignals(errorInput) {
  const words = errorInput
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4)
    .slice(0, 8);

  return words.map(w => ({
    pattern: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    score: 3,
    label: `keyword: ${w}`,
  }));
}

// ── Pontuar um arquivo contra os sinais ───────────────────────────────────
function scoreFile(filePath, content, signals) {
  let score = 0;
  const matched = [];

  for (const signal of signals) {
    // Reset lastIndex para regex global antes de cada teste
    if (signal.pattern.global) signal.pattern.lastIndex = 0;

    if (signal.pattern.test(content)) {
      score += signal.score;
      matched.push(signal.label);
    }

    // Reset novamente após o teste
    if (signal.pattern.global) signal.pattern.lastIndex = 0;
  }

  return { score, matched };
}

// ── Scanner principal ─────────────────────────────────────────────────────
function scanProject(projectPath, errorInput, options = {}) {
  const maxFiles   = options.maxFiles   || 150;
  const maxContent = options.maxContent || 60_000;

  // Aceitar MissionPlan do OpenClaw Router (opcional)
  const missionPlan = options.missionPlan || null;

  console.log(`[SCANNER] Escaneando projeto: ${projectPath}`);
  console.log(`[SCANNER] Erro: ${errorInput.slice(0, 80)}`);

  // 1. Categoria: priorizar do MissionPlan se disponível
  const category = missionPlan?.category || detectCategory(errorInput);
  const catObj   = ERROR_CATEGORIES.find(c => c.name === category);
  const signals  = catObj ? catObj.fileSignals : genericSignals(errorInput);

  console.log(`[SCANNER] Categoria: ${category}${missionPlan ? ' (via OpenClaw)' : ' (detectada)'}`);

  // 2. Adicionar sinais extras dos scanHints do MissionPlan
  const extraSignals = [];
  if (missionPlan?.scanHints?.length) {
    for (const hint of missionPlan.scanHints) {
      try {
        const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        extraSignals.push({
          pattern: new RegExp(escaped, 'i'),
          score: 4,
          label: `hint:${hint}`,
        });
      } catch { /* ignorar regex inválida */ }
    }
    console.log(`[SCANNER] +${extraSignals.length} sinais extras do OpenClaw`);
  }

  const allSignals = [...signals, ...extraSignals];

  // 3. Listar arquivos
  const allFiles = listFiles(projectPath).slice(0, maxFiles);
  console.log(`[SCANNER] ${allFiles.length} arquivo(s) encontrado(s)`);

  // 4. Pontuar cada arquivo
  const candidates = [];

  for (const filePath of allFiles) {
    let content;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > maxContent) continue;
      content = fs.readFileSync(filePath, 'utf-8');
    } catch { continue; }

    const { score, matched } = scoreFile(filePath, content, allSignals);
    if (score === 0) continue;

    const relativePath = path.relative(projectPath, filePath);
    const snippets     = extractSnippets(content, allSignals);

    candidates.push({ filePath, relativePath, score, matched, snippets, content });
  }

  // 5. Ordenar por score
  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    console.log('[SCANNER] Nenhum arquivo alvo encontrado — pipeline bloqueará no needs_target gate');
    return {
      found: false,
      file: null,
      relativePath: null,
      score: 0,
      snippets: [],
      matched: [],
      allCandidates: [],
      category,
    };
  }

  const best = candidates[0];
  console.log(`[SCANNER] ✔ Arquivo alvo selecionado automaticamente: ${best.relativePath}`);
  console.log(`[SCANNER]   Score: ${best.score} | Sinais: ${best.matched.slice(0, 5).join(', ')}`);

  if (candidates.length > 1) {
    console.log('[SCANNER] Outros candidatos:');
    for (const c of candidates.slice(1, 4)) {
      console.log(`[SCANNER]   ${c.relativePath} (score=${c.score})`);
    }
  }

  return {
    found: true,
    file: best.relativePath,
    filePath: best.filePath,
    relativePath: best.relativePath,
    score: best.score,
    matched: best.matched,
    snippets: best.snippets,
    content: best.content,
    category,
    allCandidates: candidates.slice(0, 5).map(c => ({
      relativePath: c.relativePath,
      score: c.score,
      matched: c.matched,
    })),
  };
}

// ── Construir contexto de arquivo para o prompt do Hermes ─────────────────
function buildFileContext(scanResult, maxChars = 3000) {
  if (!scanResult.found || !scanResult.content) return '';

  const lines = [];
  lines.push(`=== ARQUIVO ALVO: ${scanResult.relativePath} ===`);
  lines.push(`Score: ${scanResult.score} | Sinais: ${scanResult.matched.join(', ')}`);
  lines.push('');

  // Incluir snippets primeiro (mais relevante)
  if (scanResult.snippets.length > 0) {
    lines.push('--- TRECHOS RELEVANTES ---');
    for (const s of scanResult.snippets.slice(0, 6)) {
      lines.push(`[linha ${s.line}] ${s.label}:`);
      lines.push(s.context);
      lines.push('');
    }
  }

  // Completar com início do arquivo se couber
  const snippetText = lines.join('\n');
  if (snippetText.length < maxChars * 0.7) {
    lines.push('--- INÍCIO DO ARQUIVO ---');
    lines.push(scanResult.content.slice(0, maxChars - snippetText.length));
  }

  const full = lines.join('\n');
  return full.length > maxChars ? full.slice(0, maxChars) + '\n... [truncado]' : full;
}

module.exports = { scanProject, buildFileContext, detectCategory, listFiles, scoreFile };

// ── V1.3: scan por agente individual ─────────────────────────────────────
// Usa os hints específicos de um agente para encontrar seu arquivo alvo.
// Retorna o mesmo formato de scanProject mas com agentKey anotado.
function scanForAgent(projectPath, errorInput, agentKey, agentHints, options = {}) {
  const maxFiles   = options.maxFiles   || 150;
  const maxContent = options.maxContent || 60_000;

  // Montar sinais específicos do agente
  const signals = agentHints.map(hint => {
    try {
      return {
        pattern: new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        score: 5,
        label: `agent:${agentKey}:${hint}`,
      };
    } catch { return null; }
  }).filter(Boolean);

  // Complementar com sinais genéricos do erro
  const errorSigs = genericSignals(errorInput);
  const allSignals = [...signals, ...errorSigs];

  const allFiles   = listFiles(projectPath).slice(0, maxFiles);
  const candidates = [];

  for (const filePath of allFiles) {
    let content;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > maxContent) continue;
      content = fs.readFileSync(filePath, 'utf-8');
    } catch { continue; }

    const { score, matched } = scoreFile(filePath, content, allSignals);
    if (score === 0) continue;

    candidates.push({
      filePath,
      relativePath: path.relative(projectPath, filePath),
      score, matched, content,
      snippets: extractSnippets(content, signals.slice(0, 5)),
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    return { found: false, file: null, relativePath: null, score: 0,
             matched: [], snippets: [], allCandidates: [], agentKey };
  }

  const best = candidates[0];
  console.log(`[SCANNER] ${agentKey}: ✔ ${best.relativePath} (score=${best.score})`);

  return {
    found: true,
    file: best.relativePath,
    filePath: best.filePath,
    relativePath: best.relativePath,
    score: best.score,
    matched: best.matched,
    snippets: best.snippets,
    content: best.content,
    agentKey,
    allCandidates: candidates.slice(0, 3).map(c => ({
      relativePath: c.relativePath, score: c.score, matched: c.matched,
    })),
  };
}

// ── V1.3: scan de todos os agentes do plano ───────────────────────────────
// Retorna { primary, byAgent, approvedTargets, agentTargets }
function scanAllAgents(projectPath, errorInput, missionPlan) {
  const { agents, agentScanHints, category } = missionPlan;

  console.log(`[SCANNER] V1.3 Multi-agent scan — ${agents.length} agente(s)`);

  const byAgent    = {};
  const agentTargets   = {};
  const approvedSet    = new Set();

  for (const agent of agents) {
    const hints = agentScanHints?.[agent.key] || [];
    const result = scanForAgent(projectPath, errorInput, agent.key, hints);
    byAgent[agent.key] = result;
    if (result.found) {
      agentTargets[agent.key] = result.relativePath;
      approvedSet.add(result.relativePath);
    }
  }

  const approvedTargets = [...approvedSet];

  // Primary: resultado do agente primário da categoria
  const primaryKey = missionPlan.primaryAgent || agents[0]?.key;
  const primary    = byAgent[primaryKey] || Object.values(byAgent).find(r => r.found) || null;

  console.log(`[SCANNER] Targets aprovados (${approvedTargets.length}): ${approvedTargets.join(', ') || 'nenhum'}`);

  return { primary, byAgent, approvedTargets, agentTargets };
}

// Re-exportar com V1.3
module.exports = {
  scanProject, scanForAgent, scanAllAgents,
  buildFileContext, detectCategory, listFiles, scoreFile,
};
