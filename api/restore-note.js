// POST /api/restore-note: restore one PRIVATE fixture note for the verified B identity.
// No general production recovery: a pre-provisioned immutable fixture snapshot
// must be provided through RESTORE_B_NOTE_SNAPSHOT (server-only environment).
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createLoginVerifier } from '../src/verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^[a-f0-9]{64}$/i;
const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const same = (a,b) => HEX.test(a || '') && HEX.test(b || '')
  && timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
const error = (res,status,code) => res.status(status).json({error:code});
let verifier;
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Allow','POST');
  if (req.method !== 'POST') return error(res,405,'METHOD_NOT_ALLOWED');
  if (new URL(req.url,'https://local.invalid').pathname !== '/api/restore-note')
    return error(res,404,'NOT_FOUND');
  const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY;
  const snapshotText=process.env.RESTORE_B_NOTE_SNAPSHOT;
  if (!url || !secret || !snapshotText) return error(res,503,'RESTORE_NOT_CONFIGURED');
  const auth=req.headers.authorization;
  if (typeof auth!=='string' || !auth.startsWith('Bearer ')) return error(res,401,'LOGIN_REQUIRED');
  let identity;
  try {
    verifier ??= createLoginVerifier({config,supabaseSecretKey:secret});
    identity=await verifier(auth);
  } catch { return error(res,503,'LOGIN_VERIFICATION_UNAVAILABLE'); }
  if (!identity) return error(res,401,'INVALID_LOGIN');
  // Only an engine-verified B identity may run the fixture exercise.
  // A student token or a request-supplied role/B flag never upgrades access.
  if (identity.kind !== 'judge' || identity.identity !== 'b')
    return error(res,403,'TEST_B_ONLY');
  let snapshot,payload;
  try {
    snapshot=JSON.parse(snapshotText);
    payload=typeof req.body==='string' ? JSON.parse(req.body) : req.body;
  } catch { return error(res,400,'INVALID_RESTORE_INPUT'); }
  if (!snapshot || typeof snapshot!=='object' || Array.isArray(snapshot)
      || !UUID.test(snapshot.id || '') || !UUID.test(snapshot.owner_id || '')
      || typeof snapshot.title!=='string' || snapshot.title.length>200
      || typeof snapshot.content!=='string' || snapshot.content.length>10000
      || !HEX.test(snapshot.contentSha256 || '')
      || !same(sha(snapshot.content),snapshot.contentSha256)
      || snapshot.owner_id !== identity.userId)
    return error(res,403,'SNAPSHOT_VALIDATION_FAILED');
  // Re-parse the protected backup immediately before any write; no client-provided\n  // backup/verification flags are trusted. The fixture must carry a verified\n  // revision and an independently pinned SHA-256 of the full snapshot.\n  const trustedDigest=process.env.RESTORE_B_SNAPSHOT_SHA256;\n  const verifiedVersion=process.env.RESTORE_B_VERIFIED_VERSION;\n  if (!HEX.test(trustedDigest || '') || typeof verifiedVersion !== 'string'\n      || !/^[A-Za-z0-9._-]{1,80}$/.test(verifiedVersion)\n      || snapshot.version !== verifiedVersion\n      || snapshot.verified !== true\n      || !same(sha(JSON.stringify({id:snapshot.id,owner_id:snapshot.owner_id,\n        title:snapshot.title,content:snapshot.content,contentSha256:snapshot.contentSha256,\n        version:snapshot.version})),trustedDigest))\n    return error(res,403,'BACKUP_UNVERIFIED');\n  // Request selects only an ID plus its expected content hash.
  if (!payload || typeof payload!=='object' || Array.isArray(payload)
      || Object.keys(payload).sort().join(',')!=='contentSha256,id,version'
      || payload.id!==snapshot.id || payload.version!==verifiedVersion\n      || !same(payload.contentSha256,snapshot.contentSha256))
    return error(res,403,'RESTORE_TARGET_MISMATCH');
  let project;
  try {
    project=new URL(url);
    if (project.protocol!=='https:' || project.username || project.password
        || project.search || project.hash) throw new Error('bad_url');
  } catch { return error(res,503,'RESTORE_NOT_CONFIGURED'); }
  // Fail closed unless this exercise is pointed at a separate test database.
  if (process.env.RESTORE_TEST_ONLY !== 'true'
      || project.hostname !== process.env.RESTORE_TEST_SUPABASE_HOST)
    return error(res,503,'TEST_STORAGE_REQUIRED');
  try {
    const endpoint=new URL('/rest/v1/learning_notes',project);
    endpoint.searchParams.set('id','eq.'+snapshot.id);
    endpoint.searchParams.set('owner_id','eq.'+identity.userId);
    endpoint.searchParams.set('select','id,owner_id,title,content');
    const headers={apikey:secret,Accept:'application/json','Content-Type':'application/json'};
    const read=await fetch(endpoint,{method:'GET',headers,cache:'no-store'});
    if (!read.ok) return error(res,502,'STORAGE_UNAVAILABLE');
    const rows=await read.json();
    if (!Array.isArray(rows) || rows.length!==1) return error(res,404,'RESTORE_TARGET_NOT_FOUND');
    // Do not take ownership of a different user's note or overwrite arbitrary rows.
    if (rows[0].id!==snapshot.id || rows[0].owner_id!==identity.userId)
      return error(res,403,'OWNER_MISMATCH');
    // Re-read and revalidate the protected snapshot and pinned digest immediately\n    // before writing. Failure stops the restore without modifying any record.\n    let fresh;\n    try { fresh=JSON.parse(process.env.RESTORE_B_NOTE_SNAPSHOT || ''); }\n    catch { return error(res,403,'BACKUP_UNVERIFIED'); }\n    if (!fresh || fresh.version!==verifiedVersion || fresh.verified!==true\n        || !same(sha(JSON.stringify({id:fresh.id,owner_id:fresh.owner_id,\n          title:fresh.title,content:fresh.content,contentSha256:fresh.contentSha256,\n          version:fresh.version})),trustedDigest)\n        || fresh.id!==snapshot.id || fresh.owner_id!==identity.userId\n        || !same(sha(fresh.content || ''),fresh.contentSha256))\n      return error(res,403,'BACKUP_UNVERIFIED');\n    // CAS via original title/content prevents a blind overwrite of a concurrently changed row.
    const current=rows[0];
    const update=new URL(endpoint);
    update.searchParams.set('title','eq.'+current.title);
    update.searchParams.set('content','eq.'+current.content);
    const patched=await fetch(update,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},
      body:JSON.stringify({title:snapshot.title,content:snapshot.content}),cache:'no-store'});
    if (!patched.ok) return error(res,502,'RESTORE_WRITE_FAILED');
    const result=await patched.json();
    if (!Array.isArray(result) || result.length!==1
        || result[0].id!==snapshot.id || result[0].owner_id!==snapshot.owner_id
        || !same(sha(result[0].content),snapshot.contentSha256))
      return error(res,409,'RESTORE_VERIFY_FAILED');
    return res.status(200).json({restored:true,version:verifiedVersion,id:snapshot.id,ownerMatched:true,
      contentSha256:snapshot.contentSha256,changedCount:1});
  } catch { return error(res,502,'RESTORE_UNAVAILABLE'); }
}
