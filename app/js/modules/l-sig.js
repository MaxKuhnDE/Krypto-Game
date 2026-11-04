/* Welt L – Digitale Signaturen & Schnorr */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, nt: NT, sha256: SHA } = KQ;
  const h = UI.h;
  const B = NT.B;

  let key = null;
  const rsa = () => {
    if (!key) { const p = NT.randomPrime(256), q = NT.randomPrime(256), n = p * q, phi = (p - 1n) * (q - 1n), e = 65537n; key = { n, e, d: NT.modInv(e, phi) }; }
    return key;
  };
  const Hn = (str, mod) => { const b = SHA.hash(U.utf8(str)); let x = 0n; for (const v of b) x = (x << 8n) | BigInt(v); return NT.mod(x, mod); };
  const fmt = (x) => U.fmtBig(x);

  // ======================================================================
  KQ.module({
    id: 'signaturen', world: 'L', icon: '✍️', title: 'Digitale Signaturen & EUF-CMA',
    short: 'Signieren, Verifizieren, das EUF-CMA-Spiel – und warum Textbook-RSA-Signaturen fälschbar sind.',
    keywords: 'signatur euf-cma textbook rsa signatur fälschung homomorph rsa-pss hash-then-sign',
    challenges: { forge: { title: 'Homomorphie-Fälschung', xp: 60 }, existential: { title: 'Existenzielle Fälschung ohne Orakel', xp: 50 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Signaturverfahren',
            h('p', null, 'Drei Algorithmen: KeyGen() = (sk, vk), Sign(sk, m) = σ, Verify(vk, m, σ) ∈ {✓, ✗}. Korrektheit: Verify(vk, m, Sign(sk, m)) = ✓. Liefert Integrität, Authentizität ', h('b', null, 'und Nichtabstreitbarkeit'), ' (nur der Inhaber von sk kann signieren).')),
          UI.card('EUF-CMA',
            h('div', { class: 'grid c2' },
              UI.lib('L<sub>sig-real</sub>', ['VK(): return vk', 'Sign(m): return Sign(sk, m)', 'Ver(m, s): return Verify(vk, m, s)']),
              UI.lib('L<sub>sig-ideal</sub>', ['VK(): return vk', 'Sign(m): s := Sign(sk, m); 𝒮 := 𝒮 ∪ {(m, s)}; return s', 'Ver(m, s): return (m, s) ∈ 𝒮'])),
            h('p', null, 'Die Spiele unterscheiden sich nur in Ver. Der Angreifer gewinnt, sobald er ', h('b', null, 'irgendein'), ' neues Paar (m, s) ∉ 𝒮 mit Verify = ✓ findet – „existential“ macht den Angriff leichter, als man denkt.')),
          UI.card('Textbook-RSA-Signaturen (unsicher)',
            UI.formula('Sign((n, d), m): s = mᵈ mod n          Verify((n, e), m, s): m ≟ sᵉ mod n'),
            h('p', null, h('b', null, 'Homomorphie-Angriff: '), 'σ₁ = m₁ᵈ, σ₂ = m₂ᵈ ⇒ σ₁·σ₂ = (m₁m₂)ᵈ – eine gültige Signatur für m₁·m₂, die nie signiert wurde. ', h('b', null, 'Ohne jedes Orakel: '), 'wähle s, setze m := sᵉ mod n.'),
            UI.callout('errata', 'Board-Folie „Textbook RSA-Signatures“ / „RSA-PSS“', 'Dort steht beim Signieren s := mᵉ bzw. s := H(m‖r)ᵉ und beim Verifizieren m == cᵈ. Richtig: <b>signiert wird mit dem geheimen d</b> (s = mᵈ bzw. H(m‖r)ᵈ), <b>verifiziert mit dem öffentlichen e</b> (sᵉ ≟ m). Mit e könnte jeder „signieren“.')),
          UI.card('Fixes',
            UI.table(['Verfahren', 'Sign', 'Verify'], [
              ['RSA-PSS', 'r ← {0,1}^ω; s := H(m‖r)ᵈ mod n; return (r, s)', 'sᵉ ≟ H(m‖r) mod n'],
              ['Hash-then-Sign', 'x := H(t, m) (t: zufälliger Tag in vk/sk); s := Sign(sk, x)', 'Verify(vk, H(t, m), s)'],
            ], { wrap: false }),
            h('p', null, 'Das gesaltete Hashen zerstört die multiplikative Struktur und reduziert lange Nachrichten auf einen Hash fester Länge.')));
      } },
      { title: '⚔️ EUF-CMA-Spiel', render(el, ctx) {
        const k = rsa();
        const target = U.pick([42n, 77n, 91n, 143n, 221n]);
        let pss = false;
        const signed = new Set();
        const log = h('div', { class: 'mono small', style: { background: 'var(--code-bg)', border: '1px solid var(--stroke)', borderRadius: '6px', padding: '8px', maxHeight: '200px', overflow: 'auto' } });
        const sign = (m) => {
          if (pss) { const r = NT.randBetween(1n, 2n ** 64n); return { r, s: NT.modPow(Hn(m + '|' + r, k.n), k.d, k.n) }; }
          return { s: NT.modPow(NT.mod(B(m), k.n), k.d, k.n) };
        };
        const verify = (m, s, r) => (pss ? NT.modPow(s, k.e, k.n) === Hn(m + '|' + r, k.n) : NT.modPow(s, k.e, k.n) === NT.mod(B(m), k.n));
        const mIn = UI.input({ placeholder: 'm (Zahl)', mono: true, w: 's' });
        const fm = UI.input({ placeholder: 'm', mono: true, w: 's' }), fs = UI.input({ placeholder: 's', mono: true, w: 'l' }), fr = UI.input({ placeholder: 'r (nur PSS)', mono: true, w: 'm' });
        const res = h('div');
        el.append(UI.card('Fälsche eine Signatur',
          UI.kv([['vk: e', String(k.e)], ['vk: n', k.n.toString()]]),
          h('p', null, `Ziel A: gültige Signatur für m* = ${target}. Das Signatur-Orakel signiert alles – außer m*. Ziel B: irgendeine gültige Signatur, ganz ohne Orakel.`),
          UI.toggle('Verfahren: RSA-PSS statt Textbook', pss, (v) => { pss = v; UI.clear(log); signed.clear(); }),
          h('div', { class: 'row mt' }, mIn, UI.button('Sign-Orakel', () => {
            const m = mIn.value.trim();
            if (!/^\d+$/.test(m)) return;
            if (B(m) === target) { log.append(h('div', null, `Sign(${m}) → verweigert (Zielnachricht)`)); return; }
            const sg = sign(m); signed.add(m);
            log.append(h('div', null, `Sign(${m}) → s = ${sg.s}` + (pss ? `, r = ${sg.r}` : '')));
          }, { kind: 'accent' })), log,
          h('h4', null, 'Fälschung einreichen'),
          h('div', { class: 'row' }, fm, fs, pss ? fr : null, UI.button('Verify', () => {
            UI.clear(res);
            try {
              const m = fm.value.trim(), s = T.parseBig(fs.value), r = pss ? T.parseBig(fr.value || '0') : null;
              if (!/^\d+$/.test(m)) throw new Error('m als Zahl angeben');
              if (signed.has(m)) { res.append(UI.callout('warning', 'Keine Fälschung', 'Diese Nachricht hat das Orakel signiert ((m, s) ∈ 𝒮).')); return; }
              if (!verify(m, s, r)) { res.append(UI.callout('danger', 'Verify = ✗', pss ? 'Bei PSS hilft die Multiplikation nicht: H(m‖r) hat keine multiplikative Struktur.' : 'Signatur ungültig.')); return; }
              if (B(m) === target) { res.append(UI.callout('success', 'EUF-CMA gebrochen!', `σ für m* = ${target} gefälscht.`)); ctx.solve('forge'); }
              else if (!signed.size) { res.append(UI.callout('success', 'Existenzielle Fälschung ohne Orakel', 'Gültiges (m, s), ohne je etwas signieren zu lassen.')); ctx.solve('existential'); }
              else res.append(UI.callout('success', 'Gültige Fälschung', 'Auch das bricht EUF-CMA. Versuche noch m* oder eine Fälschung ganz ohne Orakel (Seite neu öffnen).'));
            } catch (e) { res.append(UI.callout('danger', 'Eingabe', e.message)); }
          })), res, h('div', { class: 'mt' }, T.calculator())));
      } },
    ],
    quiz: [
      { q: 'Was muss ein Angreifer im EUF-CMA-Spiel liefern?', a: ['Irgendein gültiges (m, s), das nicht vom Orakel stammt', 'Eine Signatur für eine vorgegebene Nachricht', 'Den geheimen Schlüssel', 'Eine Kollision'], c: 0, e: '„existential“ – jede neue Nachricht zählt.' },
      { q: 'Aus σ₁ = Sign(m₁), σ₂ = Sign(m₂) folgt bei Textbook-RSA:', a: ['σ₁·σ₂ ist gültig für m₁·m₂', 'σ₁ + σ₂ ist gültig für m₁ + m₂', 'nichts', 'σ₁/σ₂ = d'], c: 0, e: 'Homomorphie.' },
      { q: 'Womit wird bei RSA signiert?', a: ['mit dem geheimen Exponenten d', 'mit dem öffentlichen e', 'mit φ(n)', 'mit p und q getrennt'], c: 0, e: 'Verifiziert wird mit e.' },
      { q: 'Welche Eigenschaft hat eine Signatur, ein MAC aber nicht?', a: ['Nichtabstreitbarkeit', 'Integrität', 'Authentizität', 'Effizienz'], c: 0, e: 'Nur der Signierende kennt sk.' },
    ],
  });

  // ======================================================================
  const SG = { p: 2039n, q: 1019n, g: 4n };
  const chal = (I, m) => Hn(I.toString() + '|' + m, SG.q);

  KQ.module({
    id: 'schnorr', world: 'L', icon: '🪪', title: 'Schnorr-Protokoll & -Signatur',
    short: 'Zero-Knowledge-Identifikation: Vollständigkeit, Extraktor, Simulator – und Fiat-Shamir zur Signatur.',
    keywords: 'schnorr identifikation zero knowledge soundness extraktor simulator fiat shamir signatur nonce',
    challenges: { extract: { title: 'Extraktor: x aus zwei Antworten', xp: 50 }, nonce: { title: 'Nonce-Reuse in Signaturen', xp: 60 }, cheat: { title: 'Betrügen ohne x (1 Bit)', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Protokoll (P kennt x, öffentlich y = gˣ)',
            UI.lib('Schnorr', ['P: k ← ℤ_q, I := gᵏ          ──── I ────▶', '                              ◀──── r ────   V: r ← ℤ_q (Challenge)', 'P: s := k + r·x mod q       ──── s ────▶', '                                             V: prüft gˢ · y⁻ʳ ≟ I'])),
          UI.table(['Eigenschaft', 'Aussage', 'Beweis'], [
            ['Vollständigkeit', 'Ein P, der x kennt, überzeugt einen ehrlichen V', 'gˢy⁻ʳ = g^(k+rx) g^(−rx) = gᵏ = I'],
            ['(Special) Soundness', 'Wer auf zwei Challenges r₁ ≠ r₂ (gleiches I) antworten kann, kennt x', 'gˢ¹y⁻ʳ¹ = gˢ²y⁻ʳ² ⇒ x = (s₁ − s₂)(r₁ − r₂)⁻¹ mod q (Extraktor)'],
            ['Honest-Verifier-ZK', 'V lernt nichts über x außer, dass P es kennt', 'Simulator: r, s zufällig, I := gˢy⁻ʳ – ununterscheidbares Transkript'],
          ], { wrap: false }),
          UI.card('Schnorr-Signatur (Fiat-Shamir)',
            h('p', null, 'Die interaktive Challenge wird durch einen Hash ersetzt: ', h('b', null, 'r := H(I, m)'), '.'),
            UI.lib('Schnorr-Signatur', ['Sign(m, x): k ← ℤ_q; I := gᵏ; r := H(I, m); s := k + r·x; return (I, s)', 'Verify(m, (I, s), y): r := H(I, m); prüfe gˢ · y⁻ʳ ≟ I']),
            UI.callout('danger', 'k muss frisch und geheim sein', 'Zwei Signaturen mit demselben k (gleiches I) für verschiedene m liefern genau die Situation des Extraktors ⇒ x ist sofort berechenbar (vgl. Sony PS3/ECDSA 2010). Auch ein vorhersagbares r (statt H(I, m)) bricht die Sicherheit.')));
      } },
      { title: '🧪 Protokoll spielen', render(el) {
        const { p, q, g } = SG;
        const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
        const out = h('div');
        let k = null, I = null;
        const start = () => {
          UI.clear(out);
          k = NT.randBetween(1n, q - 1n); I = NT.modPow(g, k, p);
          const rIn = UI.input({ value: String(NT.randBetween(1n, q - 1n)), mono: true, w: 's' });
          const res = h('div');
          out.append(h('div', { class: 'msg' }, `P → V: I = gᵏ = ${I}`),
            h('div', { class: 'row' }, h('span', null, 'Deine Challenge r ='), rIn, UI.button('senden', () => {
              UI.clear(res);
              const r = NT.mod(T.parseBig(rIn.value), q), s = NT.mod(k + r * x, q);
              const lhs = NT.mod(NT.modPow(g, s, p) * NT.modInv(NT.modPow(y, r, p), p), p);
              res.append(h('div', { class: 'msg r' }, `P → V: s = k + r·x mod q = ${s}`),
                UI.callout(lhs === I ? 'success' : 'danger', `gˢ · y⁻ʳ = ${lhs} ${lhs === I ? '= I ✓' : '≠ I'}`, 'Der Verifier ist überzeugt – und hat dabei nichts über x gelernt.'));
            }, { kind: 'accent' })), res, h('div', { class: 'row mt' }, UI.button('Neue Runde (neues k)', start, { sm: true })));
        };
        el.append(UI.card('Du bist der Verifier', UI.kv([['Gruppe', `p = ${p}, q = ${q}, g = ${g} (Ordnung q)`], ['y = gˣ', String(y)]]), h('div', { class: 'mt' }, out)));
        start();
      } },
      { title: '🧪 Simulator', render(el) {
        const { p, q, g } = SG;
        const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
        const real = [], sim = [];
        for (let i = 0; i < 8; i++) {
          const k = NT.randBetween(1n, q - 1n), r = NT.randBetween(1n, q - 1n);
          real.push([NT.modPow(g, k, p), r, NT.mod(k + r * x, q)]);
          const r2 = NT.randBetween(1n, q - 1n), s2 = NT.randBetween(1n, q - 1n);
          sim.push([NT.mod(NT.modPow(g, s2, p) * NT.modInv(NT.modPow(y, r2, p), p), p), r2, s2]);
        }
        const tbl = (rows) => UI.table(['I', 'r', 's', 'gˢy⁻ʳ = I?'], rows.map(([I, r, s]) => [I, r, s, NT.mod(NT.modPow(g, s, p) * NT.modInv(NT.modPow(y, r, p), p), p) === I ? '✓' : '✗']), { mono: true, wrap: false });
        el.append(UI.card('Echte vs. simulierte Transkripte',
          h('div', { class: 'grid c2' }, h('div', null, h('h4', null, 'Echt (mit x)'), tbl(real)), h('div', null, h('h4', null, 'Simuliert (ohne x!)'), tbl(sim))),
          UI.callout('info', 'Warum ist das Zero-Knowledge?', 'In beiden Fällen sind r und s gleichverteilt und I ist durch gˢy⁻ʳ = I bestimmt – die Verteilungen sind identisch. Was der Verifier sieht, hätte er sich selbst erzeugen können. Achtung: Der Simulator wählt r <i>vor</i> I – deshalb überzeugt er keinen echten Verifier.')));
      } },
      { title: '⚔️ Challenges', render(el, ctx) {
        const { p, q, g } = SG;
        const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
        const k = NT.randBetween(1n, q - 1n), I = NT.modPow(g, k, p);
        const r1 = NT.randBetween(1n, q - 1n); let r2 = NT.randBetween(1n, q - 1n); while (r2 === r1) r2 = NT.randBetween(1n, q - 1n);
        const s1 = NT.mod(k + r1 * x, q), s2 = NT.mod(k + r2 * x, q);
        const x2 = NT.randBetween(2n, q - 1n), y2 = NT.modPow(g, x2, p), k2 = NT.randBetween(1n, q - 1n), I2 = NT.modPow(g, k2, p);
        const mA = 'Ueberweise 10 EUR', mB = 'Ueberweise 10000 EUR';
        const ra = chal(I2, mA), rb = chal(I2, mB);
        const sa = NT.mod(k2 + ra * x2, q), sb = NT.mod(k2 + rb * x2, q);
        // Betrüger (1-Bit-Challenge)
        let wins = 0, played = 0;
        const cheatOut = h('div');
        let guess = '0';
        const guessIn = UI.segmented([['0', 'r̂ = 0'], ['1', 'r̂ = 1']], '0', (v) => (guess = v));
        const play = () => {
          const s = NT.randBetween(1n, q - 1n), rh = B(guess);
          const Ic = NT.mod(NT.modPow(g, s, p) * NT.modInv(NT.modPow(y, rh, p), p), p);
          const r = B(U.randInt(0, 1));
          played++;
          const ok = r === rh; if (ok) wins++;
          UI.clear(cheatOut);
          cheatOut.append(h('div', { class: 'msg' }, `Du sendest I = gˢ·y^(−${rh}) = ${Ic}; V wählt r = ${r}`),
            UI.callout(ok ? 'success' : 'danger', ok ? 'V akzeptiert (Glück gehabt)' : 'Erwischt – ohne x kannst du nicht antworten', `Bilanz: ${wins}/${played} – erwartet 50 %. Mit r ∈ ℤ_q wären es nur 1/q ≈ ${(1 / Number(q)).toFixed(4)}; t Wiederholungen mit 1-Bit-Challenges: 2⁻ᵗ.`));
          if (ok) ctx.solve('cheat');
        };
        el.append(
          UI.card('Challenge 1 · Extraktor (Special Soundness)',
            h('p', null, 'Ein Prover hat (versehentlich) für dasselbe I auf zwei Challenges geantwortet.'),
            UI.kv([['p, q, g', `${p}, ${q}, ${g}`], ['y', String(y)], ['I', String(I)], ['(r₁, s₁)', `(${r1}, ${s1})`], ['(r₂, s₂)', `(${r2}, ${s2})`]]),
            T.answer('x =', (v) => { if (NT.mod(B(v || 0), q) === x) { ctx.solve('extract'); return true; } return 'x = (s₁ − s₂)·(r₁ − r₂)⁻¹ mod q'; })),
          UI.card('Challenge 2 · Zwei Signaturen, dasselbe k',
            UI.kv([['y', String(y2)], [`Signatur für „${mA}“`, `(I = ${I2}, s = ${sa})`], [`Signatur für „${mB}“`, `(I = ${I2}, s = ${sb})`], ['r = H(I, m) mod q', `${ra} bzw. ${rb}`]]),
            T.answer('x =', (v) => { if (NT.mod(B(v || 0), q) === x2) { ctx.solve('nonce'); return true; } return 'gleiches I ⇒ gleiches k'; })),
          UI.card('Challenge 3 · Betrügerischer Prover (Challenge-Raum {0, 1})',
            h('p', null, 'Du kennst x nicht. Trick: Rate die Challenge r̂ vorab, wähle s zufällig und sende I := gˢ · y^(−r̂). Trifft V genau r̂, bestehst du.'),
            h('div', { class: 'row' }, guessIn, UI.button('Runde spielen', play, { kind: 'accent' })), cheatOut),
          T.calculator());
      } },
      { title: '🧪 Signatur', render(el) {
        const { p, q, g } = SG;
        const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
        let m = 'Hallo Schnorr';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const k = NT.randBetween(1n, q - 1n), I = NT.modPow(g, k, p), r = chal(I, m), s = NT.mod(k + r * x, q);
          const lhs = NT.mod(NT.modPow(g, s, p) * NT.modInv(NT.modPow(y, chal(I, m), p), p), p);
          out.append(UI.kv([['k (geheim, frisch)', String(k)], ['I = gᵏ', String(I)], ['r = H(I, m) mod q', String(r)], ['s = k + r·x mod q', String(s)], ['Signatur', `(I, s) = (${I}, ${s})`], ['Verify: gˢ·y⁻ʳ', `${lhs} ${lhs === I ? '= I ✓' : '≠ I ✗'}`]]));
        };
        el.append(UI.card('Fiat-Shamir in Aktion', UI.kv([['y = gˣ', String(y)]]), h('div', { class: 'row mt' }, UI.input({ value: m, w: 'l', oninput: (v) => { m = v; draw(); } }), UI.button('Neu signieren', draw)), out));
        draw();
      } },
    ],
    quiz: [
      { q: 'Wie extrahiert man x aus zwei Antworten auf dasselbe I?', a: ['x = (s₁ − s₂)(r₁ − r₂)⁻¹ mod q', 'x = s₁ · s₂', 'x = I / y', 'gar nicht'], c: 0, e: 'Special Soundness.' },
      { q: 'Was macht der ZK-Simulator?', a: ['Wählt r, s zufällig und berechnet I = gˢy⁻ʳ', 'Berechnet x', 'Rät k', 'Fragt den Prover'], c: 0, e: 'Er braucht x nicht.' },
      { q: 'Wodurch wird Schnorr nicht-interaktiv?', a: ['r := H(I, m) (Fiat-Shamir)', 'durch RSA', 'durch einen MAC', 'durch ein zweites k'], c: 0, e: 'Hash ersetzt den Verifier.' },
      { q: 'Was passiert, wenn k für zwei Signaturen wiederverwendet wird?', a: ['Der geheime Schlüssel x lässt sich berechnen', 'Nichts', 'Die Signaturen werden ungültig', 'Nur m wird sichtbar'], c: 0, e: 'Wie beim Extraktor.' },
    ],
  });
})();
