import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { restoreTestPolicy } from '../scripts/restore-test-policy.mjs';
import { previewPolicyRestore } from '../scripts/preview-policy-restore.mjs';
const digest = p => createHash('sha256').update(JSON.stringify(p)).digest('hex');
const folder = mkdtempSync(join(tmpdir(), 'test-restore-'));
test.after(() => rmSync(folder, { recursive: true, force: true }));
const backup = join(folder, 'safe-backup.json'), target = join(folder, 'test-policy.json');
const envelope = (version, policy, extra = {}) => ({ version, policy, sha256: digest(policy), ...extra });
const setup = () => {
  const safe = envelope('before-incident-v1', {allowedRoutes:['GET /api/notes/:id'],policyRules:['device_registered','step_up_required'],step:9}, {verified:true,verifiedAt:'2026-10-01T00:00:00Z'});
  const testPolicy = envelope('trial-v2', {allowedRoutes:['GET /api/notes/:id','GET /api/notes'],policyRules:['device_registered','step_up_required'],step:9}, {auditHistory:[{event:'existing',actor:'fixture'}],otherServiceRules:{mail:'unchanged'}});
  writeFileSync(backup, JSON.stringify(safe)); writeFileSync(target, JSON.stringify(testPolicy));
  return {safe,testPolicy};
};
test('requires explicit review confirmation', () => {
  setup();
  assert.throws(() => restoreTestPolicy(backup, target), /PREVIEW_CONFIRMATION_REQUIRED/);
});
test('restores scoped test policy and preserves audit metadata and other services', () => {
  const {safe,testPolicy} = setup();
  const preview = previewPolicyRestore(backup, target);
  assert.equal(preview.changedFields,1);
  const result = restoreTestPolicy(backup, target, {confirmVersion:safe.version,confirmSha256:safe.sha256,expectedTestSha256:testPolicy.sha256});
  const after = JSON.parse(readFileSync(target, 'utf8'));
  assert.equal(result.operationalPolicyChanged,false);
  assert.deepEqual(after.policy.allowedRoutes,safe.policy.allowedRoutes);
  assert.deepEqual(after.auditHistory,testPolicy.auditHistory);
  assert.deepEqual(after.otherServiceRules,testPolicy.otherServiceRules);
});
test('wrong expected snapshot fails without changing target', () => {
  const {safe} = setup(); const before = readFileSync(target, 'utf8');
  assert.throws(() => restoreTestPolicy(backup,target,{confirmVersion:safe.version,confirmSha256:safe.sha256,expectedTestSha256:'0'.repeat(64)}), /POLICY_CHANGED_SINCE_PREVIEW/);
  assert.equal(readFileSync(target, 'utf8'),before);
});
test('unverified backup fails without changes', () => {
  const {safe,testPolicy} = setup();
  const item=JSON.parse(readFileSync(backup,'utf8')); delete item.verified; writeFileSync(backup,JSON.stringify(item));
  const before=readFileSync(target,'utf8');
  assert.throws(() => restoreTestPolicy(backup,target,{confirmVersion:safe.version,confirmSha256:safe.sha256,expectedTestSha256:testPolicy.sha256}), /BACKUP_VERIFICATION_FAILED/);
  assert.equal(readFileSync(target,'utf8'),before);
});
