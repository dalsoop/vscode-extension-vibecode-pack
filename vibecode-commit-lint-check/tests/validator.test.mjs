import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommitMessage } from '../dist/lint/validator.js';

test('passes a vanilla conventional commit', () => {
  const r = validateCommitMessage('feat(api): add new endpoint');
  assert.equal(r.ok, true);
  assert.deepEqual(r.parsed, { type: 'feat', scope: 'api', subject: 'add new endpoint', breaking: false });
});

test('passes commit without scope', () => {
  const r = validateCommitMessage('chore: bump deps');
  assert.equal(r.ok, true);
  assert.equal(r.parsed?.scope, undefined);
});

test('detects breaking change marker !', () => {
  const r = validateCommitMessage('feat(api)!: drop legacy route');
  assert.equal(r.ok, true);
  assert.equal(r.parsed?.breaking, true);
});

test('rejects missing type', () => {
  const r = validateCommitMessage('add new endpoint');
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'header-format'));
});

test('rejects unknown type', () => {
  const r = validateCommitMessage('wip(api): something');
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'type-enum'));
});

test('rejects empty header', () => {
  const r = validateCommitMessage('');
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'header-empty'));
});

test('flags header longer than configured max', () => {
  const long = 'feat(api): ' + 'x'.repeat(120);
  const r = validateCommitMessage(long, { headerMaxLength: 100 });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'header-max-length'));
});

test('flags missing blank line after subject', () => {
  const msg = 'feat(api): add endpoint\nbody on line 2 with no blank above';
  const r = validateCommitMessage(msg);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'body-leading-blank'));
});

test('accepts header + blank line + body', () => {
  const msg = 'feat(api): add endpoint\n\nDetailed body goes here.';
  const r = validateCommitMessage(msg);
  assert.equal(r.ok, true);
});

test('enforces scope-enum when provided', () => {
  const r = validateCommitMessage('feat(unknown): something', { allowedScopes: ['api', 'web'] });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'scope-enum'));
});

test('requireScope flag triggers scope-empty', () => {
  const r = validateCommitMessage('chore: bump', { requireScope: true });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.rule === 'scope-empty'));
});
