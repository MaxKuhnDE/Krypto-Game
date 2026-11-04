/* Tests für den Update-Kern (updater/core.js) – ohne Electron, mit lokalem HTTP-Server. */
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../updater/core');

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
};

(async () => {
  console.log('Updater');
  await test('Versionsvergleich', () => {
    assert.ok(core.compareVersions('1.1.0', '1.0.0') > 0);
    assert.ok(core.compareVersions('v1.10.0', '1.9.9') > 0);
    assert.equal(core.compareVersions('1.1', '1.1.0'), 0);
    assert.ok(core.compareVersions('1.0.0', '1.0.1') < 0);
  });
  await test('Dateinamen passen zu electron-builder', () => {
    assert.equal(core.assetName('installer', '1.1.0'), 'KryptoQuest-Setup-1.1.0.exe');
    assert.equal(core.assetName('portable', '1.1.0'), 'KryptoQuest-1.1.0-portable.exe');
  });
  await test('SHA256SUMS.txt einlesen, Digest hat Vorrang', () => {
    const sums = core.parseSums('ab'.repeat(32) + '  KryptoQuest-Setup-1.1.0.exe\r\n' + 'cd'.repeat(32) + ' *KryptoQuest-1.1.0-portable.exe\n');
    assert.equal(sums.get('KryptoQuest-1.1.0-portable.exe'), 'cd'.repeat(32));
    assert.equal(core.expectedHash({ name: 'KryptoQuest-Setup-1.1.0.exe' }, sums), 'ab'.repeat(32));
    assert.equal(core.expectedHash({ name: 'x', digest: 'sha256:' + 'EF'.repeat(32) }, sums), 'ef'.repeat(32));
    assert.equal(core.expectedHash({ name: 'fehlt.exe' }, sums), null);
  });
  await test('Release auswerten', () => {
    const rel = { tag_name: 'v1.2.0', body: 'Notizen', assets: [{ name: 'KryptoQuest-Setup-1.2.0.exe', size: 10 }, { name: 'KryptoQuest-1.2.0-portable.exe', size: 9 }, { name: 'SHA256SUMS.txt' }] };
    const a = core.evaluateRelease(rel, '1.1.0', 'installer');
    assert.equal(a.latest, '1.2.0'); assert.ok(a.newer); assert.equal(a.asset.size, 10); assert.ok(a.sumsAsset);
    assert.equal(core.evaluateRelease(rel, '1.1.0', 'portable').asset.size, 9);
    assert.equal(core.evaluateRelease(rel, '1.2.0', 'installer').newer, false);
  });
  await test('Ergebnis nach dem Neustart', () => {
    assert.deepEqual(core.judgeMarker({ from: '1.1.0', to: '1.2.0' }, '1.2.0'), { updated: '1.2.0' });
    assert.deepEqual(core.judgeMarker({ from: '1.1.0', to: '1.2.0' }, '1.1.0'), { failed: '1.2.0', current: '1.1.0' });
    assert.equal(core.judgeMarker(null, '1.1.0'), null);
  });

  await test('Austauschskript (portable): Pfade gequotet, % verdoppelt, Wiederholung', () => {
    const sc = core.portableScript('C:\\A 100%\\KQ.exe.download', 'C:\\A 100%\\KQ.exe', 'C:\\T\\update.log');
    assert.ok(sc.includes('move /Y "C:\\A 100%%\\KQ.exe.download" "C:\\A 100%%\\KQ.exe"'));
    assert.ok(sc.includes('if %n% lss 90 goto retry'));
    assert.ok(sc.includes('start "" "C:\\A 100%%\\KQ.exe"'));
    assert.ok(sc.split('\r\n').length > 10, 'CRLF-Zeilenenden');
  });

  // Download über einen lokalen Server
  const payload = crypto.randomBytes(300000);
  const good = crypto.createHash('sha256').update(payload).digest('hex');
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-length': payload.length }); res.end(payload); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/datei.exe`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-upd-'));
  await test('Download mit korrekter Prüfsumme, Fortschritt wird gemeldet', async () => {
    const seen = [];
    const dest = path.join(dir, 'a.exe');
    const d = await core.downloadVerified(fetch, url, dest, { size: payload.length, sha256: good, onProgress: (p) => seen.push(p) });
    assert.equal(d, good);
    assert.ok(fs.readFileSync(dest).equals(payload));
    assert.equal(seen[seen.length - 1].received, payload.length);
  });
  await test('falsche Prüfsumme wird abgelehnt', async () => {
    await assert.rejects(core.downloadVerified(fetch, url, path.join(dir, 'b.exe'), { size: payload.length, sha256: '00'.repeat(32) }), /Prüfsumme stimmt nicht/);
  });
  await test('ohne Prüfsumme kein Download', async () => {
    await assert.rejects(core.downloadVerified(fetch, url, path.join(dir, 'c.exe'), { size: payload.length }), /keine Prüfsumme/);
  });
  await test('falsche Größe wird abgelehnt', async () => {
    await assert.rejects(core.downloadVerified(fetch, url, path.join(dir, 'd.exe'), { size: payload.length + 1, sha256: good }), /unvollständig/);
  });
  srv.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed} Tests bestanden.`);
})();
