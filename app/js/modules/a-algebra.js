/* Welt A – Algebraische Grundlagen */
(function () {
  'use strict';
  const { ui: UI, nt: NT, util: U, gf28: GF, tools: T } = KQ;
  const h = UI.h;

  // ======================================================================
  KQ.module({
    id: 'strukturen', world: 'A', title: 'Algebraische Strukturen',
    short: 'Monoid → Gruppe → Ring → Körper: Axiome selbst prüfen, Cayley-Tafeln, Nullteiler.',
    keywords: 'monoid gruppe ring körper assoziativ neutral invers kommutativ cayley',
    challenges: { classify: { title: 'Strukturen klassifizieren', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Die Hierarchie',
            h('div', { class: 'grid c4' },
              [['Monoid (M, ∘)', 'abgeschlossen, assoziativ, genau ein neutrales Element e'],
               ['Gruppe (G, ∘)', 'Monoid + jedes Element hat ein Inverses'],
               ['Ring (R, +, ·)', '(R,+) kommutative Gruppe, (R,·) Monoid, Distributivgesetz'],
               ['Körper 𝔽', 'kommutativer Ring, jedes a ≠ 0 hat mult. Inverses']].map(([t, d], i) =>
                h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, (i + 1) + '. ' + t), h('div', { class: 'small muted' }, d)))),
            h('p', { class: 'mt' }, 'Jede Stufe erbt alle Eigenschaften der vorherigen und fügt eine hinzu. ',
              h('b', null, 'Kommutativ'), ' heißt a∘b = b∘a für alle a, b.')),
          UI.card('Beispiele aus der Vorlesung',
            UI.table(['Struktur', 'Typ', 'Begründung'], [
              ['(ℤ, +)', 'kommutative Gruppe', 'neutral 0, Inverses −a'],
              ['(ℤ, ·)', 'nur Monoid', 'nur ±1 haben Inverse'],
              ['(ℕ₀, +)', 'nur Monoid', 'keine additiven Inversen'],
              ['(ℚ \\ {0}, ·)', 'kommutative Gruppe', 'Inverses 1/a'],
              ['(ℤₚ \\ {0}, ·), p prim', 'zyklische Gruppe', 'jedes a ≠ 0 hat Inverses (ggT(a,p)=1)'],
              ['(ℤ, +, ·), (ℚ, +, ·), (ℝ, +, ·)', 'kommutativer Ring (ℚ, ℝ sogar Körper)', ''],
              ['(ℕ₀, +, ·)', 'kein Ring', '(ℕ₀, +) ist keine Gruppe'],
              ['Matrizenring / Quaternionen', 'nicht-kommutativer Ring', 'AB ≠ BA im Allgemeinen'],
            ], { wrap: false })),
          UI.callout('errata', 'Hinweis zur Gesamtzusammenfassung',
            'Dort steht beim Ring „(R\\{0}, ·) ist Monoid“. Das ist zu streng: Dann wäre ℤ₆ kein Ring, weil 2·3 = 0 ∉ ℤ₆\\{0} (nicht abgeschlossen). Üblich und mit dem Rest des Skripts konsistent: <b>(R, ·) ist ein Monoid</b>.'),
          UI.callout('exam', 'Klausur-Tipp', 'Bei „Ist X eine Gruppe?“ immer alle Axiome einzeln prüfen: Abgeschlossenheit (wird gern vergessen!), Assoziativität, neutrales Element, Inverse – und ggf. Kommutativität.'));
      } },
      { title: 'Labor: Struktur-Prüfer', render(el) {
        let n = 8, op = 'mul', noZero = true;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const els = [];
          for (let a = 0; a < n; a++) if (!(op === 'mul' && noZero && a === 0)) els.push(a);
          const f = (a, b) => (op === 'add' ? (a + b) % n : (a * b) % n);
          const set = new Set(els);
          let closed = true; const notClosed = [];
          els.forEach((a) => els.forEach((b) => { if (!set.has(f(a, b))) { closed = false; if (notClosed.length < 3) notClosed.push(`${a}·${b} = ${f(a, b)}`); } }));
          const e = els.find((x) => els.every((a) => f(a, x) === a && f(x, a) === a));
          const noInv = e === undefined ? els : els.filter((a) => !els.some((b) => f(a, b) === e));
          const kind = !closed ? 'keine algebraische Struktur auf dieser Menge (nicht abgeschlossen)'
            : e === undefined ? 'Halbgruppe (kein neutrales Element)'
            : noInv.length ? 'Monoid (nicht jedes Element invertierbar)' : 'kommutative Gruppe';
          const sym = op === 'add' ? '+' : '·';
          out.append(h('div', { class: 'row mt' },
            UI.status(closed, 'abgeschlossen'), UI.status(true, 'assoziativ'), UI.status(e !== undefined, 'neutrales Element' + (e !== undefined ? ' e = ' + e : '')),
            UI.status(closed && e !== undefined && !noInv.length, 'alle invertierbar'), UI.status(true, 'kommutativ')),
            h('p', { class: 'mt' }, h('b', null, `(ℤ${n}${op === 'mul' && noZero ? ' \\ {0}' : ''}, ${sym}) ist: `), kind),
            notClosed.length ? h('p', { class: 'bad-text' }, 'Gegenbeispiel Abgeschlossenheit: ' + notClosed.join(', ') + ' (Nullteiler!)') : null,
            noInv.length && closed && e !== undefined ? h('p', { class: 'muted' }, 'Ohne Inverses: ' + noInv.join(', ') + ' – genau die a mit ggT(a, n) > 1.') : null);
          // Cayley-Tafel
          const tbl = h('table', { class: 'tbl mono', style: { width: 'auto' } });
          tbl.append(h('tr', null, h('th', null, sym), els.map((b) => h('th', { class: 'num' }, b))));
          els.forEach((a) => tbl.append(h('tr', null, h('th', null, a), els.map((b) => {
            const v = f(a, b);
            const st = {};
            if (!set.has(v)) { st.background = 'var(--danger-bg)'; st.color = 'var(--danger)'; st.fontWeight = '700'; }
            else if (v === e) { st.background = 'var(--success-bg)'; }
            return h('td', { class: 'num', style: st }, v);
          }))));
          out.append(h('div', { class: 'tbl-wrap', style: { display: 'inline-block', maxWidth: '100%' } }, tbl),
            h('p', { class: 'small muted' }, 'Grün: Ergebnis = neutrales Element (zeigt Inverse). Rot: Ergebnis liegt nicht in der Menge.'));
        };
        el.append(UI.card('Wähle eine Struktur',
          h('div', { class: 'row' }, UI.slider({ label: 'n =', min: 2, max: 16, value: n, oninput: (v) => { n = v; draw(); } }),
            UI.segmented([['add', 'Addition +'], ['mul', 'Multiplikation ·']], op, (v) => { op = v; draw(); }),
            UI.toggle('0 ausschließen (bei ·)', noZero, (v) => { noZero = v; draw(); })),
          out));
        draw();
      } },
      { title: 'Challenge', render(el, ctx) {
        const pool = [
          ['(ℤ, +)', 'Gruppe'], ['(ℤ, ·)', 'Monoid'], ['(ℕ₀, +)', 'Monoid'], ['(ℚ \\ {0}, ·)', 'Gruppe'],
          ['(ℤ₇ \\ {0}, ·)', 'Gruppe'], ['(ℤ₈ \\ {0}, ·)', 'nichts davon'], ['(ℤ₁₂, +)', 'Gruppe'], ['(ℤ, +, ·)', 'Ring (kein Körper)'],
          ['(ℤ₇, +, ·)', 'Körper'], ['(ℤ₆, +, ·)', 'Ring (kein Körper)'], ['(ℕ₀, +, ·)', 'nichts davon'], ['(ℚ, +, ·)', 'Körper'],
          ['(ℤ₁₅*, ·)', 'Gruppe'], ['(ℤ₂[x]/(x²+x+1), +, ·)', 'Körper'], ['(ℤ₉ \\ {0}, ·)', 'nichts davon'],
        ];
        const opts = ['nichts davon', 'Monoid', 'Gruppe', 'Ring (kein Körper)', 'Körper'];
        const items = U.shuffle(pool).slice(0, 6);
        const answers = {};
        const res = h('div');
        el.append(UI.card('Klassifiziere alle sechs Strukturen',
          h('p', { class: 'muted' }, 'Wähle jeweils die „höchste“ zutreffende Stufe. Gruppe meint hier: mindestens Gruppe bzgl. der einen Verknüpfung.'),
          h('div', { class: 'col' }, items.map(([s], i) => h('div', { class: 'row' }, h('span', { class: 'math', style: { width: '240px' } }, s),
            UI.segmented(opts, null, (v) => (answers[i] = v))))),
          h('div', { class: 'row mt' }, UI.button('Auswerten', () => {
            const wrong = items.filter(([, a], i) => answers[i] !== a);
            UI.clear(res);
            if (!wrong.length) { res.append(UI.callout('success', 'Alle Zuordnungen korrekt', 'Du kennst die Hierarchie.')); ctx.solve('classify'); }
            else res.append(UI.callout('danger', `${wrong.length} falsch`, wrong.map(([s, a]) => `${s}: <b>${a}</b>`).join('<br>') + '<br>Tipp: ℤ₈\\{0} und ℤ₉\\{0} sind nicht abgeschlossen (2·4 ≡ 0, 3·3 ≡ 0). ℤ₁₅* sind nur die primen Restklassen – die bilden immer eine Gruppe.'));
          }, { kind: 'accent' }), UI.button('Neue Aufgaben', () => ctx.goTab(2))), res));
      } },
    ],
    quiz: [
      { q: 'Welche Eigenschaft unterscheidet eine Gruppe von einem Monoid?', a: ['Jedes Element hat ein Inverses', 'Kommutativität', 'Assoziativität', 'Es gibt ein neutrales Element'], c: 0, e: 'Monoid: assoziativ + neutrales Element. Gruppe: zusätzlich Inverse.' },
      { q: 'Warum ist (ℕ₀, +, ·) kein Ring?', a: ['(ℕ₀, +) hat keine additiven Inversen', 'Die Multiplikation ist nicht assoziativ', 'Es fehlt das Distributivgesetz', 'ℕ₀ ist unendlich'], c: 0, e: 'Für einen Ring muss (R,+) eine kommutative Gruppe sein. −3 ∉ ℕ₀.' },
      { q: 'Wann ist (ℤₙ, +, ·) ein Körper?', a: ['Genau dann, wenn n prim ist', 'Für alle n ≥ 2', 'Wenn n ungerade ist', 'Wenn n eine Zweierpotenz ist'], c: 0, e: 'Nur für n prim hat jedes a ≠ 0 ein multiplikatives Inverses. Für n = 2⁸ braucht man stattdessen 𝔽₂[x]/(f).' },
      { q: 'Ist (ℤ₁₅*, ·) zyklisch?', a: ['Nein', 'Ja, Erzeuger 2', 'Ja, Erzeuger 7', 'Ja, jede endliche Gruppe ist zyklisch'], c: 0, e: 'ℤ₁₅* hat Ordnung φ(15) = 8, aber kein Element der Ordnung 8 (maximal 4). Laut Skript: ℤ*₁₅ ist nicht zyklisch.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'restklassen', world: 'A', title: 'Restklassen, ℤₙ* & φ(n)',
    short: 'Nullteiler, prime Restklassen, Eulersche φ-Funktion – visuell für jedes n.',
    keywords: 'modulo restklasse nullteiler phi euler prime restklassen inverses',
    challenges: { phi: { title: '3× φ(n) berechnen', xp: 40 }, zerodiv: { title: 'Nullteiler finden', xp: 25 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Restklassen',
            h('p', null, h('span', { class: 'math' }, 'a ≡ b (mod n)  ⟺  n | (b − a)'), '. ℤₙ ist die Menge der Restklassen {0, 1, …, n−1}. (ℤₙ, +) ist immer eine zyklische Gruppe, (ℤₙ \\ {0}, ·) dagegen nur für n prim.')),
          UI.card('Zwei Lemmata, die du ständig brauchst',
            h('ul', { class: 'tight' },
              h('li', { html: '<b>Nullteiler:</b> a hat genau dann einen Nullteiler mod n, wenn ggT(a, n) > 1. Beispiel: 7 · 5 = 35 ≡ 0 (mod 35).' }),
              h('li', { html: '<b>Inverses:</b> a ist genau dann mod n invertierbar, wenn ggT(a, n) = 1. Diese a bilden die Gruppe ℤₙ* mit |ℤₙ*| = φ(n).' }))),
          UI.card('Eulersche φ-Funktion',
            UI.formula('φ(n) = |{ a : 1 ≤ a ≤ n, ggT(a, n) = 1 }| = n · ∏<sub>p | n</sub> (1 − 1/p)'),
            h('p', null, 'Für quadratfreie n = p₁·p₂·… gilt φ(n) = ∏(pᵢ − 1). Beispiel: φ(15) = 2 · 4 = 8. Für Primzahlpotenzen: φ(pᵏ) = pᵏ − pᵏ⁻¹.'),
            UI.callout('exam', 'Wofür?', 'RSA: φ(n) = (p−1)(q−1) und e·d ≡ 1 (mod φ(n)). Euler: a^φ(n) ≡ 1 (mod n) für ggT(a,n)=1.')));
      } },
      { title: 'Labor', render(el) {
        let n = 35, sel = 7;
        const grid = h('div', { class: 'mt' }), info = h('div', { class: 'mt' }), phiBox = h('div');
        const draw = () => {
          UI.clear(grid); UI.clear(info); UI.clear(phiBox);
          const vals = Array.from({ length: n }, (_, i) => i);
          grid.append(UI.bytes(vals, {
            cols: Math.min(n, 12), wide: false, fmt: (b) => String(b),
            cls: (i) => (i === sel ? 'hi' : i === 0 ? 'const' : NT.gcdN(i, n) === 1 ? 'ok' : 'diff'),
            onclick: (i) => { sel = i; draw(); },
          }));
          const g = NT.gcdN(sel, n);
          const inv = NT.invN(sel, n);
          const zd = [];
          for (let b = 1; b < n && zd.length < 6; b++) if ((sel * b) % n === 0) zd.push(b);
          info.append(UI.kv([
            ['gewählt', `a = ${sel}`], ['ggT(a, n)', String(g)],
            ['Inverses', inv === null ? '— (ggT > 1)' : `${inv}, denn ${sel}·${inv} = ${sel * inv} ≡ 1`],
            ['Nullteiler-Partner', sel === 0 ? '0 ist trivial' : zd.length ? zd.map((b) => `${sel}·${b} = ${sel * b} ≡ 0`).join(', ') : 'keine'],
          ]));
          const fac = NT.factorize(n);
          const ph = NT.phiN(n);
          phiBox.append(h('p', null, `n = ${n} = `, fac.map(({ p, e }) => (e > 1 ? `${p}^${e}` : `${p}`)).join(' · '),
            ` ⇒ φ(${n}) = ${n} · `, fac.map(({ p }) => `(1 − 1/${p})`).join(' · '), ` = `, h('b', null, String(ph)),
            h('span', { class: 'muted' }, ` (grüne Felder zählen: ${vals.filter((a) => a && NT.gcdN(a, n) === 1).length})`)));
        };
        el.append(UI.card('ℤₙ als Raster – klicke ein Element',
          UI.slider({ label: 'n =', min: 2, max: 72, value: n, oninput: (v) => { n = v; sel = Math.min(sel, n - 1); draw(); } }),
          h('div', { class: 'row small mt' }, UI.chip('grün: invertierbar (ℤₙ*)', 'ok'), UI.chip('rot: Nullteiler'), UI.chip('blau: ausgewählt', 'accent')),
          grid, info, phiBox));
        draw();
      } },
      { title: 'Challenges', render(el, ctx) {
        // φ-Challenge
        const cands = [21, 33, 35, 39, 45, 51, 55, 63, 65, 77, 84, 91, 98, 100, 105, 119, 143];
        let tasks = U.shuffle(cands).slice(0, 3), streak = 0;
        const phiArea = h('div');
        const drawPhi = () => {
          UI.clear(phiArea);
          if (streak >= 3) { phiArea.append(UI.callout('success', 'Geschafft', 'Drei φ-Werte korrekt.')); return; }
          const n = tasks[streak];
          phiArea.append(h('p', null, `Aufgabe ${streak + 1}/3: Berechne `, h('b', { class: 'math' }, `φ(${n})`)),
            T.answer('φ =', (v) => {
              if (+v === NT.phiN(n)) { streak++; setTimeout(() => { if (streak >= 3) ctx.solve('phi'); drawPhi(); }, 600); return true; }
              return 'Tipp: erst faktorisieren, dann n·∏(1−1/p)';
            }));
        };
        drawPhi();
        // Nullteiler
        const pairs = [[35, 7], [36, 8], [91, 13], [45, 6], [221, 13], [77, 11]];
        const [n2, a2] = U.pick(pairs);
        el.append(UI.card('Challenge 1 · φ(n) im Kopf', phiArea),
          UI.card('Challenge 2 · Nullteiler',
            h('p', null, `Finde ein b mit 0 < b < ${n2}, sodass `, h('b', { class: 'math' }, `${a2} · b ≡ 0 (mod ${n2})`), '.'),
            T.answer('b =', (v) => {
              const b = +v;
              if (!(b > 0 && b < n2)) return `0 < b < ${n2}`;
              if ((a2 * b) % n2 === 0) { ctx.solve('zerodiv'); return true; }
              return `${a2}·${b} = ${a2 * b} ≡ ${(a2 * b) % n2}`;
            })));
      } },
    ],
    quiz: [
      { q: 'Wie viele Elemente hat ℤ₂₁*?', a: ['12', '20', '14', '7'], c: 0, e: 'φ(21) = φ(3)·φ(7) = 2·6 = 12.' },
      { q: 'Welches a hat mod 35 KEIN multiplikatives Inverses?', a: ['14', '12', '9', '2'], c: 0, e: 'ggT(14, 35) = 7 > 1, also Nullteiler (14·5 = 70 ≡ 0).' },
      { q: 'Für RSA mit n = p·q gilt φ(n) =', a: ['(p−1)(q−1)', 'pq − 1', '(p+1)(q+1)', 'p + q − 1'], c: 0, e: 'φ ist multiplikativ für teilerfremde Faktoren, φ(p) = p−1.' },
      { q: 'Wann besitzt a einen Nullteiler modulo n?', a: ['Wenn ggT(a, n) > 1', 'Wenn a gerade ist', 'Wenn n prim ist', 'Nie für a < n'], c: 0, e: 'Lemma aus Teil A.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'euklid', world: 'A', title: 'Euklid & erweiterter Euklid',
    short: 'ggT, Bézout-Koeffizienten und modulare Inverse – mit Rechentabelle und Timing-Seitenkanal.',
    keywords: 'euklid ggt bezout inverses modular erweitert eucleak seitenkanal',
    challenges: { bezout: { title: 'Bézout-Darstellung finden', xp: 40 }, inverse: { title: 'RSA-d berechnen', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Algorithmus',
            h('pre', { class: 'code' }, 'Euklid(x, y):\n  while y > 0:\n    (x, y) ← (y, x mod y)\n  return x'),
            h('p', null, 'Der ', h('b', null, 'erweiterte Euklid'), ' führt zusätzlich Koeffizienten mit, sodass am Ende gilt:'),
            UI.formula('ggT(x, y) = a·x + b·y   (Lemma von Bézout)'),
            h('p', null, 'Ist ggT(x, y) = 1, dann ist ', h('b', null, 'a ≡ x⁻¹ (mod y)'), ' und b ≡ y⁻¹ (mod x). Genau so bestimmt man den RSA-Exponenten d = e⁻¹ mod φ(n).')),
          UI.card('Tabellenform (wie in der Klausur)',
            h('p', null, 'Zeilen rᵢ, sᵢ, tᵢ mit rᵢ = sᵢ·x + tᵢ·y. Start: (x, 1, 0) und (y, 0, 1). Dann qᵢ = ⌊rᵢ₋₁ / rᵢ⌋ und jede Spalte: neu = vorletzte − q · letzte.'),
            h('p', { class: 'muted' }, 'Beispiel aus dem Skript: 576 = 115·5 + 1 ⇒ 1 = 576 − 115·5 ⇒ 5⁻¹ ≡ −115 ≡ 461 (mod 576).')),
          UI.callout('warning', 'Seitenkanal: nicht konstante Zeit', 'Die Anzahl der Schleifendurchläufe hängt von den Eingaben ab. Wer die Laufzeit misst, lernt etwas über geheime Werte. Genau das wurde 2024 beim Infineon-ECDSA-Angriff („EUCLEAK“) ausgenutzt – im Labor siehst du, wie stark die Iterationszahl schwankt.'));
      } },
      { title: 'Labor', render(el) {
        const X = UI.input({ value: '576', mono: true, w: 'm' }), Y = UI.input({ value: '5', mono: true, w: 'm' });
        const out = h('div');
        const run = () => {
          UI.clear(out);
          let x, y;
          try { x = T.parseBig(X.value); y = T.parseBig(Y.value); } catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); return; }
          if (x <= 0n || y <= 0n) { out.append(UI.callout('danger', 'Eingabe', 'Bitte positive Zahlen.')); return; }
          const st = NT.euclidSteps(x, y);
          const ex = NT.egcd(x, y);
          out.append(h('h4', null, 'Euklid (Division mit Rest)'),
            UI.table(['x', '=', 'q', '· y', '+ r'], st.steps.map((s) => [s.x, '=', s.q, '· ' + s.y, '+ ' + s.r]), { mono: true, maxHeight: '260px' }),
            h('h4', null, 'Erweiterter Euklid (rᵢ = sᵢ·x + tᵢ·y)'),
            UI.table(['i', 'rᵢ', 'sᵢ', 'tᵢ', 'qᵢ'], ex.rows.map((r, i) => [i, r.r, r.s, r.t, r.q === null ? '' : r.q]), { mono: true, maxHeight: '260px' }),
            UI.callout('success', `ggT = ${ex.g} · ${st.steps.length} Iterationen`,
              `${ex.a}·${x} + ${ex.b}·${y} = ${ex.a * x + ex.b * y}` +
              (ex.g === 1n ? `<br>⇒ ${y}⁻¹ mod ${x} = <b>${NT.mod(ex.b, x)}</b>  ·  ${x}⁻¹ mod ${y} = <b>${NT.mod(ex.a, y)}</b>` : '<br>ggT ≠ 1 ⇒ keine Inversen.')));
        };
        [X, Y].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && run()));
        // Timing-Diagramm
        const tx = 1000;
        const pts = [];
        for (let yy = 1; yy < 400; yy++) pts.push([yy, NT.euclidSteps(BigInt(tx), BigInt(yy)).steps.length]);
        el.append(UI.card('Rechner', h('div', { class: 'row' }, UI.field('x', X), UI.field('y', Y), UI.button('Berechnen', run, { kind: 'accent' })), out),
          UI.card('Seitenkanal sichtbar gemacht: Iterationen für ggT(1000, y)',
            UI.chart({ series: [{ points: pts, color: UI.css('--accent'), width: 1.2 }], ymin: 0, xlabel: 'y', height: 200 }),
            h('p', { class: 'small muted' }, 'Die Laufzeit (∝ Iterationen) verrät Information über die Eingabe. Konstante-Zeit-Implementierungen laufen immer gleich viele Runden (z. B. binärer GCD mit fester Rundenzahl oder Inversion per Fermat a^(p−2)).')));
        run();
      } },
      { title: 'Challenges', render(el, ctx) {
        let x = U.randInt(200, 999), y = U.randInt(100, x - 1);
        const g = Number(NT.gcd(x, y));
        const A = UI.input({ placeholder: 'a', mono: true, w: 's' }), B = UI.input({ placeholder: 'b', mono: true, w: 's' }), G = UI.input({ placeholder: 'ggT', mono: true, w: 's' });
        const r1 = h('div');
        const phis = [[5, 576], [7, 3120], [17, 3220], [3, 3280], [11, 6000], [13, 2436]];
        const [e, ph] = U.pick(phis);
        el.append(UI.card('Challenge 1 · Bézout',
          h('p', null, 'Finde ganze Zahlen a, b mit ', h('b', { class: 'math' }, `a · ${x} + b · ${y} = ggT(${x}, ${y})`), '. (Jede gültige Lösung zählt.)'),
          h('div', { class: 'row' }, UI.field('ggT', G), UI.field('a', A), UI.field('b', B),
            UI.button('Prüfen', () => {
              UI.clear(r1);
              try {
                const a = T.parseBig(A.value), b = T.parseBig(B.value), gg = T.parseBig(G.value);
                if (gg !== BigInt(g)) { r1.append(UI.status(false, 'ggT stimmt nicht')); return; }
                if (a * BigInt(x) + b * BigInt(y) === BigInt(g)) { r1.append(UI.status(true, `${a}·${x} + ${b}·${y} = ${g}`)); ctx.solve('bezout'); }
                else r1.append(UI.status(false, `${a}·${x} + ${b}·${y} = ${a * BigInt(x) + b * BigInt(y)} ≠ ${g}`));
              } catch (err) { r1.append(UI.status(false, err.message)); }
            }, { kind: 'accent' })), r1),
          UI.card('Challenge 2 · Privater RSA-Exponent',
            h('p', null, `Gegeben e = ${e} und φ(n) = ${ph}. Berechne d = e⁻¹ mod φ(n) (0 < d < φ(n)).`),
            T.answer('d =', (v) => {
              const d = T.parseBig(v);
              if (d <= 0n || d >= BigInt(ph)) return 'd muss in (0, φ(n)) liegen';
              if (NT.mod(d * BigInt(e), ph) === 1n) { ctx.solve('inverse'); return true; }
              return `${e}·${d} mod ${ph} = ${NT.mod(d * BigInt(e), ph)} ≠ 1`;
            }),
            h('p', { class: 'small muted' }, 'Rechenweg wie im Labor-Tab (erweiterter Euklid).')));
      } },
    ],
    quiz: [
      { q: 'Was liefert der erweiterte Euklid zusätzlich zum ggT?', a: ['Koeffizienten a, b mit ax + by = ggT(x,y)', 'Die Primfaktorzerlegung', 'φ(x·y)', 'Das kgV'], c: 0, e: 'Bézout-Darstellung – daraus folgt direkt das modulare Inverse.' },
      { q: '5⁻¹ mod 576 ist', a: ['461', '115', '−5', '576/5'], c: 0, e: '5·461 = 2305 = 4·576 + 1.' },
      { q: 'Warum ist eine naive Euklid-Implementierung ein Sicherheitsrisiko?', a: ['Laufzeit hängt von den (geheimen) Eingaben ab', 'Sie liefert manchmal falsche Ergebnisse', 'Sie benötigt Zufall', 'Sie ist zu langsam für RSA'], c: 0, e: 'Timing-Seitenkanal, real ausgenutzt bei EUCLEAK (2024).' },
    ],
  });

  // ======================================================================
  const svgCycle = (p, g) => {
    const n = p - 1, R = 150, cx = 180, cy = 180;
    const pos = (v) => { const ang = ((v - 1) / n) * 2 * Math.PI - Math.PI / 2; return [cx + R * Math.cos(ang), cy + R * Math.sin(ang)]; };
    const orbit = [];
    let x = 1;
    do { orbit.push(x); x = (x * g) % p; } while (x !== 1 && orbit.length <= n);
    const inOrbit = new Set(orbit);
    let s = `<svg viewBox="0 0 360 360" width="360" height="360" style="max-width:100%">`;
    for (let i = 0; i < orbit.length; i++) {
      const [x1, y1] = pos(orbit[i]), [x2, y2] = pos(orbit[(i + 1) % orbit.length]);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--accent)" stroke-width="1.6" opacity="0.75"/>`;
    }
    for (let v = 1; v <= n; v++) {
      const [px, py] = pos(v);
      const on = inOrbit.has(v);
      s += `<circle cx="${px}" cy="${py}" r="${n > 40 ? 6 : 10}" fill="${on ? 'var(--accent)' : 'var(--card)'}" stroke="var(--stroke-strong)"/>`;
      if (n <= 40) s += `<text x="${px}" y="${py + 4}" text-anchor="middle" font-size="10" style="fill:${on ? 'var(--on-accent)' : 'var(--text)'}">${v}</text>`;
    }
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="14" font-weight="600">⟨${g}⟩</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" class="t2">Ordnung ${orbit.length}</text></svg>`;
    return { svg: UI.html(s), orbit };
  };

  KQ.module({
    id: 'zyklisch', world: 'A', title: 'Zyklische Gruppen & Erzeuger',
    short: 'Potenzen gᶦ mod p als Kreis, Ordnungen, Lagrange und der Erzeuger-Test.',
    keywords: 'zyklisch erzeuger generator ordnung lagrange untergruppe primitivwurzel',
    challenges: { gen: { title: 'Erzeuger finden', xp: 40 }, order: { title: 'Ordnung bestimmen', xp: 30 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Zyklische Gruppe',
            h('p', null, '(G, ∘) heißt zyklisch, wenn es einen ', h('b', null, 'Erzeuger'), ' g gibt, dessen Potenzen g, g², g³, … alle Elemente durchlaufen. Beispiele: 1 erzeugt (ℤ₄, +); 3 erzeugt (ℤ₇*, ·); ℤ₁₅* ist nicht zyklisch.'),
            h('p', null, h('b', null, 'Ordnung'), ' ord(g) = kleinstes k > 0 mit gᵏ = 1.')),
          UI.card('Satz von Lagrange & Folgerungen',
            UI.formula('ord(g)  teilt  |G|      ⇒   g<sup>|G|</sup> = 1'),
            h('ul', { class: 'tight' },
              h('li', null, 'Mögliche Untergruppenordnungen sind genau die Teiler von |G|. In zyklischen Gruppen gibt es zu jedem Teiler d genau eine Untergruppe – mit φ(d) Erzeugern.'),
              h('li', null, 'Erzeuger-Test in ℤₚ*: g erzeugt ⟺ g^((p−1)/q) ≠ 1 für jeden Primteiler q von p−1.'))),
          UI.card('Rechenbeispiel aus der Vorlesung: p = 23 (Safe Prime, 23 = 2·11 + 1)',
            h('p', null, '|ℤ₂₃*| = 22 = 2·11 ⇒ Untergruppenordnungen {1, 2, 11, 22}. Test g = 5: 5¹¹ mod 23 = 22 ≠ 1 und 5² mod 23 = 2 ≠ 1 ⇒ 5 erzeugt ganz ℤ₂₃*. Die quadratischen Reste bilden die Untergruppe der Ordnung 11, erzeugt von 5² = 2.')),
          UI.callout('exam', 'Wozu?', 'DH, ElGamal und Schnorr rechnen in einer zyklischen Gruppe mit Erzeuger g. Kleine Untergruppen sind gefährlich (Pohlig-Hellman) – deshalb Safe Primes und die QR-Untergruppe primer Ordnung (Welt K).'));
      } },
      { title: 'Labor', render(el) {
        const primes = NT.primesUpTo(110).filter((p) => p > 5);
        let p = 23, g = 5;
        const viz = h('div'), side = h('div');
        const draw = () => {
          UI.clear(viz); UI.clear(side);
          g = Math.min(Math.max(2, g), p - 1);
          const { svg, orbit } = svgCycle(p, g);
          viz.append(svg);
          const gt = NT.generatorTest(g, p);
          const byOrd = {};
          for (let a = 1; a < p; a++) { const o = NT.orderN(a, p); (byOrd[o] = byOrd[o] || []).push(a); }
          side.append(
            h('p', null, h('b', null, `⟨${g}⟩ = {`), orbit.join(', '), h('b', null, '}')),
            h('h4', null, 'Erzeuger-Test'),
            UI.table(['Primteiler q von p−1', `g^((p−1)/q) mod ${p}`, ''], gt.tests.map((t) => [String(t.q), `${g}^${t.exp} = ${t.val}`, t.val === 1n ? '<span class="bad-text">= 1</span>' : '<span class="ok-text">≠ 1</span>']), { wrap: false }),
            h('p', null, gt.isGenerator ? h('span', { class: 'ok-text' }, `✓ ${g} ist Erzeuger von ℤ${p}*`) : h('span', { class: 'bad-text' }, `✗ ${g} erzeugt nur eine Untergruppe der Ordnung ${orbit.length}`)),
            h('h4', null, 'Elemente nach Ordnung'),
            UI.table(['Ordnung d', 'Anzahl (= φ(d))', 'Elemente'], Object.keys(byOrd).map(Number).sort((a, b) => a - b).map((d) => [d, byOrd[d].length + ` (φ(${d}) = ${NT.phiN(d)})`, byOrd[d].join(', ')]), { wrap: false }));
        };
        const gs = UI.slider({ label: 'g =', min: 2, max: 108, value: g, oninput: (v) => { g = v; draw(); } });
        el.append(UI.card('Potenzkreis in ℤₚ*',
          h('div', { class: 'row' }, h('span', null, 'p ='), UI.select(primes, p, (v) => { p = +v; gs.input.max = p - 1; if (g >= p) { g = 2; gs.set(2); } draw(); }), gs),
          h('div', { class: 'grid c2 mt' }, viz, side)));
        draw();
      } },
      { title: 'Challenges', render(el, ctx) {
        const sp = U.pick([23, 47, 59, 83, 107]);
        const p2 = U.pick([23, 29, 31, 37, 41, 43]);
        let a2 = U.randInt(2, p2 - 2);
        el.append(UI.card(`Challenge 1 · Finde einen Erzeuger von ℤ${sp}*`,
          h('p', null, `${sp} − 1 = ${sp - 1} = `, NT.factorize(sp - 1).map(({ p, e }) => (e > 1 ? `${p}^${e}` : p)).join(' · '), '. Nutze den Erzeuger-Test (z. B. mit dem Taschenrechner).'),
          T.answer('g =', (v) => {
            const g = +v;
            if (!(g > 1 && g < sp)) return `1 < g < ${sp}`;
            const t = NT.generatorTest(g, sp);
            if (t.isGenerator) { ctx.solve('gen'); return true; }
            const f = t.tests.find((x) => x.val === 1n);
            return `${g}^${f.exp} ≡ 1 – Ordnung teilt ${f.exp}`;
          }), h('div', { class: 'mt' }, T.calculator())),
          UI.card('Challenge 2 · Ordnung',
            h('p', null, 'Welche Ordnung hat ', h('b', { class: 'math' }, `${a2}`), ` in ℤ${p2}*?`),
            T.answer('ord =', (v) => {
              const o = NT.orderN(a2, p2);
              if (+v === o) { ctx.solve('order'); return true; }
              if ((p2 - 1) % +v !== 0) return `Lagrange: die Ordnung muss ${p2 - 1} teilen`;
              return 'leider nicht';
            })));
      } },
    ],
    quiz: [
      { q: 'Welche Ordnungen können Elemente in ℤ₂₃* haben?', a: ['1, 2, 11, 22', '1 bis 22', 'nur 22', '1, 11, 23'], c: 0, e: 'Lagrange: Teiler von |ℤ₂₃*| = 22.' },
      { q: 'Wie viele Erzeuger hat ℤₚ* (p prim)?', a: ['φ(p−1)', 'p−1', '1', 'φ(p)'], c: 0, e: 'Eine zyklische Gruppe der Ordnung n hat φ(n) Erzeuger, hier n = p−1.' },
      { q: 'g ist Erzeuger von ℤₚ* genau dann, wenn …', a: ['g^((p−1)/q) ≠ 1 für alle Primteiler q von p−1', 'g^(p−1) = 1', 'g prim ist', 'ggT(g, p) = 1'], c: 0, e: 'g^(p−1) = 1 gilt für jedes g (Fermat) – das ist kein Test.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'sqm', world: 'A', title: 'Square-and-Multiply & Fermat',
    short: 'Schnelles Potenzieren, kleiner Satz von Fermat, Euler – und warum das Bitmuster leaken kann.',
    keywords: 'square multiply potenzieren fermat euler inverses exponent',
    challenges: { manual: { title: 'Potenz von Hand', xp: 40 }, fermat: { title: 'Inverses per Fermat', xp: 30 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Kleiner Satz von Fermat & Euler',
            UI.formula('a<sup>p</sup> ≡ a (mod p)      ⇒      a<sup>p−1</sup> ≡ 1  und  a<sup>p−2</sup> ≡ a<sup>−1</sup> (mod p),  a ∈ ℤₚ*'),
            UI.formula('Euler:  a<sup>φ(n)</sup> ≡ 1 (mod n)  für ggT(a, n) = 1'),
            h('p', null, 'Damit lässt sich das Inverse mit einer einzigen Potenzierung berechnen – in konstanter Zeit, im Gegensatz zum Euklid.')),
          UI.callout('errata', 'Achtung, Fehler in der Gesamtzusammenfassung',
            'Dort steht für Körpererweiterungen „a^(p−2) ≡ a⁻¹ mod f(x)“. Richtig ist: In 𝔽<sub>q</sub> mit q = pⁿ hat die multiplikative Gruppe die Ordnung q − 1, also <b>a⁻¹ = a^(q−2)</b>. Für AES (𝔽₂⁸) heißt das a⁻¹ = a²⁵⁴ – nicht a^(2−2) = 1.'),
          UI.card('Square-and-Multiply (links → rechts)',
            h('pre', { class: 'code' }, 'r ← 1\nfür jedes Bit eᵢ von e (höchstes zuerst):\n  r ← r² mod n          (Q = quadrieren)\n  wenn eᵢ = 1: r ← r·a mod n   (M = multiplizieren)\nreturn r'),
            h('p', null, 'Aufwand: ⌊log₂ e⌋ + 1 Quadrierungen und (Anzahl Einsen) Multiplikationen – statt e − 1 Multiplikationen. Für 2048-Bit-RSA: ~3000 statt 2²⁰⁴⁸ Operationen.'),
            UI.callout('warning', 'Seitenkanal', 'Die Folge Q, QM, Q, QM … verrät das Bitmuster des (geheimen!) Exponenten, wenn man Strom oder Zeit misst (Simple Power Analysis). Abhilfe: Montgomery-Leiter, konstante Operationen.')));
      } },
      { title: 'Labor', render(el) {
        const Bi = UI.input({ value: '7', mono: true, w: 'm' }), Ei = UI.input({ value: '560', mono: true, w: 'm' }), Ni = UI.input({ value: '561', mono: true, w: 'm' });
        const out = h('div');
        const run = () => {
          UI.clear(out);
          try {
            const tr = NT.sqmTrace(T.parseBig(Bi.value), T.parseBig(Ei.value), T.parseBig(Ni.value));
            const nQ = tr.steps.filter((s) => s.op === 'Q').length, nM = tr.steps.length - nQ;
            out.append(h('p', null, `Exponent binär: `, h('code', null, tr.bits), ` → Muster: `, h('code', null, tr.steps.map((s) => s.op).join(''))),
              UI.table(['Bit', 'Op', 'vorher', 'nachher'], tr.steps.map((s) => [s.bit, s.op === 'Q' ? 'Quadrieren' : '× Basis', U.fmtBig(s.before), U.fmtBig(s.after)]), { mono: true, maxHeight: '320px' }),
              UI.callout('success', `Ergebnis: ${U.fmtBig(tr.result)}`, `${nQ} Quadrierungen + ${nM} Multiplikationen = ${nQ + nM} Operationen (naiv: ${U.fmtBig(T.parseBig(Ei.value) - 1n)}).`));
          } catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); }
        };
        el.append(UI.card('aᵉ mod n Schritt für Schritt', h('div', { class: 'row' }, UI.field('Basis a', Bi), UI.field('Exponent e', Ei), UI.field('Modul n', Ni), UI.button('Rechnen', run, { kind: 'accent' })), out,
          h('p', { class: 'small muted' }, 'Voreinstellung: 7⁵⁶⁰ mod 561 = 1, obwohl 561 = 3·11·17 keine Primzahl ist (Carmichael-Zahl) – der Fermat-Test allein ist kein Primtest.')));
        run();
      } },
      { title: 'Challenges', render(el, ctx) {
        const b = U.randInt(2, 9), e = U.randInt(11, 40), n = U.pick([17, 19, 23, 29, 31, 37, 41, 43, 47]);
        const tr = NT.sqmTrace(BigInt(b), BigInt(e), BigInt(n));
        const area = h('div');
        let k = 0;
        const draw = () => {
          UI.clear(area);
          area.append(h('p', null, 'Exponent binär: ', h('code', null, tr.bits), '. Starte mit r = 1. Gib nach jedem Schritt den neuen Wert von r an.'));
          area.append(UI.table(['#', 'Bit', 'Operation', 'r'], tr.steps.slice(0, k).map((s, i) => [i + 1, s.bit, s.op === 'Q' ? 'r² mod ' + n : `r·${b} mod ${n}`, String(s.after)]), { mono: true, wrap: false }));
          if (k < tr.steps.length) {
            const s = tr.steps[k];
            area.append(T.answer(`Schritt ${k + 1}: ${s.op === 'Q' ? `r = ${s.before}² mod ${n}` : `r = ${s.before}·${b} mod ${n}`} =`, (v) => {
              if (BigInt(v || -1) === s.after) { k++; setTimeout(draw, 350); return true; }
              return 'nochmal rechnen';
            }));
          } else { area.append(UI.callout('success', `${b}^${e} mod ${n} = ${tr.result}`, 'Alle Schritte korrekt.')); ctx.solve('manual'); }
        };
        draw();
        const p = U.pick([97, 101, 103, 107, 109, 113]), a = U.randInt(3, p - 2);
        el.append(UI.card(`Challenge 1 · Berechne ${b}^${e} mod ${n} mit Square-and-Multiply`, area),
          UI.card('Challenge 2 · Inverses per Fermat',
            h('p', null, `Berechne ${a}⁻¹ mod ${p} als ${a}^(${p}−2) mod ${p}.`),
            T.answer(`${a}⁻¹ =`, (v) => { if (BigInt(v || 0) * BigInt(a) % BigInt(p) === 1n) { ctx.solve('fermat'); return true; } return 'Probe: a·x mod p muss 1 sein'; }),
            h('div', { class: 'mt' }, T.calculator())));
      } },
    ],
    quiz: [
      { q: 'Wie viele Quadrierungen braucht Square-and-Multiply für einen 2048-Bit-Exponenten (ungefähr)?', a: ['≈ 2048', '≈ 2²⁰⁴⁸', '≈ 11', '≈ 1024²'], c: 0, e: 'Eine Quadrierung pro Bit.' },
      { q: 'Das Inverse von a in 𝔽₂⁸ (AES) ist', a: ['a²⁵⁴', 'a⁰', 'a²⁵⁶', 'a¹²⁷'], c: 0, e: '|𝔽₂⁸*| = 255 ⇒ a²⁵⁵ = 1 ⇒ a⁻¹ = a²⁵⁴.' },
      { q: 'Warum leakt naives Square-and-Multiply den Exponenten?', a: ['Multiplikationen passieren nur bei 1-Bits', 'Quadrieren ist nicht deterministisch', 'Es nutzt Zufall', 'Es rechnet modulo p−1'], c: 0, e: 'Die Operationsfolge (Q vs. QM) ist im Strom-/Zeitprofil sichtbar.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'gf28', world: 'A', title: 'Polynomarithmetik in 𝔽₂⁸',
    short: 'Bytes als Polynome: Addition = XOR, Multiplikation mod x⁸+x⁴+x³+x+1 – die Mathematik hinter AES.',
    keywords: 'gf galois polynom körpererweiterung irreduzibel xtime aes mixcolumns',
    challenges: { xtime: { title: 'xtime von Hand', xp: 30 }, mul: { title: 'Bytes multiplizieren', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Körpererweiterung 𝔽ₚ[x]/(f)',
            h('p', null, 'Ein endlicher Körper 𝔽ₚ wird durch ein irreduzibles Polynom f vom Grad n zu 𝔽ₚⁿ erweitert. Elemente sind Polynome vom Grad < n mit Koeffizienten aus 𝔽ₚ. Für p prim und n ∈ ℕ gibt es bis auf Isomorphie genau einen Körper 𝔽ₚⁿ.'),
            UI.table(['Operation', 'Regel in 𝔽ₚ[x]/(f)'], [
              ['Addition / Subtraktion', 'koeffizientenweise mod p – für p = 2 einfach <b>XOR</b>'],
              ['Multiplikation', 'Polynome multiplizieren, dann Rest bei Division durch f'],
              ['Division', 'Multiplikation mit dem Inversen (a⁻¹ = a^(pⁿ−2))'],
            ], { wrap: false })),
          UI.card('AES: 𝔽₂⁸ mit f(x) = x⁸ + x⁴ + x³ + x + 1 (0x11B)',
            h('p', null, 'Ein Byte b₇…b₀ ist das Polynom b₇x⁷ + … + b₁x + b₀. Beispiel: 0x57 = x⁶ + x⁴ + x² + x + 1.'),
            h('p', null, h('b', null, 'xtime'), ' = Multiplikation mit x (0x02): nach links schieben; fällt ein Bit bei x⁸ heraus, mit 0x1B XORen.'),
            h('p', null, 'Bekanntes Beispiel aus FIPS 197: 0x57 · 0x83 = 0xC1.'),
            UI.callout('exam', 'Wo kommt das vor?', 'SubBytes (multiplikatives Inverses), MixColumns (Multiplikation mit 01, 02, 03), GHASH in GCM (dort 𝔽₂¹²⁸). Irreduzibel: x² + x + 1 über 𝔽₂ (zerfällt erst über ℂ).')));
      } },
      { title: 'Labor', render(el) {
        let a = 0x57, b = 0x83;
        const out = h('div');
        const bitEditor = (get, set) => {
          const wrap = h('div');
          const draw = () => { UI.clear(wrap); wrap.append(UI.bitrow(U.bits(get()), { onclick: (i) => { set(get() ^ (1 << (7 - i))); refresh(); } }), h('div', { class: 'small mono mt' }, `0x${U.hex8(get())} = ${GF.poly(get())}`)); };
          wrap.draw = draw;
          return wrap;
        };
        const ea = bitEditor(() => a, (v) => (a = v)), eb = bitEditor(() => b, (v) => (b = v));
        const refresh = () => {
          ea.draw(); eb.draw(); UI.clear(out);
          const tr = GF.mulTrace(a, b);
          out.append(
            h('h4', null, `Summe: a ⊕ b = 0x${U.hex8(a ^ b)}`),
            h('h4', null, '1) Polynom-Multiplikation (ohne Reduktion)'),
            tr.partials.length ? UI.table(['Teilprodukt', 'Bits', 'Polynom'], tr.partials.map((p) => [`a · x^${p.shift}`, U.bits(p.value, 15), GF.poly(p.value)]), { mono: true, wrap: false }) : h('p', null, 'b = 0 ⇒ Produkt 0'),
            h('p', { class: 'mono' }, `⊕ Summe = ${U.bits(tr.product, 15)} = ${GF.poly(tr.product)}`),
            h('h4', null, '2) Reduktion modulo x⁸+x⁴+x³+x+1'),
            tr.reductions.length ? UI.table(['Grad', 'subtrahiere f·x^k', 'Rest danach'], tr.reductions.map((r) => [r.deg, U.bits(r.sub, 15), U.bits(r.after, 15)]), { mono: true, wrap: false }) : h('p', { class: 'muted' }, 'Grad < 8 – keine Reduktion nötig.'),
            UI.callout('success', `a · b = 0x${U.hex8(tr.result)}`, `= ${GF.poly(tr.result)}<br>Inverses von a: 0x${U.hex8(GF.inv(a))} (Probe a·a⁻¹ = 0x${U.hex8(GF.mul(a, GF.inv(a)))})`));
        };
        el.append(UI.card('Bits anklicken zum Umschalten', h('div', { class: 'grid c2' }, h('div', null, h('b', null, 'a'), ea), h('div', null, h('b', null, 'b'), eb)),
          h('div', { class: 'row mt' }, UI.button('FIPS-Beispiel 57·83', () => { a = 0x57; b = 0x83; refresh(); }, { sm: true }), UI.button('xtime: a·02', () => { b = 2; refresh(); }, { sm: true }), UI.button('Zufall', () => { a = U.randInt(1, 255); b = U.randInt(1, 255); refresh(); }, { sm: true })),
          out));
        refresh();
      } },
      { title: 'Challenges', render(el, ctx) {
        const a = U.randInt(0x80, 0xff);
        const tasks = [[U.randInt(1, 255), 2], [U.randInt(1, 255), 3], [U.randInt(1, 255), U.randInt(4, 15)]];
        let k = 0;
        const area = h('div');
        const draw = () => {
          UI.clear(area);
          if (k >= tasks.length) { area.append(UI.callout('success', 'Alle drei richtig', 'Du kannst in 𝔽₂⁸ rechnen.')); ctx.solve('mul'); return; }
          const [x, y] = tasks[k];
          area.append(h('p', null, `Aufgabe ${k + 1}/3: Berechne 0x${U.hex8(x)} · 0x${U.hex8(y)} in 𝔽₂⁸ (Ergebnis als Hex).`),
            T.answer('=', (v) => { if (parseInt(v.replace(/^0x/i, ''), 16) === GF.mul(x, y)) { k++; setTimeout(draw, 400); return true; } return 'Tipp: 03·a = (02·a) ⊕ a'; }));
        };
        draw();
        el.append(UI.card('Challenge 1 · xtime', h('p', null, `Berechne 0x02 · 0x${U.hex8(a)}. Achtung: das höchste Bit ist gesetzt (${U.bits(a)}).`),
          T.answer('=', (v) => { if (parseInt(v.replace(/^0x/i, ''), 16) === GF.xtime(a)) { ctx.solve('xtime'); return true; } return 'schieben und mit 0x1B XORen'; }), T.xorCalc()),
          UI.card('Challenge 2 · Drei Multiplikationen', area));
      } },
    ],
    quiz: [
      { q: 'Was ist 0x57 ⊕ 0x83 (Addition in 𝔽₂⁸)?', a: ['0xD4', '0xDA', '0xC1', '0x2C'], c: 0, e: '0101 0111 ⊕ 1000 0011 = 1101 0100.' },
      { q: 'Welches Polynom definiert den AES-Körper?', a: ['x⁸ + x⁴ + x³ + x + 1', 'x⁸ + 1', 'x⁸ + x + 1', 'x² + x + 1'], c: 0, e: '0x11B, irreduzibel über 𝔽₂.' },
      { q: 'Warum braucht man ein irreduzibles Polynom?', a: ['Sonst gäbe es Nullteiler – kein Körper', 'Damit die Addition XOR ist', 'Für schnellere Hardware', 'Damit 0 ein Inverses hat'], c: 0, e: 'Analog zu „n prim“ bei ℤₙ.' },
    ],
  });
})();
