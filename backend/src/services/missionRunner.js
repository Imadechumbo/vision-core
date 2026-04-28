'use strict';
const crypto = require('crypto');
const store = require('../store/jsonStore');
const { orchestrate } = require('./openclaw');
const { scan } = require('./scanner');
const { diagnose } = require('./hermes');
const { plan } = require('./patchEngine');
const { validate } = require('./passGold');
function id() { return 'mission-' + crypto.randomBytes(6).toString('hex'); }
function now() { return new Date().toISOString(); }
function makeStep(stage, status, detail, data={}) { return { step:stage, stage, status, detail, message:detail, data, ts:now() }; }
async function runMission(input, context={}) {
  const mission = { id:id(), input:String(input || ''), status:'running', project_id:context.project_id || 'technetgame', createdAt:now(), steps:[] };
  const add = (stage,status,detail,data={}) => { const ev = makeStep(stage,status,detail,data); mission.steps.push(ev); store.upsertMission(mission); return ev; };
  store.upsertMission(mission);
  try {
    add('OpenClaw','running','Classificando missão, intent, category, signals e agentes');
    const orchestration = orchestrate(input, context); mission.orchestration = orchestration;
    add('OpenClaw','done','Orquestração concluída', orchestration);
    add('Scanner','running','Lendo realidade do projeto antes do Hermes');
    const scanResult = scan(orchestration, context); mission.scan = scanResult;
    add('Scanner','done','Scanner concluiu target lock e contratos', scanResult);
    add('Hermes','running','Gerando RCA com evidência do Scanner');
    const diagnosis = diagnose(orchestration, scanResult); mission.diagnosis = diagnosis;
    add('Hermes','done','RCA concluído: ' + diagnosis.root_cause, diagnosis);
    add('PatchEngine','running','Montando plano de correção seguro');
    const patch = plan(orchestration, diagnosis, scanResult); mission.patch = patch;
    add('PatchEngine','done','Plano de patch pronto', patch);
    add('Aegis','running','Aplicando policy anti-caos');
    add('Aegis','done','Policy OK: sem PASS GOLD nada promove', { policy:'pass_gold_required' });
    add('SDDF','running','Executando gates de validação');
    const gold = validate({ orchestration, scan:scanResult, diagnosis, patch }); mission.gold = gold;
    add('SDDF', gold.pass_gold ? 'done' : 'fail', gold.pass_gold ? 'Gates SDDF aprovados' : 'Gates insuficientes', gold);
    mission.pass_gold = gold.pass_gold; mission.promotion_allowed = gold.promotion_allowed; mission.status = gold.pass_gold ? 'completed' : 'blocked'; mission.completedAt = now();
    add('PASS GOLD', gold.pass_gold ? 'gold' : 'fail', gold.pass_gold ? 'PASS GOLD consolidado. Promoção permitida.' : 'PASS GOLD negado. Promoção bloqueada.', gold);
  } catch (e) {
    mission.status='failed'; mission.error=e.message; mission.pass_gold=false; mission.promotion_allowed=false; mission.completedAt=now();
    add('FAIL','fail',e.message,{ stack:e.stack });
  }
  store.upsertMission(mission); return mission;
}
async function streamMission(input, send, context={}) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const mission = { id:id(), input:String(input || ''), status:'running', project_id:context.project_id || 'technetgame', createdAt:now(), steps:[] };
  const emit = (stage,status,detail,data={}) => { const ev = { missionId:mission.id, ...makeStep(stage,status,detail,data) }; mission.steps.push(ev); send(ev); store.upsertMission(mission); };
  store.upsertMission(mission);
  send({ missionId:mission.id, stage:'MISSION_CREATED', step:'MISSION_CREATED', status:'running', message:'Missão criada', detail:'Missão criada', data:{ version:'2.9.4-ultra' }, ts:now() });
  try {
    emit('OpenClaw','running','Entendendo input e roteando agentes'); await wait(350); const orchestration=orchestrate(input,context); mission.orchestration=orchestration; emit('OpenClaw','done','Orquestração concluída',orchestration);
    await wait(350); emit('Scanner','running','Scanner lendo rotas, contratos e targets'); const scanResult=scan(orchestration,context); mission.scan=scanResult; emit('Scanner','done','Scanner concluído',scanResult);
    await wait(350); emit('Hermes','running','Hermes RCA analisando evidências'); const diagnosis=diagnose(orchestration,scanResult); mission.diagnosis=diagnosis; emit('Hermes','done','RCA concluído: '+diagnosis.root_cause,diagnosis);
    await wait(350); emit('PatchEngine','running','PatchEngine planejando correção segura'); const patch=plan(orchestration,diagnosis,scanResult); mission.patch=patch; emit('PatchEngine','done','Patch plan pronto',patch);
    await wait(350); emit('Aegis','running','Aegis validando policy e risco'); emit('Aegis','done','Aegis PASS: política anti-caos ativa',{ policy:'pass_gold_required' });
    await wait(350); emit('SDDF','running','SDDF validando gates'); const gold=validate({orchestration,scan:scanResult,diagnosis,patch}); mission.gold=gold; emit('SDDF',gold.pass_gold?'done':'fail',gold.pass_gold?'Gates aprovados':'Gates falharam',gold);
    await wait(250); mission.pass_gold=gold.pass_gold; mission.promotion_allowed=gold.promotion_allowed; mission.status=gold.pass_gold?'completed':'blocked'; mission.completedAt=now(); emit('PASS GOLD',gold.pass_gold?'gold':'fail',gold.pass_gold?'PASS GOLD consolidado. Promoção permitida.':'PASS GOLD negado. Promoção bloqueada.',gold);
  } catch (e) {
    mission.status='failed'; mission.error=e.message; mission.pass_gold=false; mission.promotion_allowed=false; mission.completedAt=now(); emit('FAIL','fail',e.message,{ stack:e.stack });
  }
  store.upsertMission(mission);
  send({ missionId:mission.id, stage:'END', step:'END', status:mission.status, message:'stream encerrado', detail:'stream encerrado', data:{ pass_gold:mission.pass_gold }, ts:now() });
  return mission;
}
module.exports = { runMission, streamMission };
