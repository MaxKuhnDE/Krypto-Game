/* Welt C – Symmetrische Verfahren & Stromchiffren */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, nt: NT, chacha: CC, toys: TOY } = KQ;
  const h = UI.h;

  // ======================================================================
  const PAIRS = [
    ['TREFFEN HEUTE UM ACHT UHR AM ALTEN HAFEN BEIM KRAN', 'DAS PASSWORT FUER DEN SERVER LAUTET MORGENROT JETZT', 'MORGENROT'],
    ['DIE LIEFERUNG KOMMT AM MONTAG MIT DEM ZUG AUS BERLIN', 'DAS PASSWORT FUER DEN TRESOR LAUTET SONNENBLUME OK', 'SONNENBLUME'],
    ['WIR SEHEN UNS NACH DER VORLESUNG IN DER MENSA OBEN', 'DAS PASSWORT FUER DAS WLAN LAUTET HEXENKESSEL BITTE', 'HEXENKESSEL'],
  ];

  KQ.module({
    id: 'otp', world: 'C', icon: '🎟️', title: 'One-Time-Pad & perfekte Sicherheit',
    short: 'XOR mit echtem Zufall: beweisbar perfekt sicher – bis man den Schlüssel zweimal benutzt.',
    keywords: 'one time pad otp xor perfekt sicher shannon two time pad crib',
    challenges: { reuse: { title: 'Two-Time-Pad brechen', xp: 80 }, shannon: { title: 'Shannon-Experiment', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Definition',
            UI.formula('c = m ⊕ k          m = c ⊕ k'),
            h('p', null, 'k muss ', h('b', null, 'echt zufällig'), ', gleichverteilt, ', h('b', null, '|k| = |m|'), ' und ', h('b', null, 'genau einmal'), ' benutzt sein. XOR ist Ver- und Entschlüsselung zugleich (Involution).'),
            h('p', null, h('b', null, 'Korrektheit: '), 'd(k, e(k, m)) = m ⊕ k ⊕ k = m ⊕ 0 = m.')),
          UI.card('Lemma: OTP ist informationstheoretisch sicher',
            h('p', null, 'Aus c = m ⊕ k folgt k = c ⊕ m: Zu jedem Paar (m, c) gibt es ', h('b', null, 'genau einen'), ' Schlüssel. Da k gleichverteilt ist, gilt Pr[C = c] = Pr[K = c ⊕ m] = 1/2ⁿ – unabhängig von m. Ein Chiffrat verrät also nichts.')),
          UI.card('Satz: Perfekte Sicherheit einer Shannon-Chiffre (Klausur-Stil)',
            h('p', null, 'e(kᵢ, mᵢ) = mᵢ + kᵢ mod n zeichenweise, K = (K₁, …, Kₗ). Das Verfahren ist perfekt sicher ', h('b', null, 'genau dann, wenn'), ' (1) jedes Kᵢ gleichverteilt ist und (2) alle Kᵢ unabhängig sind.'),
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, 'Vorüberlegung: '), 'Für festes m ist k ↦ e(k, m) eine Bijektion (Translation) mit eindeutigem Urbild k(m, c) = (cᵢ − mᵢ). Also Pr[C=c | M=m] = Pr[K = k(m,c)].'),
              h('li', null, h('b', null, '„⇐“: '), 'Aus (1)+(2): Pr[K = k] = ∏ 1/n = 1/nˡ – konstant, also unabhängig von m.'),
              h('li', null, h('b', null, '„⇒“: '), 'Setze c = (0,…,0). k(m, 0) = (−mᵢ) durchläuft beim Variieren von m ganz ℤₙˡ ⇒ Pr[K = k] ist für alle k gleich = 1/nˡ ⇒ uniform auf dem Produktraum ⇒ Komponenten uniform und unabhängig. ∎')),
            h('p', { class: 'muted' }, 'Vigenère / Schlüsselwiederholung verletzt (2) – daher nicht perfekt sicher (Experiment im Labor).')),
          UI.callout('danger', 'Schlüssel-Wiederverwendung', 'Wird k zweimal benutzt: c₁ ⊕ c₂ = (m₁ ⊕ k) ⊕ (m₂ ⊕ k) = m₁ ⊕ m₂. Der Schlüssel fällt heraus – mit Sprachstatistik und geratenen Wörtern („Crib Dragging“) lassen sich beide Nachrichten rekonstruieren.'),
          UI.callout('warning', 'Weitere Grenzen', 'Kein Integritäts- oder Authentizitätsschutz (Bits lassen sich gezielt kippen). Unpraktisch: Schlüssel so lang wie die Nachricht, echter Zufall nötig, sicherer Schlüsselaustausch vorab.'));
      } },
      { title: '🧪 XOR-Werkbank', render(el) {
        let msg = 'HALLO', key = U.randomBytes(5);
        const out = h('div'), fake = h('div');
        let fakeMsg = 'HILFE';
        const draw = () => {
          const m = U.utf8(msg);
          if (key.length !== m.length) { const k = U.randomBytes(m.length); k.set(key.slice(0, m.length)); key = k; }
          const c = U.xor(m, key);
          UI.clear(out);
          const row = (label, bytes, cls) => h('div', { class: 'row', style: { alignItems: 'center', margin: '4px 0' } }, h('b', { style: { width: '60px' } }, label), UI.bitrow(U.bytesToBits(bytes), { group: 8, cls: cls ? (i, b) => (b === '1' ? cls : '') : undefined }), h('span', { class: 'mono small muted' }, U.hex(bytes)));
          out.append(row('m', m), row('k', key, 'diff'), h('div', { style: { borderTop: '2px solid var(--stroke-strong)', width: '100%', margin: '4px 0' } }), row('c = m⊕k', c));
          UI.clear(fake);
          const fm = U.utf8(fakeMsg);
          if (fm.length === c.length) {
            const k2 = U.xor(c, fm);
            fake.append(h('p', null, 'Derselbe Geheimtext c entsteht aus „', h('b', null, fakeMsg), '“ mit dem Schlüssel k′ = c ⊕ m′ = ', h('code', null, U.hex(k2)), '.'),
              UI.callout('info', 'Fazit', 'Für einen Angreifer sind alle Klartexte gleicher Länge gleich plausibel – jeder hat genau einen passenden, gleich wahrscheinlichen Schlüssel.'));
          } else fake.append(h('p', { class: 'muted' }, `Gib einen alternativen Klartext mit genau ${c.length} Byte ein (aktuell ${fm.length}).`));
        };
        el.append(UI.card('Bitweise XOR',
          h('div', { class: 'row' }, UI.field('Klartext', UI.input({ value: msg, oninput: (v) => { msg = v; draw(); } })), UI.button('🎲 Neuer Schlüssel', () => { key = U.randomBytes(U.utf8(msg).length); draw(); })),
          h('div', { class: 'mt' }, out)),
          UI.card('Perfekte Sicherheit zum Anfassen',
            h('p', null, 'Behaupte, c sei die Verschlüsselung eines anderen Klartexts:'),
            UI.input({ value: fakeMsg, oninput: (v) => { fakeMsg = v; draw(); } }), fake));
        draw();
      } },
      { title: '🧪 Shannon-Experiment', render(el, ctx) {
        // n = 7, l = 2: Verteilung von C für zwei feste Nachrichten
        const n = 7;
        let mode = 'uniform', M = [3, 1], M2 = [0, 0];
        const out = h('div');
        const sample = (m) => {
          const grid = Array.from({ length: n }, () => new Array(n).fill(0));
          for (let t = 0; t < 7000; t++) {
            const k1 = U.randInt(0, n - 1);
            const k2 = mode === 'uniform' ? U.randInt(0, n - 1) : mode === 'repeat' ? k1 : U.randInt(0, 2);
            grid[(m[0] + k1) % n][(m[1] + k2) % n]++;
          }
          return grid;
        };
        const heat = (grid, title) => {
          const max = Math.max(...grid.flat());
          return h('div', null, h('div', { class: 'matrix-label' }, title),
            h('div', { class: 'bytes', style: { gridTemplateColumns: `repeat(${n}, auto)` } },
              grid.flatMap((row, i) => row.map((v, j) => h('div', { class: 'byte', title: `C = (${i}, ${j}): ${v}×`, style: { background: `color-mix(in srgb, var(--accent) ${Math.round((v / (max || 1)) * 85)}%, var(--card-2))`, color: v / max > 0.5 ? 'var(--on-accent)' : 'var(--text-2)' } }, v)))),
            h('div', { class: 'small muted center' }, 'Zeile: C₁, Spalte: C₂'));
        };
        const draw = () => {
          UI.clear(out);
          out.append(h('div', { class: 'grid c2' }, heat(sample(M), `M = (${M})`), heat(sample(M2), `M′ = (${M2})`)));
          const verdict = mode === 'uniform'
            ? UI.callout('success', 'Beide Verteilungen gleich (flach)', 'K₁, K₂ uniform und unabhängig ⇒ Pr[C=c | M=m] = 1/49 für alle c, m. Perfekte Sicherheit.')
            : mode === 'repeat'
            ? UI.callout('danger', 'Struktur sichtbar', 'K₂ = K₁ (Schlüssel wiederholt, wie bei Vigenère): Es gilt immer C₁ − C₂ ≡ M₁ − M₂. Die Diagonale verrät die Differenz der Klartexte – Bedingung (2) verletzt.')
            : UI.callout('danger', 'Nicht gleichverteilt', 'K₂ nur aus {0,1,2}: Bedingung (1) verletzt. Je nach M landen Chiffrate in unterschiedlichen Spalten – ein Angreifer kann M und M′ unterscheiden.');
          out.append(verdict);
        };
        el.append(UI.card('Verteilung von C = M + K mod 7 (zwei Zeichen, 7000 Stichproben)',
          h('div', { class: 'row' }, UI.segmented([['uniform', 'K uniform & unabhängig'], ['repeat', 'K₂ = K₁ (Wiederholung)'], ['biased', 'K₂ nicht uniform']], mode, (v) => { mode = v; draw(); }),
            UI.button('Neu ziehen', draw, { sm: true })), h('div', { class: 'mt' }, out),
          h('div', { class: 'row mt' }, h('span', null, 'Frage: Welche Bedingung des Satzes verletzt „K₂ = K₁“?'),
            UI.segmented([['1', '(1) Gleichverteilung'], ['2', '(2) Unabhängigkeit']], null, (v) => { if (v === '2') { ctx.solve('shannon'); UI.toast('Richtig', 'Jedes Kᵢ ist für sich gleichverteilt, aber K₂ hängt von K₁ ab.', '✅'); } else UI.toast('Nicht ganz', 'K₂ = K₁ ist für sich gleichverteilt – das Problem ist die Abhängigkeit.', '❌'); }))));
        draw();
      } },
      { title: '⚔️ Challenge: Two-Time-Pad', render(el, ctx) {
        const [m1s, m2s, pw] = U.pick(PAIRS);
        const L = Math.min(m1s.length, m2s.length);
        const m1 = U.utf8(m1s.slice(0, L)), m2 = U.utf8(m2s.slice(0, L));
        const k = U.randomBytes(L);
        const c1 = U.xor(m1, k), c2 = U.xor(m2, k), x = U.xor(c1, c2);
        const known = [new Array(L).fill(null), new Array(L).fill(null)];
        const lines = h('div');
        const ok = (b) => (b >= 65 && b <= 90) || b === 32;
        const draw = () => {
          UI.clear(lines);
          [0, 1].forEach((t) => {
            const row = h('div', { class: 'mono', style: { fontSize: '15px', letterSpacing: '2px', whiteSpace: 'pre', overflowX: 'auto', padding: '6px 0' } });
            known[t].forEach((b) => row.append(h('span', { style: b === null ? { color: 'var(--text-3)' } : ok(b) ? { color: 'var(--success)', fontWeight: 700 } : { color: 'var(--danger)', fontWeight: 700, background: 'var(--danger-bg)' } }, b === null ? '·' : ok(b) ? String.fromCharCode(b) : '¤')));
            lines.append(h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('b', { style: { width: '40px' } }, 'm' + (t + 1)), row));
          });
          const ruler = h('div', { class: 'mono small muted', style: { whiteSpace: 'pre', letterSpacing: '2px', paddingLeft: '50px' } }, Array.from({ length: L }, (_, i) => (i % 10 === 0 ? String(i / 10 % 10) : ' ')).join(''));
          lines.append(ruler);
        };
        const crib = UI.input({ placeholder: 'geratenes Wort, z.B. " DER " oder "PASSWORT"', w: 'l' });
        const pos = UI.input({ type: 'number', value: 0, min: 0, max: L - 1, w: 's' });
        let target = 1;
        const scanOut = h('div');
        const place = () => {
          const g = U.utf8(crib.value.toUpperCase());
          const p = +pos.value;
          for (let j = 0; j < g.length && p + j < L; j++) {
            known[target][p + j] = g[j];
            known[1 - target][p + j] = x[p + j] ^ g[j];
          }
          draw();
        };
        const scan = () => {
          const g = U.utf8(crib.value.toUpperCase());
          UI.clear(scanOut);
          if (!g.length) return;
          const hits = [];
          for (let p = 0; p + g.length <= L; p++) {
            const frag = g.map((b, j) => x[p + j] ^ b);
            if (frag.every(ok)) hits.push([p, String.fromCharCode(...frag)]);
          }
          scanOut.append(h('p', { class: 'small' }, hits.length ? `Positionen, an denen die andere Nachricht nur aus Buchstaben/Leerzeichen bestünde (${hits.length}):` : 'Keine plausible Position – das Wort steht so nicht in der Nachricht.'),
            hits.length ? UI.table(['Position', `Fragment in m${2 - target}`], hits.slice(0, 40).map(([p, f]) => [p, '<code>' + f.replace(/ /g, '␣') + '</code>']), { maxHeight: '220px' }) : null);
        };
        el.append(
          UI.card('Lage',
            h('p', null, 'Ein Agent hat zwei Nachrichten mit ', h('b', null, 'demselben'), ' OTP-Schlüssel verschlüsselt. Du hast beide Chiffrate abgefangen. Gesucht: das Passwort, das in einer der Nachrichten steht.'),
            UI.kv([['c₁', U.hex(c1)], ['c₂', U.hex(c2)], ['c₁ ⊕ c₂ = m₁ ⊕ m₂', U.hex(x)]]),
            UI.callout('tip', 'Technik: Crib Dragging', 'Rate ein Wort, das wahrscheinlich in einer Nachricht vorkommt, und XORe es an jeder Position mit c₁ ⊕ c₂. Wo das Ergebnis lesbar ist, stimmt die Vermutung vermutlich – und du erhältst gratis ein Stück der anderen Nachricht. Beide Texte bestehen nur aus Großbuchstaben und Leerzeichen.')),
          UI.card('Rekonstruktion', lines,
            h('div', { class: 'row mt' }, UI.field('Vermutung', crib), UI.field('Position', pos),
              UI.field('in', UI.segmented([[0, 'm₁'], [1, 'm₂']], 1, (v) => (target = +v))),
              UI.button('🔎 Alle Positionen testen', scan), UI.button('📌 An Position setzen', place, { kind: 'accent' }),
              UI.button('Leeren', () => { known.forEach((a) => a.fill(null)); draw(); }, { kind: 'subtle' })),
            scanOut,
            h('div', { class: 'mt' }, T.answer('Das Passwort lautet:', (v) => { if (v.toUpperCase() === pw) { ctx.solve('reuse'); return true; } return 'noch nicht'; }, { mono: true, w: 'm' }))));
        draw();
      } },
    ],
    quiz: [
      { q: 'Was passiert, wenn ein OTP-Schlüssel zweimal verwendet wird?', a: ['c₁ ⊕ c₂ = m₁ ⊕ m₂ – der Schlüssel fällt heraus', 'Nichts, OTP bleibt perfekt sicher', 'Der Schlüssel wird sichtbar', 'Die Entschlüsselung schlägt fehl'], c: 0, e: 'Klassischer Angriff (Venona-Projekt).' },
      { q: 'Welche Bedingungen sind für perfekte Sicherheit der Shannon-Chiffre nötig und hinreichend?', a: ['Kᵢ gleichverteilt UND unabhängig', 'nur Kᵢ gleichverteilt', 'nur |K| ≥ |M|', 'K geheim und lang'], c: 0, e: 'Satz aus Teil C – beide Richtungen.' },
      { q: 'Schützt das OTP die Integrität?', a: ['Nein – ein Angreifer kann gezielt Bits kippen', 'Ja, perfekt', 'Ja, wenn der Schlüssel lang genug ist', 'Nur bei Text'], c: 0, e: 'c ⊕ Δ entschlüsselt zu m ⊕ Δ.' },
      { q: 'Warum ist das OTP in der Praxis selten?', a: ['Schlüssel so lang wie die Nachricht, nur einmal nutzbar, echter Zufall nötig', 'Es ist zu langsam', 'Es ist nicht beweisbar sicher', 'Es ist patentiert'], c: 0, e: 'Deshalb Stromchiffren: kurzer Seed → langer Schlüsselstrom.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'prng', world: 'C', icon: '🎰', title: 'Zufallsgeneratoren & Kongruenzgenerator',
    short: 'Warum ein linearer Kongruenzgenerator für Stromchiffren tödlich ist – sag die nächste Zahl voraus.',
    keywords: 'zufall rng prng csprng lcg kongruenzgenerator lfsr periode iv seed',
    challenges: { predict: { title: 'Casino-LCG vorhersagen', xp: 60 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Von OTP zur Stromchiffre',
            h('p', null, 'Idee: Ein kurzer, echt zufälliger Seed (z. B. 128 Bit) wird von einem deterministischen ', h('b', null, 'Schlüsselstromgenerator'), ' zu einem langen Strom expandiert, der wie beim OTP per XOR verwendet wird.'),
            h('p', null, 'Vorteil: einfacher Schlüsselaustausch. Nachteil: nicht mehr informationstheoretisch sicher (|Schlüssel| < |Nachrichtenraum|); endlicher Zustand ⇒ Periode ≤ 2ⁿ.')),
          UI.card('Arten von Zufallsgeneratoren',
            UI.table(['Kategorie', 'Eigenschaft'], [
              ['Echter Zufallsgenerator (TRNG)', 'misst physikalische Phänomene (Rauschen, Quanteneffekte); oft manipulierbar – allein ungeeignet'],
              ['Deterministischer RNG', 'Seed → wirkt zufällig, ist aber leicht nachrechenbar – ungeeignet'],
              ['Kryptografisch sicherer RNG', 'nicht vorhersagbar, nicht rückrechenbar, schwer manipulierbar – Basis für Stromchiffren'],
            ], { wrap: false })),
          UI.card('Anforderungen an Schlüsselstromgeneratoren',
            h('ul', { class: 'tight' },
              h('li', null, 'große Periode (z. B. 2¹²⁸)'),
              h('li', null, 'zukünftige Bits nur mit sehr hohem Aufwand vorhersagbar'),
              h('li', null, 'Schlüssel wiederverwendbar ⇒ zusätzlicher ', h('b', null, 'IV / Nonce'), ', damit dieselbe Nachricht mit anderem IV ein anderes Chiffrat ergibt'))),
          UI.card('Gegenbeispiel: linearer Kongruenzgenerator',
            UI.formula('S<sub>i+1</sub> ≡ A · S<sub>i</sub> + B (mod o)'),
            h('p', null, 'Aus drei bekannten Werten S₁, S₂, S₃ folgt das lineare Gleichungssystem'),
            UI.formula('S₃ − S₂ ≡ A·(S₂ − S₁)  ⇒  A ≡ (S₃ − S₂)·(S₂ − S₁)<sup>−1</sup>,   B ≡ S₂ − A·S₁'),
            h('p', null, 'Damit ist der gesamte Strom vorhersagbar. Auch LFSR-basierte Stromchiffren sind meist unsicher (linear ⇒ Berlekamp-Massey).')));
      } },
      { title: '🧪 Labor', render(el) {
        let A = 1103, B = 12345, o = 4096, seed = 7;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const g = TOY.lcg(A, B, o, seed);
          const seq = []; const seen = new Map(); let period = null;
          let s = seed;
          for (let i = 0; i < 5000; i++) { if (seen.has(s)) { period = i - seen.get(s); break; } seen.set(s, i); s = (A * s + B) % o; }
          for (let i = 0; i < 600; i++) seq.push(g());
          const W = 300, size = 3;
          const cv = (pts, title) => {
            const c = h('canvas', { width: W * 2, height: W * 2, class: 'viz', style: { width: W + 'px', height: W + 'px' } });
            requestAnimationFrame(() => {
              const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.fillStyle = UI.css('--accent');
              pts.forEach(([x, y]) => ctx.fillRect(x * (W - size), y * (W - size), size, size));
            });
            return h('div', null, h('div', { class: 'matrix-label' }, title), c);
          };
          const lcgPts = []; for (let i = 0; i + 1 < seq.length; i++) lcgPts.push([seq[i] / o, seq[i + 1] / o]);
          const rnd = U.randomBytes(1200); const rPts = []; for (let i = 0; i + 3 < rnd.length; i += 2) rPts.push([((rnd[i] << 8) | rnd[i + 1]) / 65536, ((rnd[i + 2] << 8) | rnd[i + 3]) / 65536]);
          out.append(h('p', null, 'Erste Werte: ', h('code', null, seq.slice(0, 12).join(', ') + ' …'), ' · Periode: ', h('b', null, period ? String(period) : '> 5000')),
            h('div', { class: 'row top' }, cv(lcgPts, 'LCG: Paare (Sᵢ, Sᵢ₊₁)'), cv(rPts, 'crypto.getRandomValues: Paare')),
            h('p', { class: 'small muted' }, 'Aufeinanderfolgende LCG-Werte liegen auf wenigen Geraden (Gitterstruktur) – ein Muster, das ein CSPRNG nicht zeigen darf.'));
        };
        const num = (label, get, set) => UI.field(label, UI.input({ type: 'number', value: get(), w: 's', oninput: (v) => { set(Math.max(0, parseInt(v) || 0)); if (o > 1) draw(); } }));
        el.append(UI.card('Kongruenzgenerator ausprobieren',
          h('div', { class: 'row' }, num('A', () => A, (v) => (A = v)), num('B', () => B, (v) => (B = v)), num('Modul o', () => o, (v) => (o = Math.max(2, v))), num('Seed S₀', () => seed, (v) => (seed = v))),
          out));
        draw();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        const o = U.pick([10007, 10009, 10037, 10039, 10061]);
        const A = U.randInt(2, o - 1), B = U.randInt(1, o - 1);
        let s = U.randInt(1, o - 1);
        const nxt = () => (s = (A * s + B) % o);
        let S = [nxt(), nxt(), nxt()];
        while (S[1] === S[0]) S = [nxt(), nxt(), nxt()];
        const n4 = (A * S[2] + B) % o, n5 = (A * n4 + B) % o;
        el.append(UI.card('🎰 Online-Casino „Lucky Modulo“',
          h('p', null, `Das Casino erzeugt Lottozahlen mit einem geheimen LCG Sᵢ₊₁ = A·Sᵢ + B mod ${o} (Modul öffentlich, ${o} ist prim). Du hast drei aufeinanderfolgende Ziehungen beobachtet:`),
          h('div', { class: 'row' }, S.map((v, i) => UI.chip(`S${i + 1} = ${v}`, 'accent'))),
          h('p', null, 'Sage die nächsten zwei Ziehungen voraus.'),
          T.answer('S₄ =', (v) => (+v === n4 ? true : 'falsch')),
          T.answer('S₅ =', (v) => { if (+v === n5) { ctx.solve('predict'); return true; } return 'falsch'; }),
          h('div', { class: 'mt' }, T.calculator())));
      } },
    ],
    quiz: [
      { q: 'Wie viele aufeinanderfolgende LCG-Werte genügen (bei bekanntem Modul) zur Vorhersage?', a: ['3', '1', '2⁶⁴', 'Man braucht den Seed'], c: 0, e: 'Zwei Gleichungen, zwei Unbekannte A, B.' },
      { q: 'Wozu dient ein IV/Nonce bei Stromchiffren?', a: ['Damit derselbe Schlüssel wiederverwendet werden kann, ohne denselben Strom zu erzeugen', 'Als zweiter geheimer Schlüssel', 'Zur Integritätssicherung', 'Um das Padding zu ersetzen'], c: 0, e: 'Gleicher Schlüssel + gleicher IV = gleicher Strom = Two-Time-Pad.' },
      { q: 'Warum ist eine Stromchiffre nie informationstheoretisch sicher?', a: ['Der Schlüssel ist kürzer als der Nachrichtenraum', 'Weil XOR linear ist', 'Weil sie einen IV verwendet', 'Weil sie periodisch sein muss'], c: 0, e: 'Shannon: perfekte Sicherheit braucht |K| ≥ |M|.' },
    ],
  });

  // ======================================================================
  const stateCls = (i) => (i < 4 ? 'const' : i < 12 ? 'key' : i === 12 ? 'ctr' : 'nonce');
  const words = (st, opts = {}) => UI.bytes(st, { cols: 4, wide: true, fmt: (w) => U.hex32(w), cls: (i) => (opts.cls ? opts.cls(i) : stateCls(i)), title: (i) => `Wort ${i}` });
  const RFC_KEY = Uint8Array.from({ length: 32 }, (_, i) => i);
  const RFC_NONCE = U.fromHex('000000090000004a00000000');

  KQ.module({
    id: 'chacha', world: 'C', icon: '💃', title: 'ChaCha20',
    short: 'ARX-Stromchiffre: 4×4-Zustand, Quarterround, Spalten- und Diagonalrunden – mit RFC-8439-Testvektor.',
    keywords: 'chacha20 salsa20 arx quarterround stromchiffre bernstein nonce',
    challenges: { qr: { title: 'Runden zuordnen', xp: 30 }, nonce: { title: 'Nonce-Reuse ausnutzen', xp: 50 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Idee',
            h('p', null, 'ChaCha20 (D. J. Bernstein, Nachfolger von Salsa20) ist eine moderne Stromchiffre nach dem ', h('b', null, 'ARX-Prinzip'), ' (Addition mod 2³², Rotation, XOR) – sehr schnell in Software. Ein ', h('b', null, 'Zähler wird „verschlüsselt“'), ', um 512-Bit-Blöcke des Schlüsselstroms zu erzeugen (wie CTR-Modus).')),
          UI.card('1 · Zustand: 16 Wörter à 32 Bit',
            words(CC.initState(RFC_KEY, 1, RFC_NONCE)),
            h('div', { class: 'row small mt' }, UI.chip('Konstanten „expand 32-byte k“ (128 Bit)'), UI.chip('Schlüssel (256 Bit)'), UI.chip('Zähler (32 Bit)'), UI.chip('Nonce (96 Bit)')),
            h('p', { class: 'small muted' }, 'Vor den Runden wird eine Kopie gesichert – für die finale Addition.')),
          UI.card('2 · Quarterround QR(a, b, c, d)',
            h('pre', { class: 'code' }, 'a ← a + b;  d ← d ⊕ a;  d ← d ⋘ 16\nc ← c + d;  b ← b ⊕ c;  b ← b ⋘ 12\na ← a + b;  d ← d ⊕ a;  d ← d ⋘ 8\nc ← c + d;  b ← b ⊕ c;  b ← b ⋘ 7'),
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, '+ mod 2³²'), ': nichtlinear (Überträge) ⇒ Konfusion'),
              h('li', null, h('b', null, '⊕'), ': linear, verknüpft Zustandsteile'),
              h('li', null, h('b', null, '⋘ n'), ': Diffusion innerhalb des Worts'))),
          UI.card('3 · Spalten- und Diagonalrunde',
            h('p', null, 'Spaltenrunde: QR(0,4,8,12), QR(1,5,9,13), QR(2,6,10,14), QR(3,7,11,15). Diagonalrunde: QR(0,5,10,15), QR(1,6,11,12), QR(2,7,8,13), QR(3,4,9,14). Zusammen eine Doppelrunde; 10 Doppelrunden = 20 Runden.')),
          UI.card('4 · Finale Addition & Verschlüsselung',
            h('p', null, 'state ← state + Kopie (wortweise mod 2³²). Ohne diese Addition könnte man die (invertierbaren) Runden einfach zurückrechnen und den Schlüssel auslesen. Ergebnis: 64 Byte Schlüsselstrom; cⱼ = mⱼ ⊕ keystreamⱼ. Nächster Block: Zähler + 1.')),
          UI.callout('danger', 'Nonce niemals wiederverwenden', 'Gleicher Schlüssel + gleiche Nonce ⇒ gleicher Schlüsselstrom ⇒ c₁ ⊕ c₂ = m₁ ⊕ m₂ (Two-Time-Pad). In der Praxis meist als AEAD ChaCha20-Poly1305 eingesetzt.'));
      } },
      { title: '🧪 Runden-Explorer', render(el) {
        const keyIn = UI.input({ value: U.hex(RFC_KEY), mono: true, w: 'full' });
        const nonceIn = UI.input({ value: U.hex(RFC_NONCE), mono: true, w: 'l' });
        const ctrIn = UI.input({ value: '1', mono: true, w: 's' });
        const out = h('div');
        const run = () => {
          UI.clear(out);
          let key, nonce, ctr;
          try { key = U.fromHex(keyIn.value); nonce = U.fromHex(nonceIn.value); ctr = parseInt(ctrIn.value) >>> 0; if (key.length !== 32 || nonce.length !== 12) throw new Error('Schlüssel 32 Byte, Nonce 12 Byte'); }
          catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); return; }
          const tr = CC.block(key, ctr, nonce, true);
          const steps = [{ title: 'Startzustand', st: tr.init, hl: null }]
            .concat(tr.rounds.map((r) => ({ title: `Runde ${r.n}: ${r.kind}`, st: r.state, hl: r.kind === 'Spaltenrunde' ? CC.COLUMN_QR : CC.DIAG_QR })))
            .concat([{ title: 'Finale Addition: state + Startzustand', st: tr.final, hl: null }]);
          const colors = ['hi', 'key', 'nonce', 'ctr'];
          const isRfc = U.equal(key, RFC_KEY) && U.equal(nonce, RFC_NONCE) && ctr === 1;
          out.append(UI.stepper(steps.length, (i, body) => {
            const s = steps[i];
            const grp = {};
            if (s.hl) s.hl.forEach((g, gi) => g.forEach((w) => (grp[w] = colors[gi])));
            body.append(h('h4', null, s.title), words(s.st, { cls: (w) => (s.hl ? grp[w] : i === 0 ? stateCls(w) : '') }),
              s.hl ? h('p', { class: 'small muted' }, 'Gleiche Farbe = dieselbe Quarterround: ', s.hl.map((g) => `QR(${g.join(',')})`).join('  ')) : null,
              i === steps.length - 1 ? h('div', null, h('h4', null, 'Schlüsselstrom (64 Byte, little endian serialisiert)'), UI.bytes(tr.keystream, { cols: 16 }),
                isRfc ? UI.callout('success', 'RFC 8439, Abschnitt 2.3.2', 'Stimmt mit dem offiziellen Testvektor überein (10 f1 e7 e4 d1 3b 59 15 …).') : null) : null);
          }, { label: (i) => steps[i].title, interval: 600 }));
        };
        el.append(UI.card('Eingaben (Standard: Testvektor RFC 8439 §2.3.2)',
          UI.field('Schlüssel (32 Byte Hex)', keyIn), h('div', { class: 'row mt' }, UI.field('Nonce (12 Byte Hex)', nonceIn), UI.field('Zähler', ctrIn), UI.button('Berechnen', run, { kind: 'accent' }))), out);
        run();
      } },
      { title: '🧪 Quarterround', render(el) {
        const ins = ['11111111', '01020304', '9b8d6f43', '01234567'].map((v) => UI.input({ value: v, mono: true, w: 's' }));
        const out = h('div');
        const run = () => {
          UI.clear(out);
          const v = ins.map((i) => parseInt(i.value, 16) >>> 0);
          const r = KQ.chacha.quarterRound(...v);
          const cur = { a: v[0], b: v[1], c: v[2], d: v[3] };
          out.append(UI.table(['Schritt', 'a', 'b', 'c', 'd'], r.steps.map((s) => { cur[s.reg] = s.val; return [s.label, ...['a', 'b', 'c', 'd'].map((k) => (k === s.reg ? `<b>${U.hex32(cur[k])}</b>` : U.hex32(cur[k])))]; }), { mono: true, wrap: false }),
            h('p', { class: 'small muted' }, 'Voreinstellung = RFC 8439 §2.1.1: Ergebnis ea2a92f4 cb1cf8ce 4581472e 5881c4bb.'));
        };
        el.append(UI.card('QR(a, b, c, d) Schritt für Schritt', h('div', { class: 'row' }, ...ins.map((x, i) => UI.field('abcd'[i], x)), UI.button('Berechnen', run, { kind: 'accent' })), out));
        run();
      } },
      { title: '⚔️ Challenges', render(el, ctx) {
        const sets = U.shuffle(CC.COLUMN_QR.map((g) => [g, 'S']).concat(CC.DIAG_QR.map((g) => [g, 'D'])));
        const ans = {}; const r1 = h('div');
        const key = U.randomBytes(32), nonce = U.randomBytes(12);
        const m1 = 'ANGRIFF IM MORGENGRAUEN AM OSTTOR', m2 = 'RUECKZUG UEBER DIE BRUECKE BEI NACHT';
        const L = Math.min(m1.length, m2.length);
        const c1 = CC.encrypt(key, nonce, 1, U.utf8(m1.slice(0, L))), c2 = CC.encrypt(key, nonce, 1, U.utf8(m2.slice(0, L)));
        el.append(
          UI.card('Challenge 1 · Spalte oder Diagonale?',
            h('div', { class: 'col' }, sets.map(([g], i) => h('div', { class: 'row' }, h('code', { style: { width: '140px' } }, `QR(${g.join(', ')})`), UI.segmented([['S', 'Spaltenrunde'], ['D', 'Diagonalrunde']], null, (v) => (ans[i] = v))))),
            h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
              UI.clear(r1);
              const wrong = sets.filter(([, t], i) => ans[i] !== t).length;
              if (!wrong) { r1.append(UI.status(true, 'alle richtig')); ctx.solve('qr'); } else r1.append(UI.status(false, `${wrong} falsch – Spalten haben Abstand 4, Diagonalen „wandern“ um 5`));
            }, { kind: 'accent' }), r1)),
          UI.card('Challenge 2 · Nonce-Reuse',
            h('p', null, 'Ein Gerät hat zwei Nachrichten mit demselben Schlüssel ', h('b', null, 'und derselben Nonce'), ' verschlüsselt. Die erste Nachricht ist dir bekannt (Known Plaintext). Bestimme die zweite.'),
            UI.kv([['m₁ (bekannt)', m1.slice(0, L)], ['c₁', U.hex(c1)], ['c₂', U.hex(c2)]]),
            T.answer('m₂ =', (v) => { if (v.toUpperCase() === m2.slice(0, L)) { ctx.solve('nonce'); return true; } return 'Tipp: m₂ = c₁ ⊕ c₂ ⊕ m₁'; }, { w: 'l' }),
            h('div', { class: 'mt' }, T.xorCalc())));
      } },
    ],
    quiz: [
      { q: 'Welche ChaCha20-Operation ist nichtlinear?', a: ['Addition mod 2³²', 'XOR', 'Rotation', 'Die Konstanten'], c: 0, e: 'Überträge der Addition machen sie nichtlinear über 𝔽₂.' },
      { q: 'Warum wird am Ende der Startzustand addiert?', a: ['Sonst ließen sich die invertierbaren Runden zurückrechnen', 'Für die Diffusion', 'Um den Zähler zu erhöhen', 'Damit der Strom 512 Bit lang ist'], c: 0, e: 'Feed-forward macht die Blockfunktion zur Einwegfunktion.' },
      { q: 'Wie viele Runden hat ChaCha20?', a: ['20 (10 Doppelrunden)', '10', '12', '14'], c: 0, e: 'Spalten- und Diagonalrunde wechseln sich ab.' },
      { q: 'Wie ist der ChaCha20-Zustand aufgebaut?', a: ['4 Konstanten, 8 Schlüssel-, 1 Zähler-, 3 Nonce-Wörter', '8 Konstanten, 8 Schlüsselwörter', '4×4 Bytes wie AES', '2 Wörter wie SIMON'], c: 0, e: '16 Wörter à 32 Bit = 512 Bit.' },
    ],
  });
})();
