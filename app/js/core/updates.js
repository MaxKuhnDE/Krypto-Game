/* KryptoQuest – Updates: „Nach Updates suchen“ / „Jetzt aktualisieren“ in den Einstellungen,
 * automatische Suche beim Start, Punkt an „Einstellungen“, Meldung nach dem Neustart.
 * Download, Prüfung und Austausch passieren im Hauptprozess (updater/). */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const UI = KQ.ui, h = UI.h, S = KQ.state;
  const native = root.kqNative;
  const RELEASES = 'https://github.com/MaxKuhnDE/Krypto-Game/releases';
  const UP = (KQ.updates = {});

  let result = null;          // letztes Suchergebnis aus dem Hauptprozess
  let phase = 'idle';         // idle | checking | download | restart | staged | error
  let progress = null;
  let error = '';
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

  UP.supported = () => !!(native && native.updateCheck);
  UP.available = () => !!(result && result.ok && result.newer);
  UP.onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  if (UP.supported()) {
    native.onUpdateProgress((p) => {
      if (!['download', 'restart'].includes(phase)) return;
      phase = p.phase;
      if (p.phase === 'download') progress = p;
      emit();
    });
  }

  UP.check = async () => {
    if (!UP.supported()) return null;
    phase = 'checking'; error = ''; emit();
    try {
      result = await native.updateCheck();
      phase = result.ok ? 'idle' : 'error';
      if (!result.ok) error = result.error;
    } catch (e) { phase = 'error'; error = e.message; }
    emit();
    return result;
  };

  UP.install = async () => {
    phase = 'download';
    progress = { received: 0, total: (result && result.size) || 0 };
    error = ''; emit();
    try {
      const r = await native.updateInstall();
      phase = r && r.staged ? 'staged' : 'restart';
    } catch (e) { phase = 'error'; error = String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''); }
    emit();
  };

  /** Beim Start (nur in der installierten App): nach neuer Version suchen und Bescheid geben */
  UP.autoCheck = async () => {
    if (!UP.supported() || !S.settings().autoUpdateCheck) return;
    if (!native.packaged && native.updateMode !== 'test') return;
    const r = await UP.check();
    if (r && r.ok && r.newer) UI.toast(`Neue Version ${r.latest} verfügbar`, 'Einstellungen → Updates', null, 7000);
  };

  /** Nach dem Start: Ist das letzte Update angekommen? */
  UP.announceResult = async () => {
    if (!UP.supported()) return;
    let r = null;
    try { r = await native.updateLastResult(); } catch { return; }
    if (!r) return;
    if (r.updated) { UI.toast('Update eingespielt', `KryptoQuest ist jetzt auf Version ${r.updated}.`, null, 6000); return; }
    if (r.failed) {
      UI.modal('Update nicht eingespielt',
        `<p>Das Update auf Version ${UI.esc(r.failed)} wurde nicht eingespielt – KryptoQuest läuft weiter mit ${UI.esc(r.current)}. Der Spielstand ist unverändert.</p><p>Grund: ${UI.esc(r.reason || 'unbekannt')}</p>`);
    }
  };

  const mb = (n) => `${(n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
  const dateFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });
  const openReleases = (url) => {
    const a = h('a', { href: url || RELEASES, target: '_blank', rel: 'noopener' });
    document.body.appendChild(a); a.click(); a.remove();
  };

  /** Abschnitt für die Einstellungsseite */
  UP.section = () => {
    const wrap = h('div', { class: 'update-settings' });
    const version = (native && native.version) || KQ.VERSION;

    const statusBlock = () => {
      if (phase === 'checking') return h('p', { class: 'muted' }, 'Suche nach Updates …');
      if (phase === 'error') return UI.callout('danger', 'Update-Suche fehlgeschlagen', UI.esc(error));
      if (!result || !result.ok) return null;
      if (!result.newer) {
        return h('p', { class: 'ok-text' }, result.latest ? `✓ Du hast die neueste Version (${result.current}).` : 'Es ist noch keine Version veröffentlicht.');
      }
      const notes = String(result.notes || '').replace(/^#+\s*/gm, '').trim();
      let action;
      if (phase === 'download') {
        const total = (progress && progress.total) || result.size || 0;
        const pct = total ? Math.min(100, Math.round((progress.received / total) * 100)) : 0;
        action = h('div', { class: 'col' }, h('div', { class: 'xpbar', style: { height: '6px' } }, h('div', { style: { width: pct + '%' } })),
          h('span', { class: 'mono small muted' }, total ? `${mb(progress.received)} von ${mb(total)} · ${pct} %` : 'Lädt …'));
      } else if (phase === 'restart') {
        action = h('p', null, 'Update wird eingespielt – KryptoQuest beendet sich und startet gleich neu …');
      } else if (phase === 'staged') {
        action = h('p', { class: 'ok-text' }, '✓ Update geladen und Prüfsumme bestätigt (Testmodus – nichts ersetzt).');
      } else {
        action = h('div', { class: 'row' },
          UI.button('Jetzt aktualisieren', UP.install, { kind: 'accent', disabled: !result.installable }),
          UI.button('Release-Seite öffnen', () => openReleases(result.url), { kind: 'subtle' }),
          result.installable ? null : h('span', { class: 'small muted' }, result.reason));
      }
      const hint = result.mode === 'portable'
        ? `Download ${mb(result.size || 0)} – neue portable EXE; sie ersetzt nach dem Beenden die bisherige Datei (gleicher Dateiname).`
        : `Download ${mb(result.size || 0)} – Installer, läuft still im Hintergrund. Bei einer Installation „für alle Benutzer“ fragt Windows nach Administratorrechten.`;
      return h('div', { class: 'card flat' },
        h('div', null, h('b', null, `Version ${result.latest} ist verfügbar`),
          result.published ? h('span', { class: 'muted small' }, ` · ${dateFmt.format(new Date(result.published))}`) : null),
        notes ? h('pre', { class: 'code', style: { whiteSpace: 'pre-wrap', maxHeight: '240px', overflow: 'auto' } }, notes.length > 1500 ? notes.slice(0, 1500) + ' …' : notes) : null,
        h('p', { class: 'small muted' }, hint),
        action);
    };

    const render = () => {
      const busy = ['checking', 'download', 'restart'].includes(phase);
      UI.clear(wrap);
      if (!UP.supported()) {
        wrap.append(h('p', null, `Installierte Version ${KQ.VERSION}. Im Browser gibt es keine automatischen Updates – neue Versionen stehen auf der `,
          h('a', { href: RELEASES, target: '_blank', rel: 'noopener' }, 'Release-Seite'), '.'));
        return;
      }
      wrap.append(
        h('div', { class: 'row between' },
          h('div', null, h('div', null, h('b', null, `Installierte Version ${version}`)),
            h('div', { class: 'small muted' }, 'Spielstand und Einstellungen bleiben bei Updates erhalten.')),
          UI.button('Nach Updates suchen', UP.check, { disabled: busy })),
        h('div', { class: 'row mt' }, UI.toggle('Beim Start nach Updates suchen', S.settings().autoUpdateCheck, (v) => S.setSetting('autoUpdateCheck', v))),
        h('div', { class: 'mt' }, statusBlock()));
    };
    render();
    const off = UP.onChange(render);
    UI.onLeave(off);
    return wrap;
  };
})(typeof window !== 'undefined' ? window : globalThis);
