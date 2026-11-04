'use strict';

// In-App-Updates aus den GitHub-Releases (MaxKuhnDE/Krypto-Game).
//   installer: KryptoQuest-Setup-<v>.exe laden, SHA-256 prüfen, still installieren (/S --force-run),
//              der Installer startet KryptoQuest danach neu.
//   portable:  KryptoQuest-<v>-portable.exe neben die laufende Datei laden, SHA-256 prüfen; nach dem
//              Beenden ersetzt ein kleines cmd-Skript die alte Datei und startet sie neu.
// Der Spielstand liegt im Benutzerprofil (%APPDATA%\KryptoQuest) und bleibt unberührt.

const { app, net, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const core = require('./core');

const REPO = 'MaxKuhnDE/Krypto-Game';
const API = process.env.KQ_UPDATE_API || `https://api.github.com/repos/${REPO}/releases/latest`;
// Tests: alles bis zum geprüften Download, dann Schluss (nichts wird ersetzt)
const TEST = !!process.env.KQ_UPDATE_TEST;
const SYSTEM32 = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');

let lastCheck = null;
let installing = false;

const request = (url) => net.fetch(url, {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': `KryptoQuest/${app.getVersion()}` },
  cache: 'no-store',
});

const markerFile = () => path.join(app.getPath('userData'), 'update-pending.json');

/** Wie ist diese Kopie installiert? */
function mode() {
  if (TEST) return 'test';
  if (!app.isPackaged) return 'dev';
  if (process.platform !== 'win32') return 'other';
  if (process.env.PORTABLE_EXECUTABLE_FILE) return 'portable';
  return 'installer';
}

function canInstall(m) {
  if (m === 'test' || m === 'installer') return { ok: true, reason: '' };
  if (m === 'dev') return { ok: false, reason: 'Entwicklungsversion – Updates gehen nur in der installierten App.' };
  if (m === 'other') return { ok: false, reason: 'Automatische Updates gibt es nur unter Windows.' };
  // portable: Ordner der EXE muss beschreibbar sein
  const dir = path.dirname(process.env.PORTABLE_EXECUTABLE_FILE);
  const probe = path.join(dir, `.kryptoquest-write-test-${process.pid}`);
  try {
    fs.writeFileSync(probe, '');
    fs.rmSync(probe, { force: true });
    return { ok: true, reason: '' };
  } catch (err) {
    return { ok: false, reason: `In den Ordner der portablen EXE kann nicht geschrieben werden (${err.code || err.message}). Die neue Version lässt sich über „Release-Seite öffnen“ von Hand laden.` };
  }
}

async function check() {
  const current = app.getVersion();
  const m = mode();
  let res;
  try { res = await request(API); }
  catch { return { ok: false, current, error: 'Keine Verbindung zu GitHub – später noch einmal versuchen.' }; }
  if (res.status === 404) return { ok: true, current, latest: null, newer: false, mode: m };
  if (!res.ok) return { ok: false, current, error: `GitHub antwortet mit Fehler ${res.status}.` };
  const rel = await res.json();
  const ev = core.evaluateRelease(rel, current, m === 'portable' ? 'portable' : 'installer');
  let sha256 = core.expectedHash(ev.asset, null);
  if (!sha256 && ev.asset && ev.sumsAsset) {
    try {
      const r = await request(ev.sumsAsset.browser_download_url);
      if (r.ok) sha256 = core.expectedHash(ev.asset, core.parseSums(await r.text()));
    } catch { /* ohne Prüfsumme wird nicht installiert */ }
  }
  lastCheck = { latest: ev.latest, asset: ev.asset, sha256 };
  const can = canInstall(m);
  let reason = can.reason;
  if (!ev.asset) reason = 'Im Release fehlt die passende Datei.';
  else if (!sha256) reason = 'Im Release fehlt die Prüfsumme – Update aus Sicherheitsgründen nicht möglich.';
  return {
    ok: true, current, latest: ev.latest, newer: ev.newer, notes: ev.notes, url: ev.url, published: ev.published,
    mode: m, size: ev.asset ? ev.asset.size : null,
    installable: !!ev.asset && !!sha256 && can.ok, reason,
  };
}

function writeMarker(data) {
  try { fs.writeFileSync(markerFile(), JSON.stringify(data)); } catch { /* Meldung nach dem Neustart entfällt */ }
}

async function install(send) {
  if (installing) throw new Error('Das Update läuft bereits.');
  if (!lastCheck || !lastCheck.asset) throw new Error('Bitte zuerst nach Updates suchen.');
  const m = mode();
  const can = canInstall(m);
  if (!can.ok) throw new Error(can.reason);
  installing = true;
  try {
    const { latest, asset, sha256 } = lastCheck;
    const staging = path.join(app.getPath('temp'), `kryptoquest-update-${latest}`);
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });

    if (m === 'portable') {
      const oldFile = process.env.PORTABLE_EXECUTABLE_FILE;
      const newFile = `${oldFile}.download`;
      await core.downloadVerified(request, asset.browser_download_url, newFile, { size: asset.size, sha256, onProgress: send });
      const log = path.join(staging, 'update.log');
      const script = path.join(staging, 'replace.cmd');
      fs.writeFileSync(script, core.portableScript(newFile, oldFile, log));
      writeMarker({ from: app.getVersion(), to: latest, mode: m, log });
      send({ phase: 'restart' });
      spawn(path.join(SYSTEM32, 'cmd.exe'), ['/d', '/c', script], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      setTimeout(() => app.quit(), 400);
      return { restarting: true };
    }

    const file = path.join(staging, asset.name);
    await core.downloadVerified(request, asset.browser_download_url, file, { size: asset.size, sha256, onProgress: send });
    if (m === 'test') return { staged: file, sha256 };

    writeMarker({ from: app.getVersion(), to: latest, mode: m });
    send({ phase: 'restart' });
    spawn(file, ['/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 400);
    return { restarting: true };
  } finally {
    installing = false;
  }
}

/** Einmal pro Start: Wie ist das letzte Update ausgegangen? */
function lastResult() {
  if (TEST) return null;
  let marker;
  try { marker = JSON.parse(fs.readFileSync(markerFile(), 'utf8')); } catch { return null; }
  try { fs.rmSync(markerFile(), { force: true }); } catch { /* egal */ }
  const r = core.judgeMarker(marker, app.getVersion());
  if (r && r.failed) {
    let reason = marker.mode === 'portable'
      ? 'Die neue Datei konnte nicht an die Stelle der alten gesetzt werden.'
      : 'Der Installer wurde nicht abgeschlossen – z. B. weil die Administratorabfrage abgelehnt wurde oder KryptoQuest sich nicht schließen ließ.';
    if (marker.log) { try { reason = fs.readFileSync(marker.log, 'utf8').trim() || reason; } catch { /* kein Protokoll */ } }
    r.reason = reason;
  }
  return r;
}

function registerUpdater() {
  ipcMain.handle('update:check', () => check());
  ipcMain.handle('update:lastResult', () => lastResult());
  ipcMain.handle('update:install', (e) => install((p) => { if (!e.sender.isDestroyed()) e.sender.send('update:progress', p); }));
}

module.exports = { registerUpdater, mode };
