/* Welt J – Universelle Hashfunktionen & idealisierte Modelle */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, nt: NT, toys: TOY } = KQ;
  const h = UI.h;

  /** Poly-UHF: U(K, M) = K^d + M_{d-1} K^{d-1} + … + M_0 mod p, M = [M_{d-1}, …, M_0] */
  const polyU = (K, M, p) => { let acc = 1; for (const m of M) acc = (acc * K + m) % p; return acc; };

  // ======================================================================
  KQ.module({
    id: 'polyuhf', world: 'J', title: 'Universelle Hashfunktionen & Poly-UHF',
    short: 'Geheimer Schlüssel statt öffentlichem Salt: UHF, UH-PRF, und warum ein Polynom höchstens d Nullstellen hat.',
    keywords: 'uhf universelle hashfunktion poly-uhf poly1305 ghash gcm nullstellen fundamentalsatz uh-prf',
    challenges: { root: { title: 'Kollisionsschlüssel finden', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Definition',
            h('p', null, 'U: {0,1}^κ × {0,1}* → {0,1}ⁿ ist eine ', h('b', null, 'universelle Hashfunktion'), ', wenn für alle X ≠ X′ gilt: Pr[U(K, X) = U(K, X′)] ist vernachlässigbar (K zufällig). Anders als bei CRHFs ist K hier ', h('b', null, 'geheim'), ' – der Angreifer wählt X, X′, ohne K zu kennen.'),
            h('div', { class: 'grid c2' }, UI.lib('L<sub>dict-real</sub>', ['K ← {0,1}^λ', 'SET(X, Y): L[U(K, X)] ← Y', 'GET(X):    return L[U(K, X)]']), UI.lib('L<sub>dict-ideal</sub>', ['SET(X, Y): L[X] ← Y', 'GET(X):    return L[X]'])),
            h('p', { class: 'small muted' }, 'Alternative, äquivalente Definition: Ein Dictionary über U(K, ·) verhält sich wie eines über die Eingaben selbst.')),
          UI.card('Konstruktionen',
            UI.table(['Konstruktion', 'Idee'], [
              ['UH-PRF', 'F′(K₁‖K₂, X) = F(K₂, U(K₁, X)) – UHF komprimiert, PRF sichert ab ⇒ PRF für variable Länge'],
              ['CBC-MAC (ohne Prefix)', 'ist selbst eine UHF (aber keine PRF für variable Länge)'],
              ['ECBC / FCBC', 'CBC-MAC + zweiter Schlüssel im letzten Schritt ⇒ sichere PRF (Basis für CMAC)'],
              ['Poly-UHF', 'U(K, M) = K^d + M_{d−1}K^{d−1} + … + M₀ mod p, p prim'],
            ], { wrap: false })),
          UI.card('Lemma: Poly-UHF kollidiert mit Wahrscheinlichkeit ≤ d/p',
            h('p', null, 'U(K, M) = U(K, M′) ⟺ K ist Nullstelle des Differenzpolynoms Δ(X) = Q(X) − Q′(X) ≢ 0 vom Grad ≤ d. Fundamentalsatz: Für p prim hat ein Polynom vom Grad d höchstens d Nullstellen mod p ⇒ höchstens d der p Schlüssel führen zur Kollision. ∎'),
            UI.callout('exam', 'Praxis', 'Poly1305 (p = 2¹³⁰ − 5) in ChaCha20-Poly1305 und GHASH (über 𝔽₂¹²⁸) in AES-GCM beruhen auf diesem Prinzip. p muss prim sein – sonst gibt es Nullteiler und viel mehr „Nullstellen“.')));
      } },
      { title: 'Labor', render(el) {
        let p = 101, M = '3, 14, 15', M2 = '9, 26, 53';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const a = M.split(',').map((x) => NT.modN(parseInt(x) || 0, p)), b = M2.split(',').map((x) => NT.modN(parseInt(x) || 0, p));
          const pts1 = [], pts2 = [], coll = [];
          for (let K = 0; K < p; K++) { const u = polyU(K, a, p), v = polyU(K, b, p); pts1.push([K, u]); pts2.push([K, v]); if (u === v) coll.push(K); }
          const d = Math.max(a.length, b.length);
          out.append(UI.chart({ series: [{ points: pts1, color: UI.css('--accent'), dots: true, width: 0.6, label: 'U(K, M)' }, { points: pts2, color: UI.css('--c-key'), dots: true, width: 0.6, label: 'U(K, M′)' }], ymin: 0, ymax: p, xlabel: 'Schlüssel K', height: 240 }),
            h('p', null, `Kollisionen bei K ∈ {${coll.join(', ') || '—'}} → ${coll.length} von ${p} Schlüsseln. Schranke: ≤ d = ${d} (Wahrscheinlichkeit ≤ ${d}/${p} ≈ ${(d / p).toFixed(3)}).`),
            a.length === b.length && a.every((x, i) => x === b[i]) ? UI.callout('warning', 'M = M′', 'Gleiche Nachrichten kollidieren natürlich immer.') : null);
        };
        el.append(UI.card('Alle Schlüssel durchprobieren',
          h('div', { class: 'row' }, UI.field('p (prim)', UI.select(NT.primesUpTo(400).filter((x) => x > 30), p, (v) => { p = +v; draw(); })),
            UI.field('M (Koeffizienten M_{d−1}, …, M₀)', UI.input({ value: M, w: 'm', oninput: (v) => { M = v; draw(); } })),
            UI.field('M′', UI.input({ value: M2, w: 'm', oninput: (v) => { M2 = v; draw(); } }))), out));
        draw();
      } },
      { title: 'Challenge', render(el, ctx) {
        const p = 101;
        const M = [U.randInt(0, 100), U.randInt(0, 100), U.randInt(0, 100)];
        const M2 = [M[0], U.randInt(0, 100), U.randInt(0, 100)];
        while (M2[1] === M[1]) M2[1] = U.randInt(0, 100);
        const a = NT.modN(M[1] - M2[1], p), b = NT.modN(M[2] - M2[2], p);
        const root = NT.modN(-b * NT.invN(a, p), p);
        el.append(UI.card('Finde den Schlüssel, bei dem zwei Nachrichten kollidieren',
          h('p', null, `p = ${p}, M = (${M.join(', ')}), M′ = (${M2.join(', ')}). Beide haben drei Koeffizienten, also U(K, M) = K³ + M₂K² + M₁K + M₀.`),
          h('p', null, 'Das Differenzpolynom ist hier nur linear: Δ(K) = ', h('code', null, `${a}·K + ${b}`), ' (mod 101). Für welches K kollidieren die Nachrichten?'),
          T.answer('K =', (v) => { const K = +v; if (polyU(K, M, p) === polyU(K, M2, p) && K >= 0 && K < p) { ctx.solve('root'); return true; } return `U(K,M) = ${polyU(K, M, p)}, U(K,M′) = ${polyU(K, M2, p)}`; }),
          h('p', { class: 'small muted' }, `Tipp: K = −${b} · ${a}⁻¹ mod ${p} (Euklid aus Welt A). Genau eine Nullstelle – passt zur Schranke „≤ Grad“.`),
          h('div', { class: 'mt' }, T.calculator())));
        void root;
      } },
    ],
    quiz: [
      { q: 'Was unterscheidet eine UHF von einer CRHF?', a: ['Der Schlüssel ist geheim', 'Die Ausgabe ist länger', 'Sie ist nicht deterministisch', 'Sie hat keine Kollisionen'], c: 0, e: 'Bei CRHF ist der Salt öffentlich.' },
      { q: 'Wie viele Schlüssel lassen zwei verschiedene Nachrichten unter der Poly-UHF (Grad d) höchstens kollidieren?', a: ['d', 'p', 'd²', '1'], c: 0, e: 'Nullstellen des Differenzpolynoms.' },
      { q: 'Welche MACs beruhen auf Polynom-UHFs?', a: ['Poly1305 und GHASH', 'HMAC und CMAC', 'CBC-MAC', 'RSA-PSS'], c: 0, e: 'ChaCha20-Poly1305 und AES-GCM.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'ideal', world: 'J', title: 'Random Oracle, Even-Mansour & Sponge',
    short: 'Idealisierte Beweismodelle: Lazy-Sampling-Orakel, Blockchiffre aus einer Permutation, SHA-3-Prinzip.',
    keywords: 'random oracle ideal permutation even mansour prince sponge duplex sha-3 keccak rate capacity',
    challenges: { rocoll: { title: 'RO-Kollision (12 Bit)', xp: 40 }, emkey: { title: 'Even-Mansour-Schlüssel', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Random-Oracle-Modell',
            UI.lib('H(A)', ['if H[A] undefined: H[A] ← {0,1}ⁿ', 'return H[A]']),
            h('p', null, 'H wird als perfekt zufällige Funktion mit Lazy Sampling modelliert. Nützliche Näherung – aber eine reale Hashfunktion kann sich ', h('b', null, 'nie exakt'), ' wie ein Random Oracle verhalten. Ein Modell, kein Beweis ohne Annahmen.'),
            h('p', null, h('b', null, 'Lemma: '), 'Ein RO ist kollisionsresistent (auch ohne Salt): COMPARE(X, X′) = „H(X) == H(X′)“ ≈ „X == X′“ – Beweis in 3 Hops (mit ↔ ohne Zurücklegen, Geburtstag O(q²/2ⁿ)).')),
          UI.card('Ideal-Permutation-Modell & Even-Mansour',
            h('p', null, 'Alle haben Zugriff auf eine öffentliche, zufällige Permutation Π und ihre Umkehrung Π⁻¹.'),
            UI.formula('F(K, X) = Π(K ⊕ X) ⊕ K,      F⁻¹(K, Y) = Π⁻¹(K ⊕ Y) ⊕ K'),
            h('p', null, 'Ist im Ideal-Permutation-Modell eine sichere PRP. Beweisidee: U := K ⊕ X sind die internen Π-Eingaben (Menge 𝒰), der Angreifer fragt Π direkt (Menge 𝒜). Solange 𝒜 ∩ 𝒰 = ∅, sehen seine Antworten frisch zufällig aus; bad ⟺ er trifft ein K ⊕ X, müsste also K raten: Pr[bad] ≤ q²/2^κ. Beispiel: PRINCE; das Prinzip „Permutation ↔ Schlüsseladdition“ steckt auch in AES.')),
          UI.card('Sponge (SHA-3) & Duplex',
            h('p', null, 'Zustand = r Bit ', h('b', null, 'rate'), ' (Ein-/Ausgabe per XOR) + c Bit ', h('b', null, 'capacity'), ' (nie direkt sichtbar). Absorbing: Block in die rate XORen, dann f auf den ganzen Zustand. Squeezing: rate ausgeben, f, wieder ausgeben …'),
            h('p', null, 'Ist f eine ideale Permutation, ist nur eine Kollision in der capacity eine Abweichung ⇒ Sponge ≈ Random Oracle (bis ≈ 2^(c/2)) ⇒ gleichzeitig PRG, PRF und CRHF. Der ', h('b', null, 'Duplex'), '-Modus erweitert das um Schlüsselabsorption, Verschlüsselung und Tag-Erzeugung: AEAD aus einer einzigen Permutation.')));
      } },
      { title: 'Random Oracle', render(el, ctx) {
        const table = new Map(); const rev = new Map();
        const inp = UI.input({ value: 'hallo', w: 'm' });
        const out = h('div'), found = h('div');
        const draw = () => {
          UI.clear(out);
          out.append(h('p', null, `Tabelle L hat ${table.size} Einträge (12-Bit-Ausgaben).`),
            UI.table(['Eingabe A', 'H(A)'], [...table.entries()].slice(-14).reverse().map(([a, v]) => [U.escape(a), '0x' + v.toString(16).padStart(3, '0')]), { mono: true, wrap: false }));
        };
        const q = (a) => {
          if (!table.has(a)) {
            const v = U.randInt(0, 4095);
            if (rev.has(v) && !found.childNodes.length) { found.append(UI.callout('success', `Kollision nach ${table.size + 1} Anfragen`, `H(„${U.escape(rev.get(v))}“) = H(„${U.escape(a)}“) = 0x${v.toString(16)} · Erwartung ≈ 1,18·√4096 ≈ 75`)); ctx.solve('rocoll'); }
            table.set(a, v); rev.set(v, a);
          }
          return table.get(a);
        };
        el.append(UI.card('Lazy Sampling live',
          h('div', { class: 'row' }, inp, UI.button('H(A) abfragen', () => { const v = q(inp.value); UI.toast('H(„' + inp.value + '“)', '0x' + v.toString(16).padStart(3, '0'), '', 1500); draw(); }, { kind: 'accent' }),
            UI.button('+10 zufällige Anfragen', () => { for (let i = 0; i < 10; i++) q('x' + U.randInt(0, 1e9)); draw(); })),
          h('p', { class: 'small muted' }, 'Gleiche Eingabe ⇒ gleiche Antwort (konsistent). Neue Eingabe ⇒ frischer Zufallswert. Challenge: Provoziere eine Kollision.'), found, out));
        draw();
      } },
      { title: 'Even-Mansour', render(el, ctx) {
        const P = TOY.randomPerm(8, 4242);
        const K = U.randInt(0, 255);
        const E = TOY.evenMansour(P, K);
        const x1 = U.randInt(0, 255), x2 = (x1 + U.randInt(1, 254)) & 255;
        const y1 = E.enc(x1), y2 = E.enc(x2);
        const res = h('div');
        let tries = 0;
        const bf = h('div');
        el.append(UI.card('8-Bit-Even-Mansour mit öffentlicher Permutation Π',
          h('p', null, 'Π ist öffentlich (Tabelle unten). Du kennst zwei Klartext-Chiffrat-Paare: ', h('code', null, `F(${U.hex8(x1)}) = ${U.hex8(y1)}`), ', ', h('code', null, `F(${U.hex8(x2)}) = ${U.hex8(y2)}`), '. Finde K.'),
          h('div', { class: 'row' }, UI.button('Alle 256 Schlüsselkandidaten testen', () => {
            UI.clear(bf);
            const cands = [];
            for (let k = 0; k < 256; k++) { tries++; if ((P.fwd(k ^ x1) ^ k) === y1 && (P.fwd(k ^ x2) ^ k) === y2) cands.push(k); }
            bf.append(h('p', null, `Kandidaten: ${cands.map((c) => '0x' + U.hex8(c)).join(', ')} – 256 · 2 Π-Auswertungen. Bei κ = 128 Bit wären es 2¹²⁸ (bzw. ≈ 2^(κ/2) mit cleveren Angriffen – passend zur Schranke q²/2^κ).`));
          })), bf,
          T.answer('K = 0x', (v) => { if (parseInt(v, 16) === K) { ctx.solve('emkey'); return true; } return 'nein'; }),
          h('details', { class: 'mt' }, h('summary', null, 'Π-Tabelle anzeigen'), UI.bytes(P.table, { cols: 16, title: (i, v) => `Π(0x${U.hex8(i)}) = 0x${U.hex8(v)}` })), res));
      } },
      { title: 'Sponge', render(el) {
        const P = TOY.randomPerm(16, 777);
        let r = 8, msg = 'Hi!';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const sp = TOY.sponge(P, r);
          const bytes = Array.from(U.utf8(msg));
          const blocks = r === 8 ? bytes : bytes.flatMap((b) => (r === 4 ? [b >> 4, b & 15] : [b]));
          const run = sp.run(blocks, 4);
          out.append(UI.stepper(run.trace.length, (i, body) => {
            const t = run.trace[i];
            const bits = t.state.toString(2).padStart(16, '0');
            const label = t.phase === 'start' ? 'Start: Zustand 0' : t.phase === 'absorb-xor' ? `Absorbing: Block 0x${t.m.toString(16)} in die rate XORen` : t.phase === 'absorb-f' ? 'Permutation f auf den ganzen Zustand' : t.phase === 'squeeze-f' ? 'Squeezing: f anwenden' : `Squeezing: rate ausgeben → z = 0x${t.z.toString(16)}`;
            body.append(h('p', null, h('b', null, label)),
              UI.bitrow(bits, { cls: (j, b) => (j < r ? (b === '1' ? 'one' : '') : b === '1' ? 'diff' : '') }),
              h('div', { class: 'small muted' }, `blau: rate (${r} Bit) · rot: capacity (${16 - r} Bit, nie direkt ausgegeben)`));
          }, { label: (i) => `Schritt ${i + 1}/${run.trace.length}`, interval: 600 }),
            h('p', null, 'Ausgabe z₀…z₃: ', h('code', null, run.out.map((z) => z.toString(16)).join(' '))),
            UI.callout('info', 'Sicherheit ≈ 2^(c/2)', `Mit c = ${16 - r} Bit capacity: generische Angriffe nach ≈ 2^${(16 - r) / 2}. SHA3-256 nutzt c = 512, r = 1088 (Zustand 1600 Bit).`));
        };
        el.append(UI.card('Toy-Sponge (16-Bit-Zustand)', h('div', { class: 'row' }, UI.field('Nachricht', UI.input({ value: msg, w: 'm', oninput: (v) => { msg = v; draw(); } })),
          UI.field('rate r', UI.segmented([[4, '4'], [8, '8'], [12, '12']], r, (v) => { r = +v; draw(); }))), out));
        draw();
      } },
    ],
    quiz: [
      { q: 'Was ist die Kernaussage des Random-Oracle-Modells?', a: ['Die Hashfunktion wird als perfekte Zufallsfunktion modelliert', 'SHA-256 ist ein Random Oracle', 'Orakel liefern geheime Schlüssel', 'Hashes sind invertierbar'], c: 0, e: 'Nur ein Modell – reale Hashes sind deterministischer Code.' },
      { q: 'Wann tritt im Even-Mansour-Beweis das bad-Event ein?', a: ['Wenn eine direkte Π-Anfrage ein internes K⊕X trifft', 'Wenn zwei Chiffrate gleich sind', 'Wenn Π eine Kollision hat', 'Nie'], c: 0, e: '𝒜 ∩ 𝒰 ≠ ∅.' },
      { q: 'Welcher Teil des Sponge-Zustands wird nie direkt ausgegeben?', a: ['capacity', 'rate', 'beide', 'keiner'], c: 0, e: 'Die capacity bestimmt die Sicherheit.' },
    ],
  });
})();
