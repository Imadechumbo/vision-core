'use strict';
const https=require('https'), http=require('http');
const base=(process.argv[2]||process.env.API_BASE_URL||'http://localhost:8787').replace(/\/$/,'');
const origin=process.argv[3]||process.env.TEST_ORIGIN||'https://visioncoreai.pages.dev';
const url=new URL(base+'/api/health'); const lib=url.protocol==='https:'?https:http;
const req=lib.request({method:'OPTIONS',hostname:url.hostname,port:url.port||(url.protocol==='https:'?443:80),path:url.pathname,headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'content-type, authorization'}},res=>{const h=res.headers; const out={ok:res.statusCode===204&&!!h['access-control-allow-origin'],statusCode:res.statusCode,origin:h['access-control-allow-origin'],methods:h['access-control-allow-methods'],headers:h['access-control-allow-headers'],corsStatus:h['x-cors-status']}; console.log(JSON.stringify(out,null,2)); process.exit(out.ok?0:1);});
req.on('error',e=>{console.error(e.message);process.exit(1)}); req.end();
