// Apply a reviewed, verified-backup subset to a LOCAL test-policy envelope only.
// Never touches Vercel, Supabase, git configuration, operational policies or audit logs.
import { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { previewPolicyRestore } from './preview-policy-restore.mjs';

const abort = code => { throw new Error(code); };
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ALLOWED = new Set(['allowedRoutes', 'policyRules', 'step']);

export function restoreTestPolicy(backupFile, testFile, options = {}) {
  const { confirmVersion, confirmSha256, expectedTestSha256 } = options;
  if (!backupFile || !testFile) abort('FILES_REQUIRED');
  if (typeof confirmVersion !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(confirmVersion)
      || typeof confirmSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(confirmSha256)
      || typeof expectedTestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(expectedTestSha256)) {
    abort('PREVIEW_CONFIRMATION_REQUIRED');
  }
  const destination = resolve(testFile);
  const source = resolve(backupFile);
  if (source === destination) abort('SOURCE_EQUALS_DESTINATION');
  if (basename(destination) !== 'test-policy.json') abort('TEST_DESTINATION_REQUIRED');
  const result = previewPolicyRestore(source, destination);
  if (result.restorationVersion !== confirmVersion) abort('BACKUP_VERSION_CHANGED');
  const backup = JSON.parse(readFileSync(source, 'utf8'));
  const current = JSON.parse(readFileSync(destination, 'utf8'));
  if (backup.sha256 !== confirmSha256 || current.sha256 !== expectedTestSha256) {
    abort('POLICY_CHANGED_SINCE_PREVIEW');
  }
  // SHA-256 and "verified" metadata detect accidental tampering only. Backup
  // provenance must be authenticated independently before running this tool.
  const next = structuredClone(current);
  for (const entry of result.differences) {
    if (!ALLOWED.has(entry.field)) abort('INVALID_RESTORE_SCOPE');
    next.policy[entry.field] = structuredClone(backup.policy[entry.field]);
  }
  next.version = backup.version;
  next.sha256 = fingerprint(next.policy);
  // Do not mark a modified test policy as independently verified.
  delete next.verified;
  delete next.verifiedAt;
  // Preserve all other test envelope metadata (including any audit history).
  // Exclusive temporary-file creation + atomic rename avoids partially written JSON.
  const temp = join(dirname(destination), '.' + basename(destination) + '.' +
    randomBytes(8).toString('hex') + '.tmp');
  let fd;
  try {
    fd = openSync(temp, 'wx', 0o600);
    writeFileSync(fd, JSON.stringify(next, null, 2) + '\n');
    closeSync(fd);
    fd = undefined;
    // Reject concurrent edit of the test file before replacing it.
    if (fingerprint(JSON.parse(readFileSync(destination, 'utf8'))) !== fingerprint(current))
      abort('TEST_POLICY_CHANGED_DURING_RESTORE');
    renameSync(temp, destination);
  } finally {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(temp); } catch { /* already renamed or absent */ }
  }
  return { action: 'test_policy_restored', restorationVersion: backup.version,
    changedFields: result.differences.map(x => x.field), appliedTo: 'test-policy.json',
    operationalPolicyChanged: false };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/restore-test-policy.mjs')) {
  try {
    const [backup, target, flag, version, sha, testSha] = process.argv.slice(2);
    const result = restoreTestPolicy(backup, target, {
      confirmVersion: flag === '--apply' ? version : undefined,
      confirmSha256: sha, expectedTestSha256: testSha,
    });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    process.stderr.write('TEST_RESTORE_ABORTED: ' + err.message + '\n');
    process.exitCode = 1;
  }
}
