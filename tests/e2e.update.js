/* End-to-End-Test der Update-Funktion in der Electron-App gegen ein nachgestelltes GitHub-Release.
 * KQ_UPDATE_TEST beendet den Ablauf nach dem geprüften Download (nichts wird ersetzt).
 * Voraussetzung: Playwright, Electron-Binary; unter Linux z. B. mit xvfb-run starten:
 *   xvfb-run -a node tests/e2e.update.js */
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');

const ROOT = path.join(__dirname, '..');
let failed = 0;
const ok = (name, cond, extra = '') => { console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' – ' + extra : ''}`); if (!cond) failed++; };

function mockServer(version, payload, sumsFor) {
  const sha = crypto.createHash('sha256').update(payload).digest('hex');
  const srv = http.createServer((req, res) => {
    const base = `http://127.0.0.1:${srv.address().port}`;
    if (req.url === '/releases/latest') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        tag_name: 'v' + version, body: '## Neu\n- Testversion', html_url: base + '/release', published_at: '2026-11-04T10:00:00Z',
        assets: [
          { name: `KryptoQuest-Setup-${version}.exe`, size: payload.length, browser_download_url: base + '/setup.exe' },
          { name: 'SHA256SUMS.txt', size: 100, browser_download_url: base + '/sums' },
        ],
      }));
    } else if (req.url === '/setup.exe') { res.writeHead(200, { 'content-length': payload.length }); res.end(payload); }
    else if (req.url === '/sums') { res.writeHead(200); res.end(`${sumsFor || sha}  KryptoQuest-Setup-${version}.exe\n`); }
    else { res.writeHead(404); res.end(); }
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function launch(port) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-e2e-'));
  const app = await electron.launch({
    args: [ROOT, '--no-sandbox', `--user-data-dir=${userData}`],
    executablePath: path.join(ROOT, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron'),
    env: { ...process.env, KQ_UPDATE_TEST: '1', KQ_UPDATE_API: `http://127.0.0.1:${port}/releases/latest` },
  });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  return { app, win, errors, userData };
}

(async () => {
  const payload = crypto.randomBytes(2 * 1024 * 1024);

  console.log('Neue Version verfügbar');
  let srv = await mockServer('9.9.9', payload);
  let { app, win, errors, userData } = await launch(srv.address().port);
  await win.waitForSelector('.toast >> text=Neue Version 9.9.9 verfügbar', { timeout: 10000 }).then(() => ok('Hinweis beim Start', true)).catch(() => ok('Hinweis beim Start', false));
  ok('Punkt an „Einstellungen“', await win.locator('.nav-item[data-key="settings"] .upd-dot').count() === 1);
  await win.evaluate(() => { location.hash = '#/settings'; });
  await win.waitForSelector('text=Version 9.9.9 ist verfügbar');
  ok('Karte mit neuer Version', true);
  ok('Release-Notizen angezeigt', await win.locator('pre.code', { hasText: 'Testversion' }).count() === 1);
  await win.click('button:has-text("Jetzt aktualisieren")');
  await win.waitForSelector('text=Update geladen und Prüfsumme bestätigt', { timeout: 20000 }).then(() => ok('Download + SHA-256-Prüfung', true)).catch(() => ok('Download + SHA-256-Prüfung', false));
  await win.screenshot({ path: path.join(os.tmpdir(), 'kq-update.png') });
  ok('keine Fehler in der Oberfläche', errors.length === 0, errors.join(' | '));
  await app.close(); srv.close(); fs.rmSync(userData, { recursive: true, force: true });

  console.log('Beschädigter Download');
  srv = await mockServer('9.9.9', payload, '00'.repeat(32));
  ({ app, win, errors, userData } = await launch(srv.address().port));
  await win.evaluate(() => { location.hash = '#/settings'; });
  await win.click('button:has-text("Nach Updates suchen")');
  await win.waitForSelector('text=Version 9.9.9 ist verfügbar');
  await win.click('button:has-text("Jetzt aktualisieren")');
  await win.waitForSelector('text=Prüfsumme stimmt nicht', { timeout: 20000 }).then(() => ok('falsche Prüfsumme wird gemeldet', true)).catch(() => ok('falsche Prüfsumme wird gemeldet', false));
  await app.close(); srv.close(); fs.rmSync(userData, { recursive: true, force: true });

  console.log('Keine neue Version');
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  srv = await mockServer(current, payload);
  ({ app, win, errors, userData } = await launch(srv.address().port));
  await win.evaluate(() => { location.hash = '#/settings'; });
  await win.click('button:has-text("Nach Updates suchen")');
  await win.waitForSelector(`text=Du hast die neueste Version (${current})`).then(() => ok('„neueste Version“ angezeigt', true)).catch(() => ok('„neueste Version“ angezeigt', false));
  ok('kein Punkt an „Einstellungen“', await win.locator('.nav-item[data-key="settings"] .upd-dot').count() === 0);
  await app.close(); srv.close(); fs.rmSync(userData, { recursive: true, force: true });

  console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : '\nAlle Update-Prüfungen bestanden.');
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
