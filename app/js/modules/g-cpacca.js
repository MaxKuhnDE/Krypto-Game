/* Welt G – IND-CPA / IND-CCA als Spiele */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, aes: AES, sha256: SHA } = KQ;
  const h = UI.h;

  /** Schemata: enc(K, M) -> Bytes, dec(K, C) -> {ok, plain} */
  const SCHEMES = {
    ecb: { name: 'AES-ECB', enc: (K, M) => AES.ecbEncrypt(K.e, M), dec: (K, C) => { const ci = AES.cipher(K.e); const o = new Uint8Array(C.length); for (let i = 0; i < C.length; i += 16) o.set(ci.dec(C.subarray(i, i + 16)), i); const p = AES.unpad(o); return { ok: !!p, plain: p }; } },
    det: { name: 'AES-CBC mit festem IV = 0', enc: (K, M) => AES.cbcEncrypt(K.e, new Uint8Array(16), M), dec: (K, C) => { const d = AES.cbcDecrypt(K.e, new Uint8Array(16), C); return { ok: d.ok, plain: d.plain }; } },
    cbc: { name: 'AES-CBC mit zufälligem IV', enc: (K, M) => { const iv = U.randomBytes(16); return U.concat(iv, AES.cbcEncrypt(K.e, iv, M)); }, dec: (K, C) => { if (C.length < 32 || C.length % 16) return { ok: false }; const d = AES.cbcDecrypt(K.e, C.slice(0, 16), C.slice(16)); return { ok: d.ok, plain: d.plain }; } },
    etm: { name: 'Encrypt-then-MAC (CBC + HMAC-SHA-256)', enc: (K, M) => { const iv = U.randomBytes(16); const c = U.concat(iv, AES.cbcEncrypt(K.e, iv, M)); return U.concat(c, SHA.hmac(K.m, c).slice(0, 16)); },
      dec: (K, C) => { if (C.length < 48) return { ok: false }; const c = C.slice(0, -16), t = C.slice(-16); if (!U.equal(SHA.hmac(K.m, c).slice(0, 16), t)) return { ok: false, mac: true }; const d = AES.cbcDecrypt(K.e, c.slice(0, 16), c.slice(16)); return { ok: d.ok, plain: d.plain }; } },
  };
  const GAMES = [
    { id: 'ecb', scheme: 'ecb', cca: false, title: 'CPA gegen ECB', win: true, hint: 'Verschlüssele zwei identische 16-Byte-Blöcke.' },
    { id: 'det', scheme: 'det', cca: false, title: 'CPA gegen deterministisches CBC', win: true, hint: 'Verschlüssele dieselbe Nachricht zweimal.' },
    { id: 'cbc', scheme: 'cbc', cca: false, title: 'CPA gegen CBC (zufälliger IV)', win: false, hint: 'Hier solltest du nicht gewinnen können – CBC ist CPA-sicher.' },
    { id: 'cca', scheme: 'cbc', cca: true, title: 'CCA gegen CBC', win: true, hint: 'Verschlüssele M, kippe ein Bit im IV des Chiffrats und lass es entschlüsseln. Real: du bekommst M mit gekipptem Bit zurück.' },
    { id: 'etm', scheme: 'etm', cca: true, title: 'CCA gegen Encrypt-then-MAC', win: false, hint: 'Jede Veränderung wird vom MAC erkannt – das Dec-Orakel ist nutzlos.' },
  ];

  KQ.module({
    id: 'indcpa', world: 'G', icon: '🛡️', title: 'IND-CPA & IND-CCA',
    short: 'Sicherheitsdefinitionen als Spiele: Brich ECB, deterministische Verschlüsselung und CBC unter CCA – und scheitere an Encrypt-then-MAC.',
    keywords: 'ind-cpa ind-cca cca1 cca2 chosen plaintext ciphertext spiel real rand ecb cbc etm',
    challenges: { ecb: { title: 'ECB unter CPA brechen', xp: 40 }, det: { title: 'Determinismus ausnutzen', xp: 40 }, cca: { title: 'CBC unter CCA brechen', xp: 70 }, secure: { title: 'Sichere Varianten erleben', xp: 20 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('IND-CPA (Chosen Plaintext Attack)',
            h('div', { class: 'grid c2' }, UI.lib('L<sub>cpa-real</sub>', ['K ← Σ.K', 'CPA.e(M): return Σ.e(K, M)']), UI.lib('L<sub>cpa-rand</sub>', ['CPA.e(M): return C ← Σ.C(|M|)   (zufällig)'])),
            h('p', null, 'Chiffrate müssen von Zufallsbits gleicher Länge ununterscheidbar sein. Die ', h('b', null, 'Länge'), ' bleibt immer sichtbar (Videolänge trotz TLS, Sprechpausen in VoIP, typische Seitengrößen).')),
          UI.card('Hierarchie',
            h('pre', { class: 'code' }, 'IND-CCA2  (Dec-Orakel vor und nach der Challenge – stärkstes Modell)\n   ⇓\nIND-CCA1  (Dec-Orakel nur vor der Challenge)\n   ⇓\nIND-CPA   (nur Enc-Orakel)'),
            UI.table(['Modus', 'IND-CPA', 'IND-CCA'], [['ECB', '✗', '✗'], ['CBC / CTR (zufälliger IV)', '✓', '✗ (malleable)'], ['Encrypt-then-MAC, GCM / AEAD', '✓', '✓']], { wrap: false })),
          UI.card('Warum gerade diese Spiele?',
            h('p', null, 'CPA/CCA modellieren bewusst den schlimmsten Fall: Der Angreifer darf frei ver- und entschlüsseln lassen. Wer diesen strengen Test besteht, hält realistischeren Angriffen erst recht stand.'),
            UI.callout('exam', 'Typische Beweise', '<b>ECB nicht CPA-sicher:</b> Real wiederholt sich das Chiffrat bei gleichem Klartext, Rand nie. <b>Deterministisch ⇒ nie CPA-sicher</b> (gilt auch für PKE). <b>CBC nicht CCA-sicher:</b> M ⊕ M′ = C₀ ⊕ C₀′.')));
      } },
      { title: '⚔️ Spiele', render(el, ctx) {
        let gi = 0;
        const box = h('div');
        const start = () => {
          UI.clear(box);
          const g = GAMES[gi], S = SCHEMES[g.scheme];
          box.append(UI.callout(g.win ? 'tip' : 'info', g.title, `Schema: <b>${S.name}</b>. ${g.cca ? 'Du hast ein Enc- und ein Dec-Orakel (CCA). Die Bibliothek verweigert nur die Entschlüsselung exakt der Chiffrate, die sie selbst geliefert hat (Rand-Welt: gibt dann das gespeicherte M zurück).' : 'Du hast ein Enc-Orakel (CPA).'} <details><summary class="small">Tipp</summary>${g.hint}</details>`));
          T.distGame(box, {
            rounds: 10, need: g.win ? 9 : 11,
            setup: (b) => ({ b, K: { e: U.randomBytes(16), m: U.randomBytes(32) }, D: new Map(), last: null }),
            render: (area, w, log) => {
              const mIn = UI.input({ value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', w: 'l' });
              const cIn = UI.input({ placeholder: 'Chiffrat (Hex)', mono: true, w: 'full' });
              const enc = () => {
                const M = U.utf8(mIn.value);
                let C = S.enc(w.K, M);
                if (w.b === 1) { C = U.randomBytes(C.length); }
                w.D.set(U.hex(C), M);
                cIn.value = U.hex(C);
                log(`e("${U.escape(mIn.value)}") → ${U.chunk(Array.from(C), 16).map((x) => U.hex(x)).join(' ')}`);
              };
              const dec = () => {
                let C;
                try { C = U.fromHex(cIn.value); } catch (e) { log('⚠ ' + e.message); return; }
                const key = U.hex(C);
                if (w.D.has(key)) { log(`d(…) → <i>eigenes Chiffrat</i>: "${U.escape(U.printable(w.D.get(key)))}"`); return; }
                const r = S.dec(w.K, C);
                log(`d(${key.slice(0, 16)}…) → ${r.ok ? '"' + U.escape(U.printable(r.plain)) + '"' : r.mac ? '<b>err (MAC ungültig)</b>' : '<b>err (Padding)</b>'}`);
              };
              area.append(h('div', { class: 'row' }, UI.field('Klartext M', mIn), UI.button('Enc-Orakel', enc, { kind: 'accent' })));
              if (g.cca) area.append(h('div', { class: 'row mt' }, UI.field('Chiffrat für das Dec-Orakel (editierbar – kippe z. B. ein Bit im ersten Byte)', cIn), UI.button('Dec-Orakel', dec)));
            },
            labels: ['Real', 'Zufall'],
            onWin: () => ctx.solve(g.id),
            onEnd: () => { if (!g.win) { ctx.solve('secure'); UI.toast('So soll es sein', 'Gegen ein sicheres Schema bleibt dein Vorteil ≈ 0.', '🛡️'); } },
          });
        };
        el.append(UI.card('Spiel wählen', UI.segmented(GAMES.map((g, i) => [i, g.title]), gi, (v) => { gi = +v; start(); })), box);
        start();
      } },
    ],
    quiz: [
      { q: 'Welche Implikation ist richtig?', a: ['CCA2 ⇒ CCA1 ⇒ CPA', 'CPA ⇒ CCA1 ⇒ CCA2', 'CCA1 ⇒ CCA2', 'CPA ⇒ CCA2'], c: 0, e: 'Ein stärkeres Modell impliziert das schwächere.' },
      { q: 'Warum ist jedes deterministische Verfahren nicht CPA-sicher?', a: ['Zweimal dieselbe Nachricht ergibt dasselbe Chiffrat', 'Weil es keinen Schlüssel hat', 'Weil es zu langsam ist', 'Weil es kein Padding hat'], c: 0, e: 'Der Angreifer vergleicht einfach.' },
      { q: 'Was bleibt auch bei IND-CPA-Sicherheit sichtbar?', a: ['Die Länge der Nachricht', 'Das erste Byte', 'Der Schlüssel', 'Nichts'], c: 0, e: 'Σ.C(|M|) hängt von |M| ab.' },
      { q: 'Welcher Modus ist IND-CCA-sicher?', a: ['AES-GCM', 'AES-CBC', 'AES-CTR', 'AES-ECB'], c: 0, e: 'AEAD-Verfahren sind im stärksten Modell sicher.' },
    ],
  });
})();
