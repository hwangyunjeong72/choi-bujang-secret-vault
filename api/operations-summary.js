// Read-only, redacted recovery dashboard. No synthetic event/revocation counts.
// Server source of truth: bundled RULE_IDS; operational telemetry is not connected.
import { readFileSync } from 'node:fs';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { RULE_IDS } from '../src/decider.mjs';
import { deviceStatus } from '../src/device-status.mjs';
const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
let verifier;
const deny=(res,status,code)=>res.status(status).json({error:code});
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Allow','GET');
  if (req.method!=='GET') return deny(res,405,'METHOD_NOT_ALLOWED');
  if (new URL(req.url,'https://local.invalid').pathname!=='/api/operations-summary')
    return deny(res,404,'NOT_FOUND');
  const auth=req.headers.authorization;
  if (typeof auth!=='string' || !auth.startsWith('Bearer ')) return deny(res,401,'LOGIN_REQUIRED');
  const secret=process.env.SUPABASE_SECRET_KEY;
  if (!secret) return deny(res,503,'SUMMARY_NOT_CONFIGURED');
  let identity;
  try {
    verifier ??=createLoginVerifier({config,supabaseSecretKey:secret});
    identity=await verifier(auth);
  } catch { return deny(res,503,'LOGIN_VERIFICATION_UNAVAILABLE'); }
  if (!identity) return deny(res,401,'INVALID_LOGIN');
  if (!deviceStatus(identity).registered) return deny(res,403,'DEVICE_NOT_APPROVED');
  // Do not expose event subjects, notes, recovery IDs, raw logs, tokens or secrets.
  // No authenticated ALEPH SDP redacted event log is connected. Null means NOT MEASURED.
  const rules=RULE_IDS.filter(id=>/^[a-z][a-z0-9_]{0,63}$/.test(id));
  return res.status(200).json({
    schema:'byteback.operations-summary.v1',
    rules:{source:'repository_code',status:'defined_not_executed',count:rules.length,ids:rules},
    detection:{source:'server_telemetry_not_connected',status:'not_executed',events:null,proposals:null},
    revocation:{source:'revocation_service_not_connected',status:'not_executed',executed:null},
    recovery:{source:'verified_restore_log_not_connected',status:'not_executed',version:null},
    serverRecord:{redacted:true,telemetryCompared:false,status:'not_executed',reason:'no_verified_server_records'}
  });
}
