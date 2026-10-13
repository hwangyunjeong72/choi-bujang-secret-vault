import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { previewPolicyRestore } from '../scripts/preview-policy-restore.mjs';

const digest = p => createHash('sha256').update(JSON.stringify(p)).digest('hex');
const folder = mkdtempSync(join(tmpdir(), 'policy-preview-'));
const backupPath = join(folder, 'backup.json');
const currentPath = join(folder, 'test.json');
const policy = (step, routes) => ({ allowedRoutes: routes, policyRules: ['device_registered'], step });
const write = (file, p, fields = {}) => writeFileSync(file, JSON.stringify({ version: 'safe-v1', policy: p, sha256: digest(p), ...fields }));
test.after(() => rmSync(folder, { recursive: true, force: true }));

test('missing verified backup aborts', () => {
  assert.throws(() => previewPolicyRestore(join(folder, 'missing.json'), currentPath), /VERIFIED_BACKUP_NOT_AVAILABLE/);
});
test('verified backup shows only changes and does not apply anything', () => {
  write(backupPath, policy(9, ['GET /api/notes/:id']), { verified: true, verifiedAt: '2026-10-01T00:00:00Z' });
  write(currentPath, policy(9, ['GET /api/notes/:id', 'POST /api/notes']));
  const result = previewPolicyRestore(backupPath, currentPath);
  assert.equal(result.applied, false);
  assert.equal(result.restorationVersion, 'safe-v1');
  assert.deepEqual(result.differences, [{ field: 'allowedRoutes', test: ['GET /api/notes/:id', 'POST /api/notes'], restoreTo: ['GET /api/notes/:id'] }]);
});
test('unverified backup aborts', () => {
  write(backupPath, policy(9, ['GET /api/notes/:id']));
  assert.throws(() => previewPolicyRestore(backupPath, currentPath), /BACKUP_VERIFICATION_FAILED/);
});
test('tampered backup aborts', () => {
  write(backupPath, policy(9, ['GET /api/notes/:id']), { verified: true, verifiedAt: '2026-10-01T00:00:00Z', sha256: '0'.repeat(64) });
  assert.throws(() => previewPolicyRestore(backupPath, currentPath), /POLICY_INTEGRITY_FAILED/);
});
