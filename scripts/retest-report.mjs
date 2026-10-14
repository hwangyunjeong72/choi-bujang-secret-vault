// Offline evidence table builder. Never sends HTTP requests or claims a pass.
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=JSON.parse(readFileSync(resolve(root,'docs/retest-41.json'),'utf8'));
if(source.cases.length!==41 || new Set(source.cases.map(x=>x.id)).size!==41) throw new Error('EXPECTED_41_CASES');
const inputPath=process.argv[2] && resolve(process.argv[2]);
const evidence=inputPath?JSON.parse(readFileSync(inputPath,'utf8')):{results:[]};
if(!Array.isArray(evidence.results)) throw new Error('INVALID_RESULTS');
const lookup=new Map();
const clean=/^[\w.:/+ -]{1,180}$/;
const validTime=x=>typeof x==='string' && !Number.isNaN(Date.parse(x)) && /Z$/.test(x);
for(const e of evidence.results){
 if(!e || typeof e!=='object' || Object.keys(e).sort().join(',')!=='actual,checkedAt,id,requestId'
   || !source.cases.some(c=>c.id===e.id) || lookup.has(e.id)
   || typeof e.actual!=='string' || !clean.test(e.actual)
   || typeof e.requestId!=='string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(e.requestId)
   || !validTime(e.checkedAt)) throw new Error('INVALID_EVIDENCE_ROW');
 lookup.set(e.id,e);
}
const safe=x=>String(x).replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
const output=['| ID | 단계 | 구분 | 정상·금지 요청 | 기대 결과 | 실제 API/엔진 결과 | 요청 ID | 확인 시각(UTC) | 상태 |',
'| --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
for (const c of source.cases){
 const e=lookup.get(c.id);
 const expected=c.expected.split(',');
 // HTTP/engine outcome must be recorded, never inferred from expectation.
 const correct=e && expected.includes(e.actual);
 const status=!e?'미실행':correct?'실측 일치':'실측 불일치';
 output.push('| '+[c.id,c.stage,c.kind,c.scenario+' ('+c.request+')',c.expected,e?.actual||'미실행',e?.requestId||'—',e?.checkedAt||'—',status].map(safe).join(' | ')+' |');
}
const path=resolve(root,'artifacts/retest-41.md');
mkdirSync(dirname(path),{recursive:true});
writeFileSync(path,output.join('\n')+'\n');
process.stdout.write('시험 41종 · 실제 증거 '+lookup.size+'건 · 미실행 '+(41-lookup.size)+'건\n결과: '+path+'\n');
