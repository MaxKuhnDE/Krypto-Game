/* Welt F – Beweisbare Sicherheit: Vernachlässigbarkeit, Unterscheider, Geburtstag, Game Hopping */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, aes: AES, toys: TOY } = KQ;
  const h = UI.h;

  // ======================================================================
  const FUNCS = [
    ['1/2^κ', (k) => -k, true, 'fällt exponentiell'],
    ['κ¹⁰/2^κ', (k) => 10 * Math.log2(k) - k, true, 'Polynom · 2^−κ bleibt vernachlässigbar'],
    ['1/κ¹⁰⁰⁰', (k) => -1000 * Math.log2(k), false, 'nur polynomiell klein: für p(κ) = κ¹⁰⁰¹ nie kleiner'],
    ['2^(−κ/2)', (k) => -k / 2, true, 'exponentiell, nur langsamer'],
    ['1/(κ² + 1)', (k) => -Math.log2(k * k + 1), false, 'polynomiell'],
    ['q(κ)²/2^κ, q Polynom', (k) => 2 * 3 * Math.log2(k) - k, true, 'Geburtstagsschranke bei polynomiell vielen Anfragen'],
    ['2^(−log₂ κ)', (k) => -Math.log2(k), false, '= 1/κ, polynomiell'],
    ['2^(−√κ)', (k) => -Math.sqrt(k), true, 'superpolynomiell klein'],
  ];

  KQ.module({
    id: 'negl', world: 'F', icon: '📉', title: 'Vernachlässigbarkeit & Ununterscheidbarkeit',
    short: 'Was „praktisch null“ formal heißt, wie man Spiele vergleicht und warum Hybrid-Ketten funktionieren.',
    keywords: 'vernachlässigbar negligible ununterscheidbar advantage vorteil library bibliothek hybrid',
    challenges: { classify: { title: 'Funktionen klassifizieren', xp: 40 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Vernachlässigbare Funktion',
            h('p', null, 'f ist ', h('b', null, 'vernachlässigbar'), ', wenn es für jedes Polynom p ein κ₀ gibt mit f(κ) < 1/p(κ) für alle κ > κ₀. Umgangssprachlich: f fällt schneller gegen 0 als 1/p(κ) für jedes Polynom.'),
            h('p', null, 'Beispiele: 1/2^κ, 1/2^(κ/2), q(κ)/2^(κ/2) für ein Polynom q. Gegenbeispiel: 1/κ¹⁰⁰⁰.')),
          UI.card('Ununterscheidbarkeit',
            h('p', null, 'Zwei Bibliotheken L₁, L₂ mit gleicher Schnittstelle. Der ', h('b', null, 'Vorteil'), ' eines Angreifers A:'),
            UI.formula('Adv(A) = | Pr[A ⋄ L₁ ⇒ wahr] − Pr[A ⋄ L₂ ⇒ wahr] |'),
            h('p', null, 'L₁ ≈ L₂, wenn jeder polynomiell beschränkte A nur vernachlässigbaren Vorteil hat. „A ⋄ L“ heißt: A ruft die Prozeduren von L auf.')),
          UI.card('Rechenregeln (Lemma 1 & 2, Kap. 10)',
            h('ol', null,
              h('li', null, 'L₁ ≡ L₂ (identisch verteilt) ⇒ L₁ ≈ L₂'),
              h('li', null, 'L₁ ≈ L₂ und L₂ ≈ L₃ ⇒ L₁ ≈ L₃ (Transitivität, Dreiecksungleichung)'),
              h('li', null, 'L₁ ≈ L₂ ⇒ L₃ ⋄ L₁ ≈ L₃ ⋄ L₂ (Einbettung in einen Kontext – genau das ist jeder Schritt „ersetze die PRF durch Zufall“)'),
              h('li', null, 'Für polynomiell viele Hops L₀ ≈ L₁ ≈ … ≈ L_q gilt L₀ ≈ L_q, denn Adv ≤ Σ Adv(Lᵢ₋₁, Lᵢ) – eine Summe aus polynomiell vielen vernachlässigbaren Termen.'))),
          UI.card('PRG – Pseudozufallsgenerator',
            h('div', { class: 'grid c2' }, UI.lib('L<sub>prg-real</sub>', ['PRG.SAMPLE():', '  S ← {0,1}^κ', '  return G(S)']), UI.lib('L<sub>prg-rand</sub>', ['PRG.SAMPLE():', '  Y ← {0,1}^(κ+l)', '  return Y'])),
            h('p', null, 'G: {0,1}^κ → {0,1}^(κ+l) deterministisch, l > 0, sicher wenn L_prg-real ≈ L_prg-rand. Ob PRGs existieren, ist offen (P = NP ⇒ vermutlich nicht). Die Kryptografie nimmt ihre Existenz an.')));
      } },
      { title: '🧪 Labor', render(el) {
        let fi = 1, c = 3;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const [name, f, negl] = FUNCS[fi];
          const xs = []; for (let k = 2; k <= 400; k += 2) xs.push(k);
          const pf = xs.map((k) => [k, f(k)]), pp = xs.map((k) => [k, -c * Math.log2(k)]);
          const cross = xs.find((k, i) => xs.slice(i).every((kk) => f(kk) < -c * Math.log2(kk)));
          out.append(UI.chart({ series: [{ points: pf, color: UI.css('--accent'), label: 'log₂ f(κ)' }, { points: pp, color: UI.css('--danger'), dash: [5, 4], label: `log₂ 1/κ^${c}` }], ymin: -400, ymax: 10, xlabel: 'κ', height: 260 }),
            h('p', null, cross ? `Ab κ₀ ≈ ${cross} gilt f(κ) < 1/κ^${c} dauerhaft (im Bereich bis 400).` : `Im Bereich bis 400 bleibt f(κ) nicht unter 1/κ^${c}.`, ' ', negl ? h('span', { class: 'ok-text' }, `${name} ist vernachlässigbar – es gibt für JEDES c so ein κ₀.`) : h('span', { class: 'bad-text' }, `${name} ist nicht vernachlässigbar – für ein passendes c gibt es kein κ₀.`)));
        };
        el.append(UI.card('f(κ) gegen 1/p(κ) (logarithmische y-Achse)',
          h('div', { class: 'row' }, UI.select(FUNCS.map((f, i) => [i, f[0]]), fi, (v) => { fi = +v; draw(); }), UI.slider({ label: 'Polynomgrad c =', min: 1, max: 40, value: c, oninput: (v) => { c = v; draw(); } })), out));
        draw();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        const items = U.shuffle(FUNCS);
        const ans = {}; const r = h('div');
        el.append(UI.card('Vernachlässigbar oder nicht?',
          h('div', { class: 'col' }, items.map(([n], i) => h('div', { class: 'row' }, h('span', { class: 'math', style: { width: '220px' } }, n), UI.segmented([['y', 'vernachlässigbar'], ['n', 'nicht vernachlässigbar']], null, (v) => (ans[i] = v))))),
          h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
            UI.clear(r);
            const wrong = items.filter(([, , ng], i) => ans[i] !== (ng ? 'y' : 'n'));
            if (!wrong.length) { r.append(UI.callout('success', 'Alle richtig', '')); ctx.solve('classify'); }
            else r.append(UI.callout('danger', `${wrong.length} falsch`, wrong.map(([n, , ng, why]) => `${n}: ${ng ? 'vernachlässigbar' : 'nicht vernachlässigbar'} – ${why}`).join('<br>')));
          }, { kind: 'accent' })), r));
      } },
    ],
    quiz: [
      { q: 'Ist f(κ) = κ⁵⁰/2^κ vernachlässigbar?', a: ['Ja', 'Nein', 'Nur für κ > 50', 'Hängt vom Angreifer ab'], c: 0, e: 'Polynom mal 2^−κ bleibt vernachlässigbar.' },
      { q: 'Wozu dient die Transitivität von ≈?', a: ['Um einen Beweis in viele kleine Hops zu zerlegen', 'Um Schlüssel zu verlängern', 'Um ≡ zu beweisen', 'Gar nicht, sie gilt nicht'], c: 0, e: 'Hybrid-Argument.' },
      { q: 'Was bedeutet L₁ ≡ L₂?', a: ['Identisch verteilt – Vorteil exakt 0', 'Ununterscheidbar für Polynomialzeit', 'Gleicher Quelltext', 'Gleiche Laufzeit'], c: 0, e: '≡ ist stärker als ≈.' },
    ],
  });

  // ======================================================================
  const LEVELS = [
    { id: 'prg', title: 'Level 1 · PRG G(s) = s ‖ s', kind: 'prg', desc: 'G streckt einen 8-Bit-Seed auf 16 Bit, indem er ihn verdoppelt. Ist G ein sicherer PRG?', hint: 'Vergleiche die beiden Hälften.' },
    { id: 'prf', title: 'Level 2 · PRF F(K, X) = K ⊕ X', kind: 'prf', desc: 'Eine 8-Bit-„PRF“, die den Schlüssel einfach auf die Eingabe XORt.', hint: 'Frage zwei verschiedene X ab und vergleiche F(X) ⊕ F(X′) mit X ⊕ X′.' },
    { id: 'f1', title: 'Level 3 · Feistel mit 1 Runde', kind: 'f1', desc: '16-Bit-Feistel (Hälften à 8 Bit) mit einer Runde und Toy-PRF – gegen eine echte Zufallspermutation.', hint: 'Nach einer Runde gilt L₁ = R₀.' },
    { id: 'f2', title: 'Level 4 · Feistel mit 2 Runden', kind: 'f2', desc: 'Zwei Runden – jetzt ist L₂ nicht mehr trivial.', hint: 'Zwei Anfragen mit gleichem R: L₂ = L ⊕ F(k₁, R) ⇒ L₂ ⊕ L₂′ = L ⊕ L′.' },
    { id: 'secure', title: 'Level 5 · AES als PRF', kind: 'aes', desc: 'F(K, X) = erstes Byte von AES_K(X). Versuche es – und beobachte deinen Vorteil.', hint: 'Hier gibt es (vermutlich) keinen effizienten Unterscheider.' },
  ];

  KQ.module({
    id: 'arena', world: 'F', icon: '🥊', title: 'Unterscheider-Arena: PRG, PRF, PRP',
    short: 'Du bist der Angreifer: Erkenne, ob du mit der echten Konstruktion oder mit idealem Zufall sprichst.',
    keywords: 'prg prf prp unterscheider distinguisher lazy sampling switching lemma arena feistel',
    challenges: { prg: { title: 'PRG s‖s entlarven', xp: 30 }, prf: { title: 'PRF K⊕X entlarven', xp: 40 }, f1: { title: '1-Runden-Feistel', xp: 40 }, f2: { title: '2-Runden-Feistel', xp: 60 }, secure: { title: 'AES-PRF ausprobieren', xp: 20 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('PRF – Pseudozufallsfunktion',
            h('div', { class: 'grid c2' }, UI.lib('L<sub>prf-real</sub>', ['K ← {0,1}^κ', 'QUERY(X):', '  return F(K, X)']), UI.lib('L<sub>prf-rand</sub>', ['QUERY(X):', '  if L[X] undefined:', '    L[X] ← {0,1}^m', '  return L[X]'])),
            h('p', null, 'Die ideale Bibliothek ist eine echte Zufallsfunktion – per ', h('b', null, 'Lazy Sampling'), ': Werte werden erst bei der ersten Anfrage gezogen und dann konsistent wiederholt.')),
          UI.card('PRP – Pseudozufallspermutation',
            UI.lib('L<sub>prp-rand</sub>', ['QUERY(X):', '  if L[X] undefined:', '    Y ← {0,1}^n \\ 𝒴     (ohne Zurücklegen!)', '    𝒴 ← 𝒴 ∪ {Y};  L[X] ← Y', '  return L[X]']),
            h('p', null, 'Eine Blockchiffre mit festem Schlüssel soll eine PRP sein.')),
          UI.card('PRF-PRP-Switching-Lemma',
            h('p', null, 'Eine ideale Zufallsfunktion (mit Zurücklegen) und eine ideale Zufallspermutation (ohne Zurücklegen) unterscheiden sich nur, wenn bei der Funktion eine Kollision auftritt:'),
            UI.formula('Adv ≤ Pr[bad] ≤ q(q−1)/2^(n+1) ≤ q²/2^n'),
            h('p', null, 'Für q ≪ 2^(n/2) vernachlässigbar – man darf in Beweisen frei zwischen PRF- und PRP-Idealisierung wechseln.')),
          UI.callout('tip', 'So spielst du', 'In jeder Runde wird verdeckt „Real“ (die Konstruktion) oder „Zufall“ (ideale Bibliothek) gewählt. Stelle Anfragen und entscheide. Wer in 10 Runden mindestens 9-mal richtig liegt, hat einen Unterscheider mit großem Vorteil gefunden – die Konstruktion ist gebrochen.'));
      } },
      ...LEVELS.map((lv) => ({ title: lv.title.split('·')[0].trim(), render(el, ctx) {
        el.append(UI.callout('info', lv.title, lv.desc + ` <details><summary class="small">Tipp anzeigen</summary>${lv.hint}</details>`));
        T.distGame(el, {
          title: lv.title, rounds: 10, need: lv.kind === 'aes' ? 11 : 9,
          setup: (b) => {
            const w = { b, table: new Map(), used: new Set() };
            w.rand8 = (x) => { if (!w.table.has(x)) w.table.set(x, U.randInt(0, 255)); return w.table.get(x); };
            w.randPerm16 = (x) => { if (!w.table.has(x)) { let y; do y = U.randInt(0, 0xffff); while (w.used.has(y)); w.used.add(y); w.table.set(x, y); } return w.table.get(x); };
            w.K = U.randInt(0, 255); w.k2 = U.randInt(0, 255);
            w.aesKey = U.randomBytes(16);
            return w;
          },
          render: (area, w, log) => {
            const hex8 = (v) => '0x' + U.hex8(v), hex16 = (v) => U.hex8(v >> 8) + ' ' + U.hex8(v & 255);
            if (lv.kind === 'prg') {
              area.append(UI.button('PRG.SAMPLE()', () => {
                const y = w.b === 0 ? (() => { const s = U.randInt(0, 255); return (s << 8) | s; })() : U.randInt(0, 0xffff);
                log(`SAMPLE() → <b>${hex16(y)}</b>`);
              }, { kind: 'accent' }));
            } else {
              const inp = UI.input({ placeholder: lv.kind === 'prf' || lv.kind === 'aes' ? 'X (Hex, 1 Byte)' : 'L R (Hex, z.B. 41 42)', mono: true, w: 'm' });
              const q = () => {
                const parts = inp.value.trim().split(/\s+/).map((p) => parseInt(p, 16));
                if (lv.kind === 'prf' || lv.kind === 'aes') {
                  const x = parts[0];
                  if (isNaN(x) || x > 255) return;
                  const y = w.b === 1 ? w.rand8(x) : lv.kind === 'prf' ? w.K ^ x : AES.encryptBlock(Uint8Array.from([x, ...new Array(15).fill(0)]), w.aesKey)[0];
                  log(`QUERY(${hex8(x)}) → <b>${hex8(y)}</b>`);
                } else {
                  const [L, R] = parts;
                  if ([L, R].some((v) => isNaN(v) || v > 255)) return;
                  let out;
                  if (w.b === 1) out = w.randPerm16((L << 8) | R);
                  else if (lv.kind === 'f1') { const [a, c] = TOY.feistelEnc(L, R, [w.K]); out = (a << 8) | c; }
                  else { const [a, c] = TOY.feistelEnc(L, R, [w.K, w.k2]); out = (a << 8) | c; }
                  log(`QUERY(L=${U.hex8(L)}, R=${U.hex8(R)}) → <b>L′=${U.hex8(out >> 8)}, R′=${U.hex8(out & 255)}</b>`);
                }
              };
              inp.addEventListener('keydown', (e) => e.key === 'Enter' && q());
              area.append(h('div', { class: 'row' }, inp, UI.button('QUERY', q, { kind: 'accent' }), lv.kind !== 'prg' ? h('div', { style: { width: '260px' } }, T.xorCalc('⊕ Hilfsrechner')) : null));
            }
          },
          onWin: () => ctx.solve(lv.id),
          onEnd: () => { if (lv.kind === 'aes') { ctx.solve('secure'); UI.toast('Erkenntnis', 'Gegen eine gute PRF bleibt dein Vorteil nahe 0 – genau das bedeutet „sicher“.', '🧠'); } },
          explain: (w, b) => (lv.kind === 'aes' ? '' : b === 0 ? 'Die reale Konstruktion hatte die Struktur aus dem Tipp.' : 'Die ideale Bibliothek hat keine Struktur.'),
        });
      } })),
    ],
    quiz: [
      { q: 'Wie unterscheidet man 1-Runden-Feistel von einer Zufallspermutation?', a: ['Prüfen, ob L₁ = R₀', 'Gar nicht', 'Durch 2^κ Anfragen', 'Durch Vergleich mit AES'], c: 0, e: 'Eine Anfrage genügt, Vorteil ≈ 1.' },
      { q: 'Was besagt das PRF-PRP-Switching-Lemma?', a: ['Ideale Funktion und ideale Permutation sind bis auf die Geburtstagsschranke ununterscheidbar', 'Jede PRF ist eine PRP', 'PRPs existieren nicht', 'Feistel braucht 3 Runden'], c: 0, e: 'Unterschied nur bei Kollisionen: q²/2ⁿ.' },
      { q: 'Lazy Sampling bedeutet …', a: ['Zufallswerte erst bei der ersten Anfrage ziehen und speichern', 'Wenige Stichproben nehmen', 'Den Schlüssel spät wählen', 'Ziehen ohne Zurücklegen'], c: 0, e: 'Dadurch ist die ideale Funktion effizient beschreibbar.' },
    ],
  });

  // ======================================================================
  const birthdayExact = (q, N) => { let p = 1; for (let i = 0; i < q; i++) { p *= (N - i) / N; if (p < 1e-12) return 1; } return 1 - p; };

  KQ.module({
    id: 'geburtstag', world: 'F', icon: '🎂', title: 'Geburtstagsparadoxon & Kollisionsschranke',
    short: 'Warum Kollisionen nach ≈ 2^(n/2) statt 2ⁿ Versuchen kommen – und weshalb fast jeder Beweis bei q²/2^κ endet.',
    keywords: 'geburtstag birthday kollision schranke union bound sweet32 hash',
    challenges: { estimate: { title: '50-%-Schwelle schätzen', xp: 40 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Das Paradoxon',
            h('p', null, 'Unter 23 Personen haben mit > 50 % zwei am selben Tag Geburtstag. Allgemein: Zieht man q Werte gleichverteilt aus N Möglichkeiten,'),
            UI.formula('Pr[Kollision] ≈ 1 − e^(−q(q−1)/(2N))      ≤  q(q−1)/(2N)   (Union Bound über alle Paare)'),
            h('p', null, 'Die 50-%-Schwelle liegt bei q ≈ 1,18·√N. Für n-Bit-Werte also nach ≈ 2^(n/2) Versuchen.')),
          UI.card('Wo das überall auftaucht',
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, 'Beweise: '), 'Bad-Events sind fast immer Kollisionen von Zufallswerten ⇒ Pr[bad] ≤ q²/2^κ (Trick 5).'),
              h('li', null, h('b', null, 'PRF/PRP-Switching, CBC-CPA, Feistel: '), 'genau diese Schranke.'),
              h('li', null, h('b', null, 'Hashfunktionen: '), 'Generischer Kollisionsangriff in 2^(n/2) – daher 256-Bit-Hashes für 128-Bit-Sicherheit.'),
              h('li', null, h('b', null, 'Sweet32: '), '64-Bit-Blockchiffren (3DES, Blowfish) kollidieren nach ≈ 2³² Blöcken.'))));
      } },
      { title: '🧪 Labor', render(el) {
        let n = 16;
        const out = h('div'), sim = h('div');
        const draw = () => {
          UI.clear(out);
          const N = 2 ** n, qmax = Math.ceil(4 * Math.sqrt(N));
          const step = Math.max(1, Math.floor(qmax / 120));
          const ex = [], bd = [];
          for (let q = 0; q <= qmax; q += step) { ex.push([q, birthdayExact(q, N)]); bd.push([q, Math.min(1, (q * (q - 1)) / (2 * N))]); }
          out.append(UI.chart({ series: [{ points: ex, color: UI.css('--accent'), label: 'exakt' }, { points: bd, color: UI.css('--danger'), dash: [5, 4], label: 'Schranke q(q−1)/2N' }], ymin: 0, ymax: 1, xlabel: 'q', height: 240 }),
            h('p', null, `n = ${n} Bit ⇒ N = 2^${n} = ${N.toLocaleString('de-DE')}. 50 % bei q ≈ `, h('b', null, Math.round(1.1774 * Math.sqrt(N)).toLocaleString('de-DE')), ` (≈ 2^${(n / 2).toFixed(1)}).`));
        };
        const runSim = () => {
          UI.clear(sim);
          const N = 2 ** n; const res = [];
          for (let t = 0; t < 200; t++) { const seen = new Set(); let q = 0; while (true) { q++; const v = U.randInt(0, N - 1); if (seen.has(v)) break; seen.add(v); } res.push(q); }
          const avg = res.reduce((a, b) => a + b, 0) / res.length;
          sim.append(h('p', null, `200 Experimente: im Mittel erste Kollision nach `, h('b', null, avg.toFixed(0)), ` Ziehungen (Theorie √(πN/2) ≈ ${Math.sqrt((Math.PI * N) / 2).toFixed(0)}).`));
        };
        el.append(UI.card('Kollisionswahrscheinlichkeit', UI.slider({ label: 'Bitlänge n =', min: 6, max: 24, value: n, oninput: (v) => { n = v; draw(); UI.clear(sim); } }), out,
          h('div', { class: 'row' }, UI.button('🎲 Experiment: ziehen bis zur Kollision (200×)', runSim)), sim));
        draw();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        el.append(UI.card('Schätze ab',
          h('p', null, 'Wie viele zufällige ', h('b', null, '32-Bit'), '-Werte musst du ziehen, damit die Kollisionswahrscheinlichkeit etwa 50 % beträgt? (±20 % Toleranz)'),
          T.answer('q ≈', (v) => { const q = +v.replace(/[.\s]/g, ''); if (q > 61700 && q < 92600) { ctx.solve('estimate'); return true; } return q > 92600 ? 'zu viel' : 'zu wenig'; })));
      } },
    ],
    quiz: [
      { q: 'Nach wie vielen Versuchen findet man generisch eine Kollision einer n-Bit-Hashfunktion?', a: ['≈ 2^(n/2)', '≈ 2ⁿ', '≈ n²', '≈ 2^(2n)'], c: 0, e: 'Geburtstagsangriff.' },
      { q: 'Welche Schranke liefert der Union Bound für q Werte aus {0,1}^κ?', a: ['q(q−1)/2 · 2^−κ', 'q · 2^−κ', '2^−κ', 'q²'], c: 0, e: '(q über 2) Paare, je Wahrscheinlichkeit 2^−κ.' },
    ],
  });

  // ======================================================================
  const WHY = {
    syn: 'rein syntaktische Umformung',
    prf: 'PRF-Annahme (Reduktion)',
    bday: 'identical-until-bad + Geburtstagsschranke',
    mac: 'Bad-Event: Fälschung ≤ q/2^λ',
    cpa: 'CPA-Sicherheit von Σ',
    swap: 'Ziehen mit ↔ ohne Zurücklegen (Geburtstag)',
  };
  const PROOFS = [
    { id: 'cbc', title: 'CBC ist CPA-sicher', thm: 'Ist F eine sichere PRF, dann ist L<sub>cpa-real</sub> ≈ L<sub>cpa-rand</sub> für CBC.',
      hy: [
        ['L<sub>cpa-real</sub>', ['K ← {0,1}^κ', 'CPA.e(M₁‖…‖Mₗ):', '  C₀ ← {0,1}^κ', '  for i = 1..l: Cᵢ ← F(K, Cᵢ₋₁ ⊕ Mᵢ)', '  return C₀‖…‖Cₗ']],
        ['Zwischenwert benennen', ['  for i = 1..l:', { t: '    Xᵢ ← Cᵢ₋₁ ⊕ Mᵢ', cls: 'add' }, { t: '    Cᵢ ← F(K, Xᵢ)', cls: 'chg' }]],
        ['PRF durch Dictionary ersetzen', ['  for i = 1..l:', '    Xᵢ ← Cᵢ₋₁ ⊕ Mᵢ', { t: '    if L[Xᵢ] undef: L[Xᵢ] ← {0,1}^κ', cls: 'add' }, { t: '    Cᵢ ← L[Xᵢ]', cls: 'chg' }]],
        ['bad-Flag instrumentieren', ['    Xᵢ ← Cᵢ₋₁ ⊕ Mᵢ', { t: '    if L[Xᵢ] defined: bad ← true', cls: 'add' }, '    else: L[Xᵢ] ← {0,1}^κ', '    Cᵢ ← L[Xᵢ]']],
        ['immer frisch ziehen', ['    Xᵢ ← Cᵢ₋₁ ⊕ Mᵢ', '    if L[Xᵢ] defined: bad ← true', { t: '    L[Xᵢ] ← {0,1}^κ   (auch wenn definiert)', cls: 'chg' }, '    Cᵢ ← L[Xᵢ]']],
        ['L<sub>cpa-rand</sub>', ['CPA.e(M₁‖…‖Mₗ):', '  for i = 0..l: Cᵢ ← {0,1}^κ', '  return C₀‖…‖Cₗ']],
      ], links: [['≡', 'syn'], ['≈', 'prf'], ['≡', 'syn'], ['≈', 'bday'], ['≡', 'syn']] },
    { id: 'mac', title: 'PRF ⇒ sicherer MAC', thm: 'Für eine sichere PRF F mit Ausgabelänge κ gilt L<sub>mac-real</sub> ≈ L<sub>mac-ideal</sub>.',
      hy: [
        ['L<sub>mac-real</sub>', ['K ← {0,1}^κ', 'GUESS(X, Y): return Y == F(K, X)', 'REVEAL(X):   return F(K, X)']],
        ['PRF durch Dictionary ersetzen', [{ t: 'GUESS(X, Y): if L[X] undef: L[X] ← {0,1}^κ', cls: 'chg' }, '             return Y == L[X]', { t: 'REVEAL(X):   if L[X] undef: L[X] ← {0,1}^κ; return L[X]', cls: 'chg' }]],
        ['R mitschreiben, bad markieren', ['GUESS(X, Y): …', { t: '  if X ∉ R and Y == L[X]: bad ← true', cls: 'add' }, '  return Y == L[X]', { t: 'REVEAL(X): R ← R ∪ {X}; …', cls: 'add' }]],
        ['L<sub>mac-ideal</sub>', ['GUESS(X, Y):', { t: '  if X ∉ R: return false', cls: 'chg' }, '  return Y == L[X]', 'REVEAL(X): R ← R ∪ {X}; lazy L[X]']],
      ], links: [['≈', 'prf'], ['≡', 'syn'], ['≈', 'mac']] },
    { id: 'etm', title: 'Encrypt-then-MAC ist CCA-sicher', thm: 'Σ CPA-sicher und F sichere PRF ⇒ Enc: C = Σ.Enc(Kₑ, M), T = F(Kₘ, C), return C‖T ist CCA-sicher.',
      hy: [
        ['L<sub>cca-real</sub>', ['CCA.Enc(M): C ← Σ.Enc(Kₑ,M); T ← F(Kₘ,C); return C‖T', 'CCA.Dec(C‖T): if F(Kₘ,C) ≠ T: return err', '              return Σ.Dec(Kₑ, C)']],
        ['Dictionary D für eigene Chiffrate', ['CCA.Enc(M): …; ' + '<span>D[C‖T] ← M</span>', { t: 'CCA.Dec(C‖T): if D[C‖T] defined: return D[C‖T]', cls: 'add' }, '              if F(Kₘ,C) ≠ T: return err', '              return Σ.Dec(Kₑ, C)']],
        ['Tag-PRF durch Dictionary L ersetzen', [{ t: 'CCA.Enc(M): …; if L[C] undef: L[C] ← {0,1}^λ; T ← L[C]', cls: 'chg' }, 'CCA.Dec(C‖T): if D[C‖T] defined: return D[C‖T]', { t: '              if L[C] undef or L[C] ≠ T: return err', cls: 'chg' }, '              return Σ.Dec(Kₑ, C)   ← wird nie erreicht']],
        ['Σ.Dec entfernt', ['CCA.Dec(C‖T): if D[C‖T] defined: return D[C‖T]', { t: '              return err', cls: 'chg' }, { t: '              Σ.Dec(Kₑ, C)', cls: 'del' }]],
        ['L<sub>cca-rand</sub>', [{ t: 'CCA.Enc(M): C ← Σ.C(|M|); T ← {0,1}^λ; D[C‖T] ← M', cls: 'chg' }, 'CCA.Dec(C‖T): if D[C‖T] defined: return D[C‖T]', '              …']],
      ], links: [['≡', 'syn'], ['≈', 'prf'], ['≈', 'mac'], ['≈', 'cpa']] },
    { id: 'feistel', title: '3-Runden-Feistel ist eine PRP', thm: 'Ist F eine sichere PRF mit Ein-/Ausgabelänge κ, dann ist die 3-Runden-Feistel-Chiffre eine sichere PRP (Blocklänge 2κ).',
      hy: [
        ['L<sub>prf-real</sub> (Feistel)', ['QUERY(X₀‖X₁):', '  X₂ ← X₀ ⊕ F(K₁, X₁)', '  X₃ ← X₁ ⊕ F(K₂, X₂)', '  X₄ ← X₂ ⊕ F(K₃, X₃)', '  return X₃‖X₄']],
        ['äußeres Dictionary L', [{ t: '  if L[X₀‖X₁] undef:', cls: 'add' }, '    X₂ … X₄ wie vorher', { t: '    L[X₀‖X₁] ← X₃‖X₄', cls: 'add' }, '  return L[X₀‖X₁]']],
        ['drei unabhängige Dictionaries (Three-Hop)', [{ t: '    if L₁[X₁] undef: L₁[X₁] ← {0,1}^κ;  X₂ ← X₀ ⊕ L₁[X₁]', cls: 'chg' }, { t: '    if L₂[X₂] undef: L₂[X₂] ← {0,1}^κ;  X₃ ← X₁ ⊕ L₂[X₂]', cls: 'chg' }, { t: '    if L₃[X₃] undef: L₃[X₃] ← {0,1}^κ;  X₄ ← X₂ ⊕ L₃[X₃]', cls: 'chg' }]],
        ['bad bei Kollision von X₂ / X₃', [{ t: '    if L₂[X₂] defined: bad ← true', cls: 'add' }, { t: '    L₂[X₂] ← {0,1}^κ   (unbedingt)', cls: 'chg' }, { t: '    if L₃[X₃] defined: bad ← true', cls: 'add' }, { t: '    L₃[X₃] ← {0,1}^κ   (unbedingt)', cls: 'chg' }]],
        ['X₃, X₄ direkt ziehen', [{ t: '    X₃ ← {0,1}^κ;  L₂[X₂] ← X₃ ⊕ X₁', cls: 'chg' }, { t: '    X₄ ← {0,1}^κ;  L₃[X₃] ← X₄ ⊕ X₂', cls: 'chg' }]],
        ['L<sub>prf-rand</sub> (+ bad-Logik nach dem Angriff)', ['QUERY(X₀‖X₁):', '  if L[X₀‖X₁] undef: L[X₀‖X₁] ← {0,1}^(2κ)', '  return L[X₀‖X₁]']],
      ], links: [['≡', 'syn'], ['≈', 'prf'], ['≈', 'bday'], ['≡', 'syn'], ['≡', 'syn']] },
    { id: 'ro', title: 'Random Oracle ist kollisionsresistent', thm: 'Im RO-Modell ist COMPARE(X, X′) = „H(X) == H(X′)“ ununterscheidbar von „X == X′“.',
      hy: [
        ['L<sub>crhf-real</sub>', ['H(A): if H[A] undef: H[A] ← {0,1}ⁿ; return H[A]', 'COMPARE(X, X′): return H(X) == H(X′)']],
        ['ohne Zurücklegen ziehen', [{ t: 'H(A): if H[A] undef: H[A] ← {0,1}ⁿ \\ 𝒴; 𝒴 ← 𝒴 ∪ {H[A]}', cls: 'chg' }, 'COMPARE(X, X′): return H(X) == H(X′)']],
        ['Vergleich der Eingaben', ['H(A): ohne Zurücklegen', { t: 'COMPARE(X, X′): return X == X′', cls: 'chg' }]],
        ['L<sub>crhf-ideal</sub>', [{ t: 'H(A): if H[A] undef: H[A] ← {0,1}ⁿ (mit Zurücklegen)', cls: 'chg' }, 'COMPARE(X, X′): return X == X′']],
      ], links: [['≈', 'swap'], ['≡', 'syn'], ['≈', 'swap']] },
  ];

  KQ.module({
    id: 'gamehopping', world: 'F', icon: '🧠', title: 'Game-Hopping-Werkstatt',
    short: 'Das Beweisrezept der Vorlesung: Hybride ordnen, ≡ von ≈ trennen und jeden Hop begründen.',
    keywords: 'game hopping beweis hybrid reduktion bad event lazy sampling three hop dictionary',
    challenges: Object.fromEntries(PROOFS.map((p) => [p.id, { title: p.title, xp: 60 }])),
    tabs: [
      { title: '📖 Rezept', render(el) {
        el.append(
          UI.card('Vom Real- zum Ideal-Spiel in vier Stufen',
            h('div', { class: 'grid c4' }, [['① Dictionary', 'rein syntaktisch: jede Funktionsauswertung in einer Tabelle cachen (≡)'], ['② Ideal ersetzen', 'Annahme (PRF, PRP, DDH, RO …) erlaubt, echte durch zufällige Werte zu ersetzen (≈) – hier steckt die Reduktion'], ['③ Bad-Event', 'Spiel um ein bad-Flag instrumentieren; ohne bad identisch'], ['④ Pr[bad]', 'separat abschätzen – meist Union Bound / Geburtstag']].map(([t, d]) =>
              h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, t), h('div', { class: 'small muted' }, d)))),
            h('p', { class: 'mt' }, h('b', null, '≡'), ' = identische Umformung (kein Verlust, keine Annahme). ', h('b', null, '≈'), ' = Ununterscheidbarkeit aus einer Annahme – mit expliziter Reduktion.')),
          UI.card('Checkliste',
            h('ol', null,
              h('li', null, h('b', null, 'Schnittstellen angleichen: '), 'M, C, K jedes Zwischenspiels passen exakt; hängt man z. B. Salt der Länge ω an, muss Σ′.C(l) = Σ.C(l + ω) mitgezogen werden.'),
              h('li', null, h('b', null, 'Ein Hop, eine Änderung'), ' – sonst lässt sich keine einzelne Annahme zuordnen.'),
              h('li', null, h('b', null, 'Erst umformen, dann annehmen.')),
              h('li', null, h('b', null, 'Bad-Event separat abschätzen'), ' (Identical-until-bad: Adv ≤ Pr[bad]).'),
              h('li', null, h('b', null, 'Reduktion explizit angeben'), ' – sonst ist der Hop nur behauptet.'))),
          UI.card('Die fünf Tricks',
            UI.table(['Trick', 'Kern'], [
              ['1 · Dictionary / Lazy Sampling', 'Ausgaben in L[·] cachen – Vorbereitung, noch keine Sicherheitsaussage'],
              ['2 · Identical until bad', 'Spiele, die sich nur nach bad unterscheiden: Adv(A) ≤ Pr[bad]'],
              ['3 · Three-Hop-Maneuver', 'mehrere F-Aufrufe (Feistel) einzeln nacheinander durch Zufall ersetzen – je eigene Reduktion'],
              ['4 · Längenanpassung', 'beim Einbetten (Fujisaki-Okamoto, Padding) Chiffratlänge C(l) mitziehen'],
              ['5 · Geburtstagsschranke', 'Pr[bad] ≤ (q über 2)·2^−κ = O(q²/2^κ)'],
            ], { wrap: false })),
          UI.callout('exam', 'Reihenfolge bei Encrypt-then-MAC', 'Erst das MAC-Argument (macht das Dec-Orakel nutzlos), dann das CPA-Argument. Umgekehrt geht es nicht: Solange Dec noch echt entschlüsselt, lässt sich die CPA-Reduktion nicht simulieren.'));
      } },
      ...PROOFS.map((p) => ({ title: '🧩 ' + p.title.split(' ')[0], render(el, ctx) {
        const first = p.hy[0], last = p.hy[p.hy.length - 1];
        let order = [0].concat(U.shuffle(p.hy.slice(1, -1).map((_, i) => i + 1))).concat([p.hy.length - 1]);
        if (p.hy.length > 3) while (order.slice(1, -1).every((v, i) => v === i + 1)) order = [0].concat(U.shuffle(p.hy.slice(1, -1).map((_, i) => i + 1))).concat([p.hy.length - 1]);
        const rel = p.links.map(() => null), why = p.links.map(() => null);
        const list = h('div'), res = h('div');
        const draw = () => {
          UI.clear(list);
          order.forEach((hi, pos) => {
            const [name, code] = p.hy[hi];
            const fixed = pos === 0 || pos === order.length - 1;
            list.append(h('div', { class: 'hop-item' }, h('div', { class: 'hop-n' }, pos + 1),
              h('div', { style: { flex: 1, minWidth: 0 } }, UI.lib(name, code)),
              fixed ? h('span', { class: 'chip' }, pos === 0 ? 'Start' : 'Ziel') : h('div', { class: 'col' },
                UI.button('↑', () => { if (pos > 1) { [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]]; draw(); } }, { sm: true, disabled: pos <= 1 }),
                UI.button('↓', () => { if (pos < order.length - 2) { [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]]; draw(); } }, { sm: true, disabled: pos >= order.length - 2 }))));
            if (pos < order.length - 1) {
              list.append(h('div', { class: 'row', style: { margin: '2px 0 2px 46px' } }, h('span', { class: 'muted' }, '↓'),
                UI.segmented([['≡', '≡'], ['≈', '≈']], rel[pos], (v) => (rel[pos] = v)),
                UI.select([['', 'Begründung wählen …']].concat(Object.entries(WHY)), why[pos] || '', (v) => (why[pos] = v || null))));
            }
          });
        };
        draw();
        el.append(UI.card(p.title, h('p', { html: '<b>Satz.</b> ' + p.thm }),
          h('p', { class: 'muted small' }, 'Ordne die Zwischenspiele (↑↓) und gib für jeden Übergang an, ob er identisch (≡) oder nur ununterscheidbar (≈) ist – und warum. Markierungen: grün = neu, gelb = geändert, rot = entfernt.'),
          list,
          h('div', { class: 'row mt' }, UI.button('Beweis prüfen', () => {
            UI.clear(res);
            const orderOk = order.every((v, i) => v === i);
            const errs = [];
            if (!orderOk) errs.push('Die Reihenfolge der Zwischenspiele stimmt noch nicht (ein Hop = eine Änderung).');
            else p.links.forEach(([r, w], i) => { if (rel[i] !== r || why[i] !== w) errs.push(`Hop ${i + 1} → ${i + 2}: ${rel[i] !== r ? `Relation sollte ${r} sein` : ''}${rel[i] !== r && why[i] !== w ? ', ' : ''}${why[i] !== w ? `Begründung: „${WHY[w]}“` : ''}`); });
            if (!errs.length) { res.append(UI.callout('success', 'Beweis vollständig ✓', `${first[0]} ≈ ${last[0]} durch Transitivität über ${p.links.length} Hops.`)); ctx.solve(p.id); }
            else res.append(UI.callout('danger', 'Noch nicht ganz', errs.join('<br>')));
          }, { kind: 'accent' })), res));
      } })),
    ],
    quiz: [
      { q: 'Was rechtfertigt den Hop „F(K,·) durch Lazy-Dictionary ersetzen“?', a: ['Die PRF-Annahme (Reduktion)', 'Rein syntaktisch', 'Die Geburtstagsschranke', 'Die Korrektheit'], c: 0, e: 'Ein Unterscheider dieses Hops wäre ein PRF-Unterscheider.' },
      { q: 'Identical-until-bad liefert …', a: ['Adv(A) ≤ Pr[bad]', 'Adv(A) = 0', 'Adv(A) ≥ Pr[bad]', 'nichts ohne Reduktion'], c: 0, e: 'Danach Pr[bad] separat abschätzen.' },
      { q: 'Warum muss bei Encrypt-then-MAC erst das MAC-Argument kommen?', a: ['Solange Dec echt entschlüsselt, lässt sich die CPA-Reduktion nicht simulieren', 'Weil MACs schneller sind', 'Weil CPA stärker ist', 'Reihenfolge ist egal'], c: 0, e: 'Der CPA-Angreifer hat kein Dec-Orakel.' },
      { q: 'Was ist der Kern des Three-Hop-Maneuvers?', a: ['Mehrere F-Aufrufe einzeln nacheinander durch Zufall ersetzen', 'Drei Runden Feistel', 'Drei Angreifer kombinieren', 'Dreimal Geburtstagsschranke'], c: 0, e: 'Jeder Hop für sich reduzierbar.' },
    ],
  });
})();
