import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMcpJson, parseTransport } from '../dist/parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('parseTransport: stdio with command', () => {
  const r = parseTransport({ command: '/bin/foo', args: ['-x'] });
  assert.equal(r.transport, 'stdio');
  assert.equal(r.command, '/bin/foo');
  assert.deepEqual(r.args, ['-x']);
  assert.equal(r.url, undefined);
  assert.equal(r.port, undefined);
});

test('parseTransport: http with url + explicit type', () => {
  const r = parseTransport({ url: 'http://localhost:3000/mcp', type: 'http' });
  assert.equal(r.transport, 'http');
  assert.equal(r.url, 'http://localhost:3000/mcp');
  assert.equal(r.port, 3000);
});

test('parseTransport: sse from explicit type', () => {
  const r = parseTransport({ url: 'https://example.com/mcp', type: 'sse' });
  assert.equal(r.transport, 'sse');
  assert.equal(r.port, 443);
});

test('parseTransport: url without explicit type defaults to http', () => {
  const r = parseTransport({ url: 'http://localhost:9000/' });
  assert.equal(r.transport, 'http');
  assert.equal(r.port, 9000);
});

test('parseTransport: empty raw falls back to stdio', () => {
  const r = parseTransport({});
  assert.equal(r.transport, 'stdio');
  assert.equal(r.command, undefined);
});

test('parseMcpJson: stdio fixture yields one entry', () => {
  const text = readFileSync(join(__dirname, 'fixtures/mcp-stdio.json'), 'utf8');
  const { entries, errors } = parseMcpJson(text);
  assert.equal(errors.length, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'github');
  assert.equal(entries[0].transport, 'stdio');
  assert.equal(entries[0].command, '/usr/local/bin/github-mcp');
});

test('parseMcpJson: http fixture yields two entries', () => {
  const text = readFileSync(join(__dirname, 'fixtures/mcp-http.json'), 'utf8');
  const { entries, errors } = parseMcpJson(text);
  assert.equal(errors.length, 0);
  assert.equal(entries.length, 2);
  const sse = entries.find(e => e.name === 'remote-sse');
  assert.equal(sse?.transport, 'sse');
});

test('parseMcpJson: jsonc with comments parses ok', () => {
  const text = readFileSync(join(__dirname, 'fixtures/mcp-mixed.jsonc'), 'utf8');
  const { entries, errors } = parseMcpJson(text);
  assert.equal(errors.length, 0);
  assert.equal(entries.length, 2);
});

test('parseMcpJson: invalid JSON returns errors and empty entries', () => {
  const { entries, errors } = parseMcpJson('{ this is not json');
  assert.equal(entries.length, 0);
  assert.ok(errors.length > 0);
});
