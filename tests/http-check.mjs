import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export default function checkHttp() {
  const get = path => execFileSync('curl', ['--fail', '--silent', '--show-error', '--max-time', '10', `http://127.0.0.1:5174${path}`], { encoding: 'utf8' });
  assert.match(get('/'), /Private notes/);
  assert.match(get('/main.js'), /onAuthStateChange/);
}
