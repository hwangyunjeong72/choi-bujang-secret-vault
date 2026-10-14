import { readFileSync } from 'node:fs';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { deviceStatus } from '../src/device-status.mjs';
const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
let verifier;
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Allow','GET, POST');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const auth=req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({error:'LOGIN_REQUIRED',registered:false});
  const secret=process.env.SUPABASE_SECRET_KEY;
  if (!secret) return res.status(503).json({error:'DEVICE_CHECK_UNAVAILABLE',registered:false});
  let identity;
  try {
    verifier ??= createLoginVerifier({config,supabaseSecretKey:secret});
    identity=await verifier(auth);
  } catch { return res.status(503).json({error:'DEVICE_CHECK_UNAVAILABLE',registered:false}); }
  if (!identity) return res.status(401).json({error:'INVALID_LOGIN',registered:false});
  const state=deviceStatus(identity);
  if (req.method==='POST') return res.status(202).json({
    status:'not_configured',registered:false,
    message:'승인 요청을 접수할 신뢰된 기기 등록 서비스가 아직 연결되지 않았습니다. 요청만으로 승인되지 않습니다.'
  });
  return res.status(200).json({registered:state.registered,status:state.reason});
}
