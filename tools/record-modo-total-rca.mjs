import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { appendModoTotalRca } = require('../backend/hermes-dataset.js');

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const params = {
  sintoma: arg('sintoma'),
  causa: arg('causa'),
  verificacao: arg('verificacao'),
  achado: arg('achado'),
  decisao: arg('decisao'),
  missionId: arg('mission-id'),
  userId: arg('user-id')
};

if (!params.sintoma || !params.verificacao || !params.decisao) {
  console.error(
    'Uso: node tools/record-modo-total-rca.mjs ' +
    '--sintoma="..." --causa="..." --verificacao="..." --achado="..." --decisao=READY|NEEDS_FIX'
  );
  process.exit(1);
}

const timelinePath = path.join(process.cwd(), 'backend', 'data', 'mission-timeline.json');
const entry = appendModoTotalRca(timelinePath, params);
console.log(`Modo-total RCA persistido: id=${entry.id} status=${entry.status} source=${entry.source}`);
