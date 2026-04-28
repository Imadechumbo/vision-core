'use strict';
const fs = require('fs'); const path = require('path');
const DATA_DIR = process.env.VISION_DATA_DIR || '/tmp/vision-core';
const DB_FILE = path.join(DATA_DIR, 'vision_core_v27.json');
function initialDb(){ return {version:'2.7.0-pr-real', missions:{}, queue:[], events:[], prs:[], stats:{total:0,gold:0,fail:0,last:null}}; }
function ensure(){ fs.mkdirSync(DATA_DIR,{recursive:true}); if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initialDb(),null,2)); }
function read(){ ensure(); try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return initialDb();} }
function write(db){ ensure(); db.version='2.7.0-pr-real'; fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function recalc(db){ const missions=Object.values(db.missions||{}); db.stats=db.stats||{}; db.stats.total=missions.length; db.stats.gold=missions.filter(x=>x.pass_gold).length; db.stats.fail=missions.filter(x=>x.status==='failed'||x.status==='blocked').length; db.stats.last=missions.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0]||null; return db; }
function appendEvent(event){ const db=read(); db.events=db.events||[]; db.events.push({...event, ts:event.ts||new Date().toISOString()}); if(db.events.length>1000) db.events=db.events.slice(-1000); write(db); return event; }
function upsertMission(m){ const db=read(); db.missions=db.missions||{}; db.missions[m.id]=m; recalc(db); write(db); return m; }
function getMission(id){ return read().missions[id] || null; }
function listMissions(){ return Object.values(read().missions||{}).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')); }
function enqueue(job){ const db=read(); db.queue=db.queue||[]; db.queue.push(job); write(db); return job; }
function addPr(pr){ const db=read(); db.prs=db.prs||[]; db.prs.unshift(pr); db.prs=db.prs.slice(0,100); write(db); return pr; }
function listPrs(){ return read().prs||[]; }
function stats(){ const db=read(); const missions=Object.values(db.missions||{}); const running=missions.filter(m=>m.status==='running').length; return {ok:true, version:'2.7.0-pr-real', total:missions.length, pass_gold:missions.filter(m=>m.pass_gold).length, failed:missions.filter(m=>m.status==='failed'||m.status==='blocked').length, running, last:db.stats?.last||null, prs:(db.prs||[]).length, events:(db.events||[]).length, agents:{OpenClaw:96,Scanner:91,Hermes:88,PatchEngine:84,Aegis:93,PassGold:90}, updatedAt:new Date().toISOString()}; }
module.exports={read,write,upsertMission,getMission,listMissions,enqueue,appendEvent,addPr,listPrs,stats,DB_FILE};
