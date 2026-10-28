#!/usr/bin/env node
// Calls made side by side are each answered under their own id, whether
// lightningd sends them in one write or splits one across two. Runs on its
// own, without lightningd: `node test/concurrent.js`.
const assert = require('assert');
const path = require('path');
const {spawn} = require('child_process');

const child = spawn(process.execPath, [path.join(__dirname, 'concurrent-plugin.js')], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

const request = (id, value, delay) => JSON.stringify({
  jsonrpc: '2.0', id: id, method: 'echo', params: [value, delay],
}) + '\n\n';

// Two that fail: one with its own code, one without.
const failure = (id, withCode) => JSON.stringify({
  jsonrpc: '2.0', id: id, method: 'fail', params: [withCode],
}) + '\n\n';
child.stdin.write(failure('coded', true) + failure('uncoded', false));

// Eight calls in one write, the first answering last.
const ids = [...Array(8).keys()];
child.stdin.write(ids.map((i) => request(i, 'value ' + i, 80 - i * 10)).join(''));
// And one split partway through, across two writes.
const split = request(8, 'value 8', 0);
child.stdin.write(split.slice(0, 20));
setTimeout(() => child.stdin.write(split.slice(20)), 20);

const answers = {};
let out = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  out += chunk;
  const lines = out.split('\n');
  out = lines.pop();
  for (const line of lines.filter((l) => l.trim())) {
    const msg = JSON.parse(line);
    if (msg.method === 'log') continue;
    assert(!(msg.id in answers), 'answered twice: ' + msg.id);
    answers[msg.id] = msg.error || msg.result;
  }
  if (Object.keys(answers).length === 11) finish();
});

const timer = setTimeout(() => {
  child.kill();
  assert.fail('answered only ' + JSON.stringify(answers));
}, 2000);

function finish () {
  clearTimeout(timer);
  child.kill();
  for (const i of [...ids, 8]) assert.strictEqual(answers[i], 'value ' + i);
  assert.deepStrictEqual(answers.coded, {code: -8, message: 'Block height out of range'});
  assert.deepStrictEqual(answers.uncoded, {code: -32603, message: 'Block height out of range'});
  console.log('ok: 11 calls, each answered under its own id, errors keeping their code');
}
