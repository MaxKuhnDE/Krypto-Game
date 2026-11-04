'use strict';

// Update-Logik ohne Electron (damit sie in Node getestet werden kann):
// Versionsvergleich, Auswahl der passenden Datei im GitHub-Release, SHA-256-Prüfung, Download.
//
// Ein Release enthält:
//   KryptoQuest-Setup-<version>.exe      Installer (NSIS)
//   KryptoQuest-<version>-portable.exe   portable Fassung
//   SHA256SUMS.txt                       Prüfsummen beider Dateien

const fs = require('node:fs');
const crypto = require('node:crypto');

function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

const assetName = (mode, version) =>
  mode === 'portable' ? `KryptoQuest-${version}-portable.exe` : `KryptoQuest-Setup-${version}.exe`;

/** „<hash>  <datei>“ je Zeile → Map datei → hash */
function parseSums(text) {
  const map = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line.trim());
    if (m) map.set(m[2], m[1].toLowerCase());
  }
  return map;
}

/** Erwarteter SHA-256 einer Release-Datei: GitHub-Digest, sonst SHA256SUMS.txt */
function expectedHash(asset, sums) {
  if (asset && typeof asset.digest === 'string' && asset.digest.startsWith('sha256:')) return asset.digest.slice(7).toLowerCase();
  if (sums && asset && sums.has(asset.name)) return sums.get(asset.name);
  return null;
}

/**
 * Lädt url nach dest, meldet Fortschritt und prüft Größe und SHA-256.
 * fetchFn: (url) => Promise<Response> (Electron: net.fetch, Tests: globales fetch)
 */
async function downloadVerified(fetchFn, url, dest, { size = 0, sha256 = null, onProgress = () => {} } = {}) {
  if (!sha256) throw new Error('Für die Datei liegt keine Prüfsumme vor – Update abgebrochen.');
  const res = await fetchFn(url);
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen (${res.status}).`);
  const total = Number(res.headers.get('content-length')) || size || 0;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(dest);
  const failed = new Promise((_, reject) => out.on('error', reject));
  failed.catch(() => {});
  let received = 0, lastReport = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
    received += value.length;
    if (!out.write(value)) await Promise.race([new Promise((r) => out.once('drain', r)), failed]);
    if (Date.now() - lastReport > 150) { lastReport = Date.now(); onProgress({ phase: 'download', received, total }); }
  }
  await Promise.race([new Promise((r) => out.end(r)), failed]);
  onProgress({ phase: 'download', received, total });
  const digest = hash.digest('hex');
  if (size && received !== size) throw new Error('Download unvollständig – bitte noch einmal versuchen.');
  if (digest !== sha256) throw new Error('Prüfsumme stimmt nicht – der Download ist beschädigt.');
  return digest;
}

/**
 * Wertet eine GitHub-Antwort auf /releases/latest aus.
 * Liefert, was die Oberfläche anzeigt, und was install() später braucht.
 */
function evaluateRelease(rel, current, mode) {
  const latest = String(rel.tag_name || '').replace(/^v/, '');
  const asset = (rel.assets || []).find((a) => a.name === assetName(mode, latest)) || null;
  const sumsAsset = (rel.assets || []).find((a) => a.name === 'SHA256SUMS.txt') || null;
  return {
    latest,
    newer: !!latest && compareVersions(latest, current) > 0,
    notes: rel.body || '',
    url: rel.html_url || '',
    published: rel.published_at || null,
    asset,
    sumsAsset,
  };
}

/** Ergebnis des letzten Updates nach dem Neustart: marker = { from, to } */
function judgeMarker(marker, running) {
  if (!marker || !marker.to) return null;
  if (compareVersions(running, marker.to) >= 0) return { updated: running };
  return { failed: marker.to, current: running };
}


/** Batch-Pfade: in Anführungszeichen, % muss verdoppelt werden */
const batPath = (p) => `"${String(p).replace(/%/g, '%%')}"`;

/** cmd-Skript für die portable Fassung: wartet, bis die alte EXE frei ist, ersetzt sie und startet neu */
function portableScript(newFile, oldFile, logFile) {
  return [
    '@echo off',
    'set /a n=0',
    ':retry',
    'ping -n 2 127.0.0.1 >nul',
    `move /Y ${batPath(newFile)} ${batPath(oldFile)} >nul 2>&1`,
    'if not errorlevel 1 goto done',
    'set /a n+=1',
    'if %n% lss 90 goto retry',
    `>${batPath(logFile)} echo FEHLER: Die alte Datei liess sich nicht ersetzen - noch geoeffnet oder schreibgeschuetzt.`,
    'exit /b 1',
    ':done',
    `>${batPath(logFile)} echo OK`,
    `start "" ${batPath(oldFile)}`,
    'exit /b 0',
    '',
  ].join('\r\n');
}

module.exports = { portableScript, compareVersions, assetName, parseSums, expectedHash, downloadVerified, evaluateRelease, judgeMarker };
