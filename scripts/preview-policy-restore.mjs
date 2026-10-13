// Stage 10: strictly read-only preview. Never applies or writes a policy.
// Usage: node scripts/preview-policy-restore.mjs <verified-backup.json> <test-policy.json>
// Each input is a JSON envelope: {version,policy,sha256}; sha256 is the
// SHA-256 of JSON.stringify(policy). The backup additionally needs verified:
// true and verifiedAt (ISO UTC) from an external pre-incident verification.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const fail = message => { throw new Error(message); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha256 = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const safeVersion = v => typeof v === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(v);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Compare only explicitly recognized policy metadata, never note bodies,
// credentials, secret fields, PII or arbitrary properties.
const PUBLIC_KEYS = Object.freeze(['allowedRoutes', 'policyRules', 'step']);
const safePolicy = p => {
  if (!record(p) || Object.keys(p).some(k => !PUBLIC_KEYS.includes(k))) fail('INVALID_POLICY_SCOPE');
  if (!Array.isArray(p.allowedRoutes)
      || p.allowedRoutes.some(s => typeof s !== 'string' || !/^(GET|POST|PUT|PATCH|DELETE) \/[a-z0-9/:-]{1,100}$/i.test(s))
      || !Array.isArray(p.policyRules)
      || p.policyRules.some(s => typeof s !== 'string' || !/^[a-z][a-z0-9_.-]{0,79}$/i.test(s))
      || !Number.isInteger(p.step) || p.step < 1 || p.step > 12) fail('INVALID_POLICY_SCOPE');
  if (new Set(p.allowedRoutes).size !== p.allowedRoutes.length || new Set(p.policyRules).size !== p.policyRules.length) fail('INVALID_POLICY_SCOPE');
  return p;
};
const readEnvelope = (filename, backup) => {
  let item;
  try { item = JSON.parse(readFileSync(resolve(filename), 'utf8')); }
  catch { fail(backup ? 'VERIFIED_BACKUP_NOT_AVAILABLE' : 'TEST_POLICY_NOT_AVAILABLE'); }
  if (!record(item) || !safeVersion(item.version) || !/^[0-9a-f]{64}$/.test(item.sha256 ?? '')) fail('INVALID_POLICY_ENVELOPE');
  const policy = safePolicy(item.policy);
  if (sha256(policy) !== item.sha256) fail('POLICY_INTEGRITY_FAILED');
  if (backup && (item.verified !== true || typeof item.verifiedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(item.verifiedAt)
      || !Number.isFinite(Date.parse(item.verifiedAt))
      || Date.parse(item.verifiedAt) > Date.now())) fail('BACKUP_VERIFICATION_FAILED');
  return item;
};

export function previewPolicyRestore(backupFile, testFile) {
  if (!backupFile) fail('VERIFIED_BACKUP_NOT_AVAILABLE');
  if (!testFile) fail('TEST_POLICY_NOT_AVAILABLE');
  const backup = readEnvelope(backupFile, true);
  const current = readEnvelope(testFile, false);
  if (backup.version === current.version && backup.sha256 !== current.sha256) fail('VERSION_CONFLICT');
  const differences = [];
  for (const key of PUBLIC_KEYS) {
    const before = backup.policy[key], after = current.policy[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      differences.push({ field: key, test: after, restoreTo: before });
    }
  }
  return {
    mode: 'preview_only',
    restorationVersion: backup.version,
    testVersion: current.version,
    verifiedAt: backup.verifiedAt,
    changedFields: differences.length,
    differences,
    applied: false,
  };
}

if (process.argv[1] && process.argv[1].endsWith('/preview-policy-restore.mjs')) {
  try {
    const result = previewPolicyRestore(process.argv[2], process.argv[3]);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (e) {
    process.stderr.write('RESTORE_PREVIEW_ABORTED: ' + e.message + '\n');
    process.exitCode = 1;
  }
}
