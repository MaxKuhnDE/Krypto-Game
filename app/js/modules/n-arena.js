/* Welt N – Prüfungsarena: Prüfungs-Sprint, Zuordnungsspiele, Spickzettel */
(function () {
  'use strict';
  const { ui: UI, util: U, state: S } = KQ;
  const h = UI.h;

  // ======================================================================
  KQ.module({
    id: 'exam', world: 'N', title: 'Prüfungs-Sprint',
    short: 'Zufällige Fragen aus allen Stationen, mit Zeitmessung und Auswertung nach Themen.',
    keywords: 'prüfung klausur quiz sprint test wiederholung',
    challenges: { pass: { title: '≥ 80 % bei ≥ 20 Fragen', xp: 100 } },
    tabs: [
      { title: 'Sprint', render(el, ctx) {
        const pool = KQ.modules.filter((m) => m.world !== 'N').flatMap((m) => m.quiz.map((q, i) => ({ q, m, i })));
        let count = 20, worlds = new Set(KQ.worlds.map((w) => w.id));
        const box = h('div');
        const setup = () => {
          UI.clear(box);
          box.append(UI.card('Einstellungen',
            h('p', null, `${pool.length} Fragen im Pool.`),
            h('div', { class: 'row' }, h('span', null, 'Anzahl:'), UI.segmented([[10, '10'], [20, '20'], [30, '30'], [50, '50']], count, (v) => (count = +v))),
            h('div', { class: 'row mt' }, h('span', null, 'Welten:'), KQ.worlds.filter((w) => w.id !== 'N').map((w) => UI.toggle(w.id, worlds.has(w.id), (v) => (v ? worlds.add(w.id) : worlds.delete(w.id))))),
            h('div', { class: 'row mt' }, UI.button('Sprint starten', run, { kind: 'accent' }))));
        };
        const run = () => {
          const qs = U.shuffle(pool.filter((x) => worlds.has(x.m.world))).slice(0, count);
          if (!qs.length) { UI.toast('Keine Fragen', 'Mindestens eine Welt wählen.', ''); return; }
          UI.clear(box);
          let i = 0, right = 0; const wrong = [];
          const t0 = Date.now();
          const timer = h('span', { class: 'chip accent' });
          UI.interval(() => { const s = Math.floor((Date.now() - t0) / 1000); timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
          const area = h('div');
          const head = h('div', { class: 'row between' });
          box.append(head, area);
          const next = () => {
            UI.clear(area); UI.clear(head);
            head.append(h('b', null, `Frage ${i + 1} / ${qs.length}`), h('div', { style: { width: '240px' } }, UI.xpbar(i / qs.length)), h('span', null, `✓ ${right}`), timer);
            if (i >= qs.length) return finish();
            const { q, m, i: qi } = qs[i];
            const card = KQ.quizCard(q, (ok) => {
              if (ok) right++; else wrong.push(qs[i]);
              S.answer(m.id, qi, ok);
              area.append(h('div', { class: 'row mt' }, UI.button(i + 1 < qs.length ? 'Weiter →' : 'Auswertung', () => { i++; next(); }, { kind: 'accent' })));
            });
            area.append(h('div', { class: 'small muted' }, `${m.icon} ${m.title}`), card);
          };
          const finish = () => {
            UI.runLeave();
            const pct = Math.round((right / qs.length) * 100);
            S.recordExam(qs.length >= 20 ? pct : 0);
            if (pct >= 80 && qs.length >= 20) ctx.solve('pass');
            ctx.refresh();
            UI.clear(area);
            area.append(UI.callout(pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger', `${right} / ${qs.length} richtig (${pct} %)`, `Zeit: ${Math.round((Date.now() - t0) / 1000)} s.` + (qs.length < 20 ? ' Für die Challenge mindestens 20 Fragen wählen.' : '')));
            if (wrong.length) {
              const byMod = {};
              wrong.forEach((w) => (byMod[w.m.id] = (byMod[w.m.id] || 0) + 1));
              area.append(UI.card('Hier lohnt sich Wiederholung',
                h('div', { class: 'col' }, Object.entries(byMod).sort((a, b) => b[1] - a[1]).map(([id, n]) => { const m = KQ.moduleById[id]; return h('div', { class: 'row' }, UI.button(`${m.icon} ${m.title}`, () => KQ.go('#/m/' + id), { sm: true }), h('span', { class: 'muted small' }, `${n} Fehler`)); })),
                h('h4', null, 'Falsch beantwortet'),
                h('div', null, wrong.map((w) => h('div', { class: 'quiz-explain', style: { marginBottom: '8px' }, html: `<b>${w.q.q}</b><br>Richtig: ${w.q.a[w.q.c]}<br>${w.q.e || ''}` })))));
            }
            area.append(h('div', { class: 'row mt' }, UI.button('Neuer Sprint', setup, { kind: 'accent' })));
          };
          next();
        };
        el.append(UI.callout('exam', 'Open-Book-Klausur', 'Die Klausur ist Open Book (120 Minuten). Entscheidend ist nicht Auswendiglernen, sondern sicheres Anwenden: Beweisschritte begründen, Angriffe konstruieren, Rechnungen durchführen.'), box);
        setup();
      } },
    ],
  });

  // ======================================================================
  const MATCHES = [
    { id: 'attacks', title: 'Angriff → betroffenes Verfahren', pairs: [
      ['Frequenzanalyse', 'monoalphabetische Substitution'], ['Schlüssel-Wiederverwendung', 'OTP / Stromchiffre (c₁⊕c₂ = m₁⊕m₂)'], ['Padding-Oracle', 'CBC mit Fehlermeldung'],
      ['Malleability', 'CBC, CTR, Textbook-RSA, ElGamal'], ['Length-Extension', 'H(k‖m) mit Merkle-Damgård, CBC-MAC ohne Prefix'], ['Homomorphie-Fälschung', 'Textbook-RSA-Signatur'],
      ['Geburtstagsangriff', 'Kollisionen von Hashfunktionen'], ['Timing-Seitenkanal', 'naiver Euklid, S-Box-Tabellen'], ['Grovers Algorithmus', 'symmetrische Verfahren (halbe Schlüssellänge)'], ['Shors Algorithmus', 'RSA, DH, ElGamal'] ] },
    { id: 'goals', title: 'Baustein → was er sichert', pairs: [
      ['One-Time-Pad', 'nur Vertraulichkeit'], ['HMAC', 'nur Integrität/Authentizität'], ['AES-GCM', 'Vertraulichkeit + Integrität'],
      ['Digitale Signatur', 'Integrität + Nichtabstreitbarkeit'], ['Diffie-Hellman (unauthentisiert)', 'Schlüsselvereinbarung gegen passive Angreifer'], ['Salt bei Passwort-Hashes', 'Schutz vor Vorausberechnung (Rainbow Tables)'] ] },
    { id: 'games', title: 'Sicherheitsspiel → Ziel des Angreifers', pairs: [
      ['PRG', 'Ausgabe von echtem Zufall unterscheiden'], ['PRF / PRP', 'von idealer Zufallsfunktion/-permutation unterscheiden'], ['IND-CPA', 'erraten, welcher Klartext verschlüsselt wurde'],
      ['IND-CCA', 'dasselbe, trotz Entschlüsselungs-Orakel'], ['MAC-Sicherheit', 'gültigen Tag ohne REVEAL fälschen'], ['Kollisionsresistenz', 'm ≠ m′ mit H(m) = H(m′) finden'], ['EUF-CMA', 'Signatur für irgendeine nicht signierte Nachricht'] ] },
    { id: 'proofs', title: 'Beweis → Technik', pairs: [
      ['OTP ist perfekt sicher', 'k = c ⊕ m eindeutig ⇒ alle c gleich wahrscheinlich'], ['ECB nicht CPA-sicher', 'Unterscheider: Chiffrat-Wiederholung'], ['Poly-UHF ≤ d/p', 'Fundamentalsatz der Algebra'],
      ['Merkle-Damgård kollisionsresistent', 'Kollision rückwärts verfolgen, 2 Fälle'], ['RSA-Korrektheit', 'Euler-Fermat: m^(ed) = m·(m^φ)ᵏ'], ['Schnorr Soundness', 'Extraktor aus zwei Challenges'], ['Even-Mansour ist PRP', 'Bad-Event 𝒜 ∩ 𝒰 ≠ ∅'] ] },
  ];

  KQ.module({
    id: 'matching', world: 'N', title: 'Zuordnungsspiele',
    short: 'Angriffe, Schutzziele, Sicherheitsspiele und Beweistechniken richtig zusammenbringen.',
    keywords: 'zuordnen matching angriffe schutzziele spiele beweise übersicht',
    challenges: Object.fromEntries(MATCHES.map((g) => [g.id, { title: g.title, xp: 40 }])),
    tabs: MATCHES.map((g) => ({ title: g.title.split('→')[0].trim(), render(el, ctx) {
      const left = U.shuffle(g.pairs.map((p, i) => [i, p[0]])), right = U.shuffle(g.pairs.map((p, i) => [i, p[1]]));
      const assign = {}; let sel = null;
      const grid = h('div'), res = h('div');
      const colors = ['--c-key', '--c-nonce', '--c-ctr', '--c-hi', '--c-diff', '--c-const'];
      const colorOf = (li) => { const keys = Object.keys(assign).map(Number); const k = keys.indexOf(li); return k < 0 ? null : colors[k % colors.length]; };
      const draw = () => {
        UI.clear(grid);
        const btn = (txt, on, color, click) => h('button', { class: 'quiz-opt', type: 'button', onclick: click, style: Object.assign({}, on ? { outline: '2px solid var(--accent)' } : {}, color ? { borderColor: `var(${color})`, background: `color-mix(in srgb, var(${color}) 14%, var(--control))` } : {}) }, txt);
        const rAssigned = {}; Object.entries(assign).forEach(([l, r]) => (rAssigned[r] = +l));
        grid.append(h('div', { class: 'grid c2' },
          h('div', { class: 'col' }, left.map(([i, t]) => btn(t, sel === i, colorOf(i), () => { sel = i; draw(); }))),
          h('div', { class: 'col' }, right.map(([i, t]) => btn(t, false, rAssigned[i] !== undefined ? colorOf(rAssigned[i]) : null, () => {
            if (sel === null) return;
            Object.keys(assign).forEach((l) => { if (assign[l] === i) delete assign[l]; });
            assign[sel] = i; sel = null; draw();
          })))));
      };
      el.append(UI.card(g.title, h('p', { class: 'muted small' }, 'Links anklicken, dann das passende Gegenstück rechts. Gleiche Farbe = Paar.'), grid,
        h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
          UI.clear(res);
          const wrong = g.pairs.filter((_, i) => assign[i] !== i);
          if (!wrong.length) { res.append(UI.callout('success', 'Alles korrekt', '')); ctx.solve(g.id); }
          else res.append(UI.callout('danger', `${wrong.length} noch falsch oder offen`, ''));
        }, { kind: 'accent' }), UI.button('Lösung zeigen', () => { g.pairs.forEach((_, i) => (assign[i] = i)); draw(); }, { kind: 'subtle' })), res));
      draw();
    } })),
  });

  // ======================================================================
  const SHEET = [
    ['Formeln', [
      ['Caesar', 'c ≡ m + k (mod 26)'], ['OTP', 'c = m ⊕ k, perfekt sicher ⟺ K uniform & unabhängig'], ['Euler / Fermat', 'a^φ(n) ≡ 1; a^(p−2) ≡ a⁻¹ (mod p); in 𝔽_q: a⁻¹ = a^(q−2)'],
      ['φ(n)', 'n·∏(1 − 1/p); φ(pq) = (p−1)(q−1)'], ['Bézout', 'ggT(x, y) = ax + by'], ['Feistel', 'Lᵢ₊₁ = Rᵢ, Rᵢ₊₁ = Lᵢ ⊕ F(Rᵢ, kᵢ)'],
      ['CBC', 'cᵢ = E(k, cᵢ₋₁ ⊕ mᵢ), c₀ = IV'], ['CTR', 'cᵢ = mᵢ ⊕ E(k, IV + i)'], ['CBC-Malleability', 'M ⊕ M′ = C₀ ⊕ C₀′'],
      ['Padding-Oracle', 'P₁[15] = 0x01 ⊕ r₁₅ ⊕ C₀[15]'], ['CBC-MAC-Längenangriff', 'm₁ ‖ (m₂¹ ⊕ t₁) ‖ … hat Tag t₂'], ['MD-Padding', 'X ‖ 0ᵖ ‖ |X|'],
      ['HMAC', 'H((K⊕opad) ‖ H((K⊕ipad) ‖ X))'], ['Poly-UHF', 'U(K, M) = K^d + Σ Mᵢ Kⁱ mod p, Pr[Koll.] ≤ d/p'], ['Even-Mansour', 'F(K, X) = Π(K ⊕ X) ⊕ K'],
      ['Geburtstag', 'Pr[bad] ≤ q(q−1)/2^(κ+1) = O(q²/2^κ)'], ['DH', 'A = gᵃ, B = gᵇ, k = gᵃᵇ'], ['RSA', 'c = mᵉ, m = cᵈ mod n, ed ≡ 1 mod φ(n)'],
      ['ElGamal', 'c = (gʳ, yʳ·m), m = (c₁ˣ)⁻¹·c₂'], ['ElGamal-KEM / RSA-KEM', 'c = gʳ, m = pkʳ  /  c = rᵉ, m = H(r)'], ['RSA-PSS', 's = H(m‖r)ᵈ, prüfe sᵉ = H(m‖r)'],
      ['Schnorr', 'I = gᵏ, s = k + rx, prüfe gˢy⁻ʳ = I; Extraktor x = (s₁−s₂)(r₁−r₂)⁻¹'], ['EC-Addition', 'λ = (y₂−y₁)/(x₂−x₁) bzw. (3x₁²+a)/(2y₁); x₃ = λ² − x₁ − x₂; y₃ = λ(x₁ − x₃) − y₁'],
    ]],
    ['Wer sichert was?', [
      ['OTP / Stromchiffre / CBC / CTR', 'Vertraulichkeit ✓ · Integrität ✗'], ['MAC / CBC-MAC / HMAC', 'Vertraulichkeit ✗ · Integrität ✓'],
      ['Encrypt-then-MAC / AEAD (GCM, ChaCha20-Poly1305)', 'Vertraulichkeit ✓ · Integrität ✓'], ['Digitale Signatur', 'Vertraulichkeit ✗ · Integrität ✓ + Nichtabstreitbarkeit'],
    ]],
    ['Sicherheit der Modi', [['ECB', 'CPA ✗ · CCA ✗'], ['CBC / CTR', 'CPA ✓ · CCA ✗ (malleable)'], ['GCM / AEAD / EtM', 'CPA ✓ · CCA ✓'], ['Hierarchie', 'CCA2 ⇒ CCA1 ⇒ CPA']]],
    ['Annahmen', [['Stärke', 'DDH (stärkste) ⇒ CDH ⇒ DLOG (schwächste)'], ['Gruppen', 'ℤₚ* mit Safe Prime, QR-Untergruppe primer Ordnung; elliptische Kurven'], ['Pohlig-Hellman', 'kleine Faktoren der Gruppenordnung vermeiden']]],
    ['Game Hopping', [['① Dictionary', '≡, rein syntaktisch'], ['② Ideal ersetzen', '≈, Annahme + Reduktion'], ['③ Bad-Event', 'identical until bad: Adv ≤ Pr[bad]'], ['④ Pr[bad]', 'Union Bound / Geburtstag'], ['Regeln', 'ein Hop = eine Änderung; erst umformen, dann annehmen; Schnittstellen/Längen anpassen']]],
    ['Quanten', [['Grover', 'symmetrisch: 2ⁿ → 2^(n/2); AES-256 bleibt sicher'], ['Shor', 'bricht Faktorisierung und dlog: RSA, DH, ElGamal, ECC']]],
    ['Board-Fehler (zur Vorsicht)', [['RSA-Signatur', 'signieren mit d (s = mᵈ), nicht mit e'], ['RSA-PSS', 's = H(m‖r)ᵈ'], ['ElGamal-FO', 'Check c₁ ≠ gʳ (nicht pkʳ)'], ['ElGamal-KEM', 'return (c, m)'], ['Zusammenfassung', 'Inverses in 𝔽_q: a^(q−2), Ring: (R,·) Monoid']]],
  ];

  KQ.module({
    id: 'spickzettel', world: 'N', title: 'Interaktiver Spickzettel',
    short: 'Alle Formeln, Tabellen und Merksätze an einem Ort – durchsuchbar.',
    keywords: 'spickzettel cheat sheet formeln übersicht tabellen zusammenfassung',
    tabs: [{ title: 'Übersicht', render(el) {
      const out = h('div');
      const draw = (q) => {
        UI.clear(out);
        q = (q || '').toLowerCase();
        SHEET.forEach(([sec, rows]) => {
          const hit = rows.filter(([a, b]) => !q || (sec + a + b).toLowerCase().includes(q));
          if (!hit.length) return;
          out.append(UI.card(sec, UI.table(['', ''], hit.map(([a, b]) => [`<b>${a}</b>`, b]), { wrap: false })));
        });
        if (!out.childNodes.length) out.append(h('p', { class: 'muted' }, 'Nichts gefunden.'));
      };
      el.append(h('div', { class: 'row' }, UI.input({ placeholder: 'Filtern, z. B. „RSA“ oder „CBC“', w: 'l', oninput: (v) => draw(v) }), UI.button('Drucken', () => window.print())), out);
      draw('');
    } }],
  });
})();
