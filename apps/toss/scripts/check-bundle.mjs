import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AppsInTossBundle } from '@apps-in-toss/ait-format';

const buffer = readFileSync('woorisajoo.ait');
assert.equal(AppsInTossBundle.isAIT(buffer), true);
const reader = AppsInTossBundle.reader(buffer);
assert.equal(reader.appName, 'woorisajoo');
assert.equal(reader.permissions.length, 0);
const entries = reader.listEntries();
assert.ok(entries.some(name => name.endsWith('index.html')));
assert.ok(entries.some(name => name.endsWith('.js')));
assert.ok(entries.some(name => name.endsWith('.css')));
assert.ok(entries.every(name => !/(^|\/)\.env|\.pem$|\.key$|\.map$|node_modules/.test(name)));
for (const entry of entries) await reader.readEntry(entry);
console.log(JSON.stringify({ appName: reader.appName, sdkVersion: reader.toAppJson()._metadata.sdkVersion,
  bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), entries, mode: 'UI preview; not release ready' }, null, 2));
