/* Welt K – Asymmetrische Kryptografie */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, nt: NT, ec: EC, sha256: SHA, aes: AES } = KQ;
  const h = UI.h;
  const B = NT.B;

  const MODP2048 = BigInt('0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF');
  const GROUPS = {
    tiny: { name: 'Lehrbuch: p = 23, g = 5', p: 23n, g: 5n, ord: 22n },
    small: { name: 'p = 2039 (Safe Prime), g = 4 erzeugt QR-Untergruppe (Ordnung 1019)', p: 2039n, g: 4n, ord: 1019n },
    big: { name: 'RFC 3526 MODP-2048, g = 2', p: MODP2048, g: 2n, ord: (MODP2048 - 1n) / 2n },
  };
  KQ.GROUPS = GROUPS;
  const keyFrom = (k) => SHA.hash(U.utf8(k.toString())).slice(0, 16);
  const fmt = (x) => U.fmtBig(x);

  // ======================================================================
  KQ.module({
    id: 'dh', world: 'K', title: 'Diffie-Hellman-Schlüsselaustausch',
    short: 'Gemeinsames Geheimnis über einen öffentlichen Kanal – sicher gegen Eve, wehrlos gegen Mallory.',
    keywords: 'diffie hellman dhke schlüsselaustausch key agreement transkript mitm man in the middle hashed',
    challenges: { eve: { title: 'Als Eve: kleine Gruppe brechen', xp: 50 }, mitm: { title: 'Als Mallory: Man-in-the-Middle', xp: 80 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Protokoll',
            UI.lib('DHKE (Gruppe G, Ordnung n, Erzeuger g)', ['Alice: a ← ℤₙ,  A := gᵃ      ──── A ────▶', '                              ◀──── B ────   Bob: b ← ℤₙ,  B := gᵇ', 'Alice: k := Bᵃ = gᵃᵇ                         Bob: k := Aᵇ = gᵃᵇ']),
            h('p', null, 'Genau genommen eine ', h('b', null, 'Schlüsselvereinbarung'), ' (key agreement): Beide beeinflussen k. Formal: (T, Y₁, Y₂) := (P₁ ⇌ P₂) mit Transkript T = (A, B) – das Einzige, was ein Lauscher sieht – und privaten Ausgaben Y₁ = Bᵃ, Y₂ = Aᵇ.')),
          UI.card('Sicherheit gegen passive Angreifer',
            h('div', { class: 'grid c2' }, UI.lib('L<sub>dhke-real</sub>', ['(T, K₁, K₂) := P₁ ⇌ P₂', 'EAVESDROP(): return (T, K₁)']), UI.lib('L<sub>dhke-ideal</sub>', ['(T, K₁, K₂) := P₁ ⇌ P₂', "K′ ← G", "EAVESDROP(): return (T, K′)"])),
            h('p', null, 'T und K₁ bilden genau ein DDH-Tripel (gᵃ, gᵇ, gᵃᵇ) ⇒ L_dhke-real ≈ L_dhke-ideal folgt direkt aus der ', h('b', null, 'DDH-Annahme'), '.'),
            h('p', null, h('b', null, 'Hashed DHKE: '), 'K := H(gᵃᵇ) liefert einen gleichverteilten Bitstring fester Länge – direkt als AES-Schlüssel nutzbar (Sicherheit dann zusätzlich mit H als Random Oracle).')),
          UI.callout('danger', 'Aktive Angreifer', 'DH allein authentifiziert niemanden. Mallory (aktiv) kann A und B austauschen und mit beiden Seiten getrennte Schlüssel vereinbaren (Man-in-the-Middle). Abhilfe: Signaturen/Zertifikate über die DH-Werte (TLS, SSH).'),
          UI.callout('info', 'Farbmisch-Analogie', 'Gemeinsame Grundfarbe (g) + geheime Farbe → Mischung lässt sich verschicken; Entmischen (diskreter Log) ist schwer, Weitermischen leicht.'));
      } },
      { title: 'Labor', render(el) {
        let gk = 'tiny';
        const box = h('div');
        const draw = () => {
          UI.clear(box);
          const G = GROUPS[gk];
          let a = NT.randBetween(2n, G.ord - 1n), b = NT.randBetween(2n, G.ord - 1n);
          const view = h('div');
          const upd = () => {
            UI.clear(view);
            const A = NT.modPow(G.g, a, G.p), Bv = NT.modPow(G.g, b, G.p);
            const kA = NT.modPow(Bv, a, G.p), kB = NT.modPow(A, b, G.p);
            const eveOut = h('div');
            view.append(h('div', { class: 'people' },
              h('div', { class: 'person' }, h('div', { class: 'p-head' }, h('span', { class: 'p-ava' }, 'A'), 'Alice'),
                UI.field('geheim a', UI.input({ value: a.toString(), mono: true, w: 'full', oninput: (v) => { try { a = B(v); } catch (e) { /* */ } } })),
                h('div', { class: 'msg' }, 'A = gᵃ = ' + fmt(A)), h('div', { class: 'msg' }, 'k = Bᵃ = ' + fmt(kA))),
              h('div', { class: 'channel' }, h('b', null, 'Öffentlicher Kanal (Eve liest mit)'),
                h('div', { class: 'msg' }, 'p = ' + fmt(G.p) + ', g = ' + G.g), h('div', { class: 'msg' }, 'Alice → Bob: A = ' + fmt(A)), h('div', { class: 'msg r' }, 'Bob → Alice: B = ' + fmt(Bv)),
                h('div', { class: 'mt' }, UI.button('Eve: diskreten Log versuchen', () => {
                  UI.clear(eveOut);
                  if (G.ord > 10n ** 7n) { eveOut.append(UI.callout('info', 'Aussichtslos', `Gruppenordnung ≈ 2^${G.ord.toString(2).length}. Brute Force bräuchte so viele Schritte; selbst das Zahlkörpersieb liegt bei ≈ 2¹¹² Operationen für 2048 Bit.`)); return; }
                  const t0 = performance.now(); const r = NT.dlogBrute(G.g, A, G.p, G.ord);
                  eveOut.append(UI.callout('danger', `Gebrochen in ${r.tries} Versuchen (${(performance.now() - t0).toFixed(1)} ms)`, `a = ${r.x} ⇒ k = Bᵃ = ${NT.modPow(Bv, r.x, G.p)}. Kleine Gruppen sind wertlos.`));
                }, { sm: true })), eveOut),
              h('div', { class: 'person' }, h('div', { class: 'p-head' }, h('span', { class: 'p-ava' }, 'B'), 'Bob'),
                UI.field('geheim b', UI.input({ value: b.toString(), mono: true, w: 'full', oninput: (v) => { try { b = B(v); } catch (e) { /* */ } } })),
                h('div', { class: 'msg' }, 'B = gᵇ = ' + fmt(Bv)), h('div', { class: 'msg' }, 'k = Aᵇ = ' + fmt(kB)))),
              h('div', { class: 'row mt' }, UI.button('Neu berechnen', upd, { kind: 'accent' }), kA === kB ? UI.status(true, 'beide haben denselben Schlüssel') : UI.status(false, 'verschieden'),
                h('span', { class: 'small muted' }, 'Hashed DH: K = SHA-256(k) = ' + U.hex(SHA.hash(U.utf8(kA.toString()))).slice(0, 32) + '…')));
          };
          upd();
          box.append(view);
        };
        el.append(UI.card('Gruppe', UI.segmented(Object.entries(GROUPS).map(([k, v]) => [k, v.name]), gk, (v) => { gk = v; draw(); })), box);
        draw();
      } },
      { title: 'Als Eve', render(el, ctx) {
        const p = 1019n, g = 2n;
        const a = NT.randBetween(10n, 1000n), b = NT.randBetween(10n, 1000n);
        const A = NT.modPow(g, a, p), Bv = NT.modPow(g, b, p), k = NT.modPow(A, b, p);
        const xIn = UI.input({ mono: true, w: 's', placeholder: 'x' }); const tOut = h('span', { class: 'mono' });
        el.append(UI.card('Abgehört: ein DH-Austausch in einer viel zu kleinen Gruppe',
          UI.kv([['p', String(p)], ['g', String(g)], ['A', String(A)], ['B', String(Bv)]]),
          h('p', null, 'Berechne das gemeinsame Geheimnis k = gᵃᵇ. (Hinweis: diskreten Log von A per Probieren finden, dann k = Bᵃ.)'),
          h('div', { class: 'card flat' }, h('b', null, 'Eves Werkzeug: gˣ mod p'), h('div', { class: 'row mt' }, xIn, UI.button('berechnen', () => { try { tOut.textContent = '= ' + NT.modPow(g, B(xIn.value), p); } catch (e) { tOut.textContent = '?'; } }, { sm: true }), tOut,
            UI.button('alle x bis 1018 durchsuchen', () => { const r = NT.dlogBrute(g, A, p); tOut.textContent = `gˣ = A für x = ${r.x} (${r.tries} Versuche)`; }, { sm: true }))),
          h('div', { class: 'mt' }, T.answer('k =', (v) => { if (B(v || 0) === k) { ctx.solve('eve'); return true; } return 'nein'; })),
          h('div', { class: 'mt' }, T.calculator())));
      } },
      { title: 'Als Mallory', render(el, ctx) {
        const G = GROUPS.small;
        const a = NT.randBetween(2n, G.ord - 1n), b = NT.randBetween(2n, G.ord - 1n), m = NT.randBetween(2n, G.ord - 1n);
        const A = NT.modPow(G.g, a, G.p), Bv = NT.modPow(G.g, b, G.p), M = NT.modPow(G.g, m, G.p);
        const st = { toBob: null, toAlice: null, kAM: null, kBM: null, read: null, relayed: false };
        const secret = 'Treffpunkt: Bahnhof, Gleis ' + U.randInt(1, 12);
        const view = h('div');
        const log = [];
        const draw = () => {
          UI.clear(view);
          const kAlice = st.toAlice !== null ? NT.modPow(st.toAlice, a, G.p) : null;
          const kBob = st.toBob !== null ? NT.modPow(st.toBob, b, G.p) : null;
          const cAlice = kAlice !== null ? AES.ctr(keyFrom(kAlice), new Uint8Array(8), U.utf8(secret)) : null;
          const step = st.toBob === null ? 1 : st.toAlice === null ? 2 : !st.relayed ? 3 : 4;
          const actions = h('div', { class: 'col' });
          if (step === 1) actions.append(h('p', null, `Alice sendet A = ${A}.`), h('div', { class: 'row' }, UI.button('Unverändert an Bob', () => { st.toBob = A; log.push(['Alice → Bob', `A = ${A}`]); draw(); }), UI.button(`Ersetzen durch M = g^m = ${M}`, () => { st.toBob = M; log.push(['Mallory → Bob', `„A“ = ${M}`, true]); draw(); }, { kind: 'accent' })));
          if (step === 2) actions.append(h('p', null, `Bob antwortet mit B = ${Bv}.`), h('div', { class: 'row' }, UI.button('Unverändert an Alice', () => { st.toAlice = Bv; log.push(['Bob → Alice', `B = ${Bv}`]); draw(); }), UI.button(`Ersetzen durch M = ${M}`, () => { st.toAlice = M; log.push(['Mallory → Alice', `„B“ = ${M}`, true]); draw(); }, { kind: 'accent' })));
          if (step === 3) {
            actions.append(h('p', null, 'Alice verschlüsselt mit ihrem Schlüssel und sendet: ', h('code', null, U.hex(cAlice))),
              h('div', { class: 'row' },
                UI.button('k_A := A^m berechnen', () => { st.kAM = NT.modPow(A, m, G.p); draw(); }, { sm: true, disabled: st.kAM !== null }),
                UI.button('k_B := B^m berechnen', () => { st.kBM = NT.modPow(Bv, m, G.p); draw(); }, { sm: true, disabled: st.kBM !== null })),
              h('div', { class: 'row' },
                UI.button('Mit k_A entschlüsseln', () => { st.read = U.printable(AES.ctr(keyFrom(st.kAM), new Uint8Array(8), cAlice)); draw(); }, { disabled: st.kAM === null }),
                UI.button('Mit k_B neu verschlüsseln & an Bob', () => { st.relayed = 'reenc'; log.push(['Mallory → Bob', 'neu verschlüsselt', true]); draw(); }, { disabled: st.kBM === null || st.read === null, kind: 'accent' }),
                UI.button('Unverändert an Bob', () => { st.relayed = 'plain'; log.push(['Alice → Bob', 'Chiffrat']); draw(); })),
              st.read !== null ? h('p', null, 'Mallory liest: ', h('b', null, st.read)) : null);
          }
          if (step === 4) {
            const cBob = st.relayed === 'reenc' ? AES.ctr(keyFrom(st.kBM), new Uint8Array(8), U.utf8(st.read)) : cAlice;
            const bobReads = U.printable(AES.ctr(keyFrom(kBob), new Uint8Array(8), cBob));
            const ok = bobReads === secret && st.read === secret;
            actions.append(h('p', null, 'Bob entschlüsselt: ', h('b', null, bobReads)),
              ok ? UI.callout('success', 'Man-in-the-Middle erfolgreich', 'Mallory hat mitgelesen, Bob hat die richtige Nachricht erhalten – niemand hat etwas bemerkt. DH allein authentisiert niemanden.')
                : UI.callout('warning', 'Aufgeflogen oder nichts gelesen', bobReads !== secret ? 'Bob bekommt Datenmüll – er merkt, dass etwas nicht stimmt.' : 'Bob ist zufrieden, aber Mallory hat nichts mitgelesen.'),
              UI.button('Nochmal', () => ctx.goTab(3)));
            if (ok) ctx.solve('mitm');
          }
          view.append(h('div', { class: 'people' },
            h('div', { class: 'person' }, h('div', { class: 'p-head' }, h('span', { class: 'p-ava' }, 'A'), 'Alice'), h('div', { class: 'small' }, `A = ${A}`), kAlice !== null ? h('div', { class: 'msg' }, `ihr k = ${kAlice}`) : null),
            h('div', { class: 'channel' }, h('b', null, 'Kanal (Mallory kontrolliert ihn)'), h('div', { class: 'small muted' }, `eigenes m geheim, M = ${M}`),
              log.map(([w, t, evil]) => h('div', { class: 'msg' + (evil ? ' evil' : '') }, w + ': ' + t)),
              st.kAM !== null ? h('div', { class: 'msg evil' }, `k_A = ${st.kAM}`) : null, st.kBM !== null ? h('div', { class: 'msg evil' }, `k_B = ${st.kBM}`) : null),
            h('div', { class: 'person' }, h('div', { class: 'p-head' }, h('span', { class: 'p-ava' }, 'B'), 'Bob'), h('div', { class: 'small' }, `B = ${Bv}`), kBob !== null ? h('div', { class: 'msg' }, `sein k = ${kBob}`) : null)),
            h('div', { class: 'card' }, h('h4', { style: { marginTop: 0 } }, `Schritt ${Math.min(step, 4)}`), actions));
        };
        el.append(UI.callout('tip', 'Ziel', 'Lies Alices Nachricht mit, ohne dass Bob etwas merkt. Gruppe: p = 2039, g = 4.'), view);
        draw();
      } },
    ],
    quiz: [
      { q: 'Worauf beruht die passive Sicherheit von DHKE (formal)?', a: ['DDH-Annahme', 'Faktorisierung', 'Kollisionsresistenz', 'AES'], c: 0, e: 'T und K₁ bilden ein DDH-Tripel.' },
      { q: 'Was sieht ein passiver Lauscher bei DH?', a: ['Das Transkript T = (A, B)', 'a und b', 'gᵃᵇ', 'nichts'], c: 0, e: 'Plus öffentliche Parameter G, g.' },
      { q: 'Wogegen schützt DH allein NICHT?', a: ['Man-in-the-Middle (aktiver Angreifer)', 'Mitlesen des Transkripts', 'Brute Force bei 2048 Bit', 'Replay der Gruppe'], c: 0, e: 'Ohne Authentisierung keine Sicherheit gegen aktive Angreifer.' },
      { q: 'Warum Hashed DH, K := H(gᵃᵇ)?', a: ['Liefert gleichverteilten Bitstring fester Länge', 'Macht DH CCA-sicher', 'Verhindert MITM', 'Spart Rechenzeit'], c: 0, e: 'Gruppenelemente sind keine gleichverteilten Bitstrings.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'ddh', world: 'K', title: 'DLOG, CDH, DDH & Gruppenwahl',
    short: 'Welche Annahme ist stärker? Warum Safe Primes und die QR-Untergruppe? Pohlig-Hellman und ein DDH-Unterscheider live.',
    keywords: 'dlog cdh ddh annahme safe prime quadratische reste pohlig hellman legendre untergruppe',
    challenges: { break: { title: 'DDH in ganz ℤₚ* brechen', xp: 70 }, qr: { title: 'QR-Erzeuger finden', xp: 30 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Drei Annahmen',
            h('div', { class: 'grid c2' },
              UI.lib('L<sub>ddh-real</sub> ≈ L<sub>ddh-rand</sub>', ['a, b ← ℤₙ   (rand: zusätzlich c ← ℤₙ)', 'GET(): return (gᵃ, gᵇ, gᵃᵇ)   bzw. (gᵃ, gᵇ, gᶜ)']),
              UI.lib('L<sub>cdh-real</sub> ≈ L<sub>cdh-rand</sub>', ['a, b ← ℤₙ', 'GET():   return (gᵃ, gᵇ)', 'TEST(X): return X == gᵃᵇ   bzw. return false'])),
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, 'DLOG: '), 'aus gˣ das x berechnen ist schwer.'),
              h('li', null, h('b', null, 'CDH: '), 'aus (gᵃ, gᵇ) den Wert gᵃᵇ berechnen ist schwer.'),
              h('li', null, h('b', null, 'DDH: '), '(gᵃ, gᵇ, gᵃᵇ) von (gᵃ, gᵇ, gᶜ) unterscheiden ist schwer.'))),
          UI.card('Welche Annahme ist stärker?',
            h('pre', { class: 'code' }, 'DLOG lösbar  ⇒  CDH lösbar  ⇒  DDH lösbar\n\nAnnahme DDH  ⇒  Annahme CDH  ⇒  Annahme DLOG'),
            h('p', null, '„Eine Annahme wird stärker, je mehr man vom Angreifer verlangt, ', h('i', null, 'nicht'), ' zu können.“ Wer dlog kann, kann gᵃᵇ ausrechnen; wer gᵃᵇ ausrechnen kann, erkennt Tripel. DDH ist also die ', h('b', null, 'stärkste'), ' (riskanteste) Annahme, DLOG die schwächste. Board-Formulierung: Annahme(DDH) ≥ Annahme(CDH) ≥ Annahme(DLOG).')),
          UI.card('Geeignete Gruppen',
            h('ul', { class: 'tight' },
              h('li', null, 'ℤₚ* mit Safe Prime p = 2q + 1 (q prim) – genutzt wird meist die ', h('b', null, 'Untergruppe der quadratischen Reste'), ' (Ordnung q).'),
              h('li', null, 'Elliptische Kurven EC(a, b, p) mit 4a³ + 27b² ≠ 0.')),
            h('p', null, h('b', null, 'Warum nicht ganz ℤₚ*?'), ' (1) Kleine Untergruppen (Faktoren von p − 1) erlauben ', h('b', null, 'Pohlig-Hellman'), ': dlog in jeder kleinen Untergruppe per Brute Force, dann per CRT kombinieren. (2) In ganz ℤₚ* ist ', h('b', null, 'DDH sogar gebrochen'), ': Das Legendre-Symbol verrät, ob gᵃᵇ ein quadratischer Rest ist – und das ist aus gᵃ, gᵇ vorhersagbar (ab gerade ⟺ a oder b gerade). In der QR-Untergruppe primer Ordnung gibt es beides nicht.')),
          UI.callout('exam', 'Rechenbeispiel p = 23', '|ℤ₂₃*| = 22 = 2·11 ⇒ Untergruppen der Ordnung 1, 2, 11, 22. 5 ist Erzeuger (5¹¹ = 22 ≠ 1, 5² = 2 ≠ 1). QR-Untergruppe (Ordnung 11) wird von 5² = 2 erzeugt.'));
      } },
      { title: 'Pohlig-Hellman', render(el) {
        const presets = [[8101n, 6n], [7919n, 7n], [1019n, 2n]];
        let pi = 0;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const [p, g] = presets[pi];
          const x = NT.randBetween(2n, p - 2n), hv = NT.modPow(g, x, p);
          const ph = NT.pohligHellman(g, hv, p);
          const tries = ph.parts.reduce((s, t) => s + t.tries, 0);
          out.append(h('p', null, `p = ${p}, p − 1 = `, NT.factorize(p - 1n).map(({ p: q, e }) => (e > 1 ? `${q}^${e}` : q)).join(' · '), `, g = ${g}, gesucht x mit gˣ = ${hv}.`),
            UI.table(['Primpotenz qᵉ', 'g′ = g^((p−1)/qᵉ)', 'h′ = h^((p−1)/qᵉ)', 'x mod qᵉ', 'Versuche'], ph.parts.map((t) => [`${t.q}^${t.e} = ${t.qe}`, t.gi, t.hi, t.x, t.tries]), { mono: true, wrap: false }),
            UI.callout(NT.modPow(g, ph.x, p) === hv ? 'success' : 'danger', `CRT ⇒ x = ${ph.x}`, `Insgesamt ${tries} Versuche statt bis zu ${p - 1n} bei Brute Force. Je glatter p − 1, desto dramatischer.`));
        };
        el.append(UI.card('Diskreter Log in Teilen', UI.segmented(presets.map(([p], i) => [i, `p = ${p}`]), pi, (v) => { pi = +v; draw(); }), h('div', { class: 'mt' }, UI.button('Neues x', draw, { sm: true })), out,
          h('p', { class: 'small muted' }, 'p = 1019 ist eine Safe Prime: p − 1 = 2 · 509 – Pohlig-Hellman bringt fast nichts.')));
        draw();
      } },
      { title: 'DDH-Spiel', render(el, ctx) {
        let sub = false;
        const box = h('div');
        const start = () => {
          UI.clear(box);
          const p = 1019n, g = sub ? 4n : 2n, n = sub ? 509n : 1018n;
          box.append(UI.callout('info', sub ? 'QR-Untergruppe (Ordnung 509)' : 'Ganz ℤ₁₀₁₉* (Ordnung 1018)', sub ? 'Alle Elemente sind quadratische Reste – das Legendre-Symbol hilft nicht mehr.' : 'Hinweis: Das Legendre-Symbol (x/p) = x^((p−1)/2) mod p ist +1 für quadratische Reste, −1 sonst. gᵃᵇ ist QR ⟺ gᵃ oder gᵇ ist QR.'));
          T.distGame(box, {
            rounds: 30, need: sub ? 31 : 20, labels: ['echt (gᵃᵇ)', 'zufällig (gᶜ)'],
            setup: (b) => { const a = NT.randBetween(1n, n - 1n), bb = NT.randBetween(1n, n - 1n), c = NT.randBetween(1n, n - 1n); return { t: [NT.modPow(g, a, p), NT.modPow(g, bb, p), NT.modPow(g, b === 0 ? a * bb : c, p)] }; },
            render: (area, w) => {
              const leg = h('div');
              area.append(h('div', { class: 'row' }, ['gᵃ', 'gᵇ', 'Z'].map((l, i) => UI.chip(`${l} = ${w.t[i]}`, 'accent'))),
                h('div', { class: 'row mt' }, UI.button('Legendre-Symbole berechnen', () => { UI.clear(leg); leg.append(h('p', { class: 'mono' }, w.t.map((x, i) => `${['gᵃ', 'gᵇ', 'Z'][i]}: ${NT.legendre(x, p) > 0 ? '+1 (QR)' : '−1'}`).join('   '))); }, { sm: true })), leg);
            },
            onWin: () => ctx.solve('break'),
          });
        };
        el.append(UI.card('Unterscheide echte DH-Tripel von zufälligen', h('p', null, '30 Runden. Ziel: mindestens 20 richtig – zufälliges Raten schafft das nur in ≈ 5 % der Spiele.'),
          UI.toggle('In der QR-Untergruppe spielen', sub, (v) => { sub = v; start(); })), box);
        start();
      } },
      { title: 'Challenge', render(el, ctx) {
        el.append(UI.card('QR-Untergruppe von ℤ₂₃*',
          h('p', null, 'Gib ein Element der Ordnung 11 in ℤ₂₃* an (Erzeuger der Untergruppe der quadratischen Reste).'),
          T.answer('g =', (v) => { const g = +v; const o = NT.orderN(g, 23); if (o === 11) { ctx.solve('qr'); return true; } return o ? `Ordnung von ${g} ist ${o}` : 'kein Element von ℤ₂₃*'; })));
      } },
    ],
    quiz: [
      { q: 'Welche Annahme ist die stärkste?', a: ['DDH', 'CDH', 'DLOG', 'alle gleich stark'], c: 0, e: 'DDH zu brechen ist am leichtesten, also ist die Annahme am stärksten.' },
      { q: 'Warum ist DDH in ganz ℤₚ* (p > 2) gebrochen?', a: ['Das Legendre-Symbol von gᵃᵇ ist aus gᵃ, gᵇ vorhersagbar', 'Weil dlog dort leicht ist', 'Weil p prim ist', 'Ist es nicht'], c: 0, e: 'Deshalb nutzt man die QR-Untergruppe primer Ordnung.' },
      { q: 'Was nutzt Pohlig-Hellman aus?', a: ['Kleine Primfaktoren der Gruppenordnung', 'Kleine Exponenten', 'Schwache Zufallszahlen', 'Kollisionen'], c: 0, e: 'dlog pro Untergruppe + CRT.' },
      { q: 'Welche Untergruppenordnungen hat ℤ₂₃*?', a: ['1, 2, 11, 22', '1, 23', '1, 2, 4, 11', 'nur 22'], c: 0, e: 'Teiler von 22.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'ec', world: 'K', title: 'Elliptische Kurven',
    short: 'y² = x³ + ax + b: Sekanten-Addition über ℝ und 𝔽ₚ, Gruppenstruktur, ECDLP.',
    keywords: 'elliptische kurven ecc weierstrass punktaddition ecdlp skalarmultiplikation edwards montgomery',
    challenges: { add: { title: 'Punkte addieren', xp: 40 }, ecdlp: { title: 'Kleinen ECDLP lösen', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Weierstrass-Form',
            UI.formula('EC(a, b, p) = {(x, y) ∈ 𝔽ₚ² : y² = x³ + ax + b} ∪ {𝒪},    4a³ + 27b² ≠ 0'),
            h('p', null, 'Die Bedingung schließt singuläre Kurven (Spitzen, Selbstschnitte) aus. 𝒪 ist der Punkt im Unendlichen (neutrales Element).')),
          UI.card('Punktaddition',
            h('p', null, 'Gerade durch P und Q schneidet die Kurve in einem dritten Punkt; dessen Spiegelung an der x-Achse ist R = P + Q. Für P = Q nimmt man die Tangente.'),
            UI.formula('λ = (y₂ − y₁)/(x₂ − x₁)  bzw.  (3x₁² + a)/(2y₁);     x₃ = λ² − x₁ − x₂,   y₃ = λ(x₁ − x₃) − y₁'),
            h('p', null, 'Über 𝔽ₚ wird durch Multiplikation mit dem Inversen „dividiert“. Die Kurvenpunkte bilden mit dieser Addition eine (oft zyklische) Gruppe.')),
          UI.card('ECDLP',
            h('p', null, 'Gegeben P und Q = n·P = P + … + P (n-mal): n zu berechnen ist schwer. Vorteil gegenüber ℤₚ*: gleiche Sicherheit bei viel kürzeren Schlüsseln (256-Bit-EC ≈ 3072-Bit-RSA/DH), weil es keine Index-Calculus-Angriffe gibt.'),
            h('p', { class: 'small muted' }, 'Weitere Formen: Edwards x² + y² = 1 + d·x²y², Montgomery by² = x³ + ax² + x (z. B. Curve25519) – schnellere, leichter konstant-zeitige Formeln.')));
      } },
      { title: 'Über ℝ', render(el) {
        let a = -2, b = 2, x1 = -1.5, x2 = 0.5, s1 = 1, s2 = -1;
        const W = 560, Hh = 400, X0 = -3.2, X1 = 4, Y0 = -7, Y1 = 7;
        const cv = h('canvas', { width: W * 2, height: Hh * 2, class: 'viz', style: { maxWidth: W + 'px', aspectRatio: `${W}/${Hh}` } });
        const info = h('div');
        const sx = (x) => ((x - X0) / (X1 - X0)) * W, sy = (y) => Hh - ((y - Y0) / (Y1 - Y0)) * Hh;
        const pt = (x, s) => { const y = EC.real.ys(a, b, x); return y ? [x, s > 0 ? y[0] : y[1]] : null; };
        const draw = () => {
          const ctx = cv.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, W, Hh);
          ctx.strokeStyle = UI.css('--stroke-2'); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), Hh); ctx.stroke();
          ctx.strokeStyle = UI.css('--accent'); ctx.lineWidth = 2.2;
          [1, -1].forEach((sg) => { ctx.beginPath(); let pen = false; for (let i = 0; i <= 900; i++) { const x = X0 + ((X1 - X0) * i) / 900; const y = EC.real.ys(a, b, x); if (!y) { pen = false; continue; } const Y = sg > 0 ? y[0] : y[1]; pen ? ctx.lineTo(sx(x), sy(Y)) : ctx.moveTo(sx(x), sy(Y)); pen = true; } ctx.stroke(); });
          UI.clear(info);
          const P = pt(x1, s1), Q = pt(x2, s2);
          if (!P || !Q) { info.append(h('p', { class: 'muted' }, 'Für dieses x liegt kein Kurvenpunkt vor – Slider verschieben.')); return; }
          const R = EC.real.add(a, P, Q);
          const dot = (p, c, l) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), 5, 0, 7); ctx.fill(); ctx.fillStyle = UI.css('--text'); ctx.font = '13px ' + UI.css('--font'); ctx.fillText(l, sx(p[0]) + 7, sy(p[1]) - 7); };
          if (R) {
            const Rm = [R[0], -R[1]];
            ctx.strokeStyle = UI.css('--text-2'); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
            const l = Math.abs(P[0] - Q[0]) < 1e-9 ? (3 * P[0] * P[0] + a) / (2 * P[1]) : (Q[1] - P[1]) / (Q[0] - P[0]);
            ctx.beginPath(); ctx.moveTo(sx(X0), sy(P[1] + l * (X0 - P[0]))); ctx.lineTo(sx(X1), sy(P[1] + l * (X1 - P[0]))); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx(R[0]), sy(Rm[1])); ctx.lineTo(sx(R[0]), sy(R[1])); ctx.stroke(); ctx.setLineDash([]);
            dot(Rm, UI.css('--text-3'), '−R'); dot(R, UI.css('--danger'), 'R = P + Q');
          }
          dot(P, UI.css('--c-key'), 'P'); dot(Q, UI.css('--c-nonce'), 'Q');
          info.append(UI.kv([['P', P.map((v) => v.toFixed(3)).join(', ')], ['Q', Q.map((v) => v.toFixed(3)).join(', ')], ['R = P + Q', R ? R.map((v) => v.toFixed(3)).join(', ') : '𝒪 (senkrechte Gerade)'], ['4a³ + 27b²', String(4 * a ** 3 + 27 * b * b) + (4 * a ** 3 + 27 * b * b === 0 ? ' ⇒ singulär' : '')]]));
        };
        el.append(UI.card('Sekantenkonstruktion',
          h('div', { class: 'row' }, UI.slider({ label: 'a', min: -5, max: 3, step: 0.5, value: a, oninput: (v) => { a = v; draw(); } }), UI.slider({ label: 'b', min: -3, max: 5, step: 0.5, value: b, oninput: (v) => { b = v; draw(); } })),
          h('div', { class: 'row' }, UI.slider({ label: 'x(P)', min: -3, max: 3.5, step: 0.05, value: x1, oninput: (v) => { x1 = v; draw(); } }), UI.toggle('P unten', s1 < 0, (v) => { s1 = v ? -1 : 1; draw(); }),
            UI.slider({ label: 'x(Q)', min: -3, max: 3.5, step: 0.05, value: x2, oninput: (v) => { x2 = v; draw(); } }), UI.toggle('Q unten', s2 < 0, (v) => { s2 = v ? -1 : 1; draw(); })),
          h('div', { class: 'grid c2 mt' }, cv, info),
          h('p', { class: 'small muted' }, 'Tipp: Setze x(P) = x(Q) auf dieselbe Seite → Tangente (Verdopplung). Gegenüberliegende Seiten → senkrechte Gerade, R = 𝒪.')));
        requestAnimationFrame(draw);
      } },
      { title: 'Über 𝔽ₚ', render(el) {
        let p = 17, a = 2, b = 2, Pi = 0, Qi = 1, n = 1;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const c = EC.curve(a, b, p);
          if (!EC.discriminantOk(c)) { out.append(UI.callout('danger', 'Singulär', '4a³ + 27b² ≡ 0 mod p – keine elliptische Kurve.')); return; }
          const pts = EC.points(c);
          if (!pts.length) { out.append(UI.callout('warning', 'Keine Punkte', '')); return; }
          Pi = Math.min(Pi, pts.length - 1); Qi = Math.min(Qi, pts.length - 1);
          const P = pts[Pi], Q = pts[Qi];
          const tr = EC.addTrace(c, P, Q);
          const mult = EC.multiples(c, P);
          const S = 300, cell = S / p;
          let svg = `<svg viewBox="0 0 ${S + 20} ${S + 20}" width="${S + 20}" style="max-width:100%"><rect x="10" y="10" width="${S}" height="${S}" fill="none" stroke="var(--stroke)"/>`;
          const onPath = new Set(mult.slice(0, n).filter(Boolean).map((q) => q.join(',')));
          pts.forEach((q, i) => { const cx = 10 + (q[0] + 0.5) * cell, cy = 10 + S - (q[1] + 0.5) * cell; const k = q.join(','); svg += `<circle cx="${cx}" cy="${cy}" r="${Math.max(2.5, cell * 0.32)}" fill="${i === Pi ? 'var(--c-key)' : i === Qi ? 'var(--c-nonce)' : tr.R && k === tr.R.join(',') ? 'var(--danger)' : onPath.has(k) ? 'var(--accent)' : 'var(--stroke-strong)'}"/>`; });
          svg += '</svg>';
          const nP = mult[n - 1];
          out.append(h('div', { class: 'grid c2' }, UI.html(svg), h('div', null,
            h('p', null, `#E(𝔽${p}) = ${pts.length + 1} Punkte (inkl. 𝒪). Ordnung von P: ${mult.length}.`),
            h('div', { class: 'row' }, UI.field('P (lila)', UI.select(pts.map((q, i) => [i, EC.fmt(q)]), Pi, (v) => { Pi = +v; draw(); })), UI.field('Q (grün)', UI.select(pts.map((q, i) => [i, EC.fmt(q)]), Qi, (v) => { Qi = +v; draw(); }))),
            UI.callout('info', `P + Q = ${EC.fmt(tr.R)} (rot)`, tr.case + (tr.R ? `<br>x₃ = λ² − x₁ − x₂, y₃ = λ(x₁ − x₃) − y₁ (mod ${p})` : '')),
            UI.slider({ label: 'n·P, n =', min: 1, max: mult.length, value: Math.min(n, mult.length), oninput: (v) => { n = v; draw(); } }),
            h('p', null, `${n}·P = ${EC.fmt(nP)} (blau: P, 2P, …, ${n}P)`))));
        };
        el.append(UI.card('Kurve über einem endlichen Körper',
          h('div', { class: 'row' }, UI.field('p', UI.select([11, 17, 23, 31, 37, 53, 61, 97], p, (v) => { p = +v; draw(); })),
            UI.field('a', UI.input({ type: 'number', value: a, w: 's', oninput: (v) => { a = +v; draw(); } })), UI.field('b', UI.input({ type: 'number', value: b, w: 's', oninput: (v) => { b = +v; draw(); } }))), out,
          h('p', { class: 'small muted' }, 'Voreinstellung y² = x³ + 2x + 2 über 𝔽₁₇: 19 Punkte, Gruppe ist zyklisch (Paar/Pelzl).')));
        draw();
      } },
      { title: 'Challenges', render(el, ctx) {
        const c = EC.curve(2, 2, 17);
        const pts = EC.points(c);
        let P = U.pick(pts), Q = U.pick(pts);
        while (EC.eq(P, Q) || P[0] === Q[0]) Q = U.pick(pts);
        const R = EC.add(c, P, Q);
        const G = [5, 1]; const n = U.randInt(3, 17); const T2 = EC.mul(c, n, G);
        const tp = UI.input({ placeholder: 'x', w: 's', mono: true }), tq = UI.input({ placeholder: 'k', w: 's', mono: true }), to = h('span', { class: 'mono' });
        el.append(UI.card(`Challenge 1 · Auf y² = x³ + 2x + 2 über 𝔽₁₇: P = ${EC.fmt(P)}, Q = ${EC.fmt(Q)}`,
          h('p', null, 'Berechne R = P + Q (Format „x, y“).'),
          T.answer('R =', (v) => { const [x, y] = v.split(',').map((s) => +s.trim()); if (x === R[0] && y === R[1]) { ctx.solve('add'); return true; } return 'λ = (y₂ − y₁)·(x₂ − x₁)⁻¹ mod 17'; }),
          h('div', { class: 'mt' }, T.calculator())),
          UI.card('Challenge 2 · ECDLP im Kleinen',
            h('p', null, `Gegeben G = (5, 1) und Q = ${EC.fmt(T2)}. Finde n mit Q = n·G.`),
            h('div', { class: 'card flat' }, h('b', null, 'Werkzeug: k·G berechnen'), h('div', { class: 'row mt' }, tq, UI.button('k·G', () => { to.textContent = '= ' + EC.fmt(EC.mul(c, +tq.value || 0, G)); }, { sm: true }), to)),
            T.answer('n =', (v) => { if (EC.eq(EC.mul(c, +v, G), T2)) { ctx.solve('ecdlp'); return true; } return 'nein'; }),
            h('p', { class: 'small muted' }, 'Bei 19 Gruppenelementen trivial – bei 2²⁵⁶ unmöglich (beste Angriffe ≈ 2¹²⁸).')));
        void tp;
      } },
    ],
    quiz: [
      { q: 'Wozu dient die Bedingung 4a³ + 27b² ≠ 0?', a: ['Ausschluss singulärer Kurven', 'Damit p prim ist', 'Für die Punktanzahl', 'Gegen Seitenkanäle'], c: 0, e: 'Sonst ist die Addition nicht wohldefiniert.' },
      { q: 'Was ist das neutrale Element der Kurvengruppe?', a: ['Der Punkt im Unendlichen 𝒪', '(0, 0)', '(1, 1)', 'P selbst'], c: 0, e: 'P + 𝒪 = P.' },
      { q: 'Warum sind EC-Schlüssel kürzer als RSA-Schlüssel gleicher Sicherheit?', a: ['Für ECDLP sind keine subexponentiellen Angriffe bekannt', 'Weil Kurven kleiner sind', 'Weil EC symmetrisch ist', 'Sind sie nicht'], c: 0, e: '256 Bit EC ≈ 3072 Bit RSA.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'rsa', world: 'K', title: 'RSA & Faktorisierungsangriffe',
    short: 'KeyGen, Ver-/Entschlüsselung, Korrektheit nach Euler – und drei Arten, schlecht gewähltes RSA zu brechen.',
    keywords: 'rsa faktorisierung probedivision ggt angriff gemeinsamer primfaktor kleines e kubikwurzel euler',
    challenges: { trial: { title: 'Probedivision', xp: 60 }, gcd: { title: 'ggT-Angriff', xp: 60 }, cube: { title: 'Kubikwurzel-Angriff', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('RSA (Rivest, Shamir, Adleman 1977)',
            h('ol', null, h('li', null, 'wähle Primzahlen p, q; n = p·q'), h('li', null, 'wähle e, d mit e·d ≡ 1 (mod φ(n)), φ(n) = (p−1)(q−1)'), h('li', null, 'pk = (e, n), sk = (d, n)')),
            UI.formula('Enc: c = mᵉ mod n          Dec: m = cᵈ mod n'),
            h('p', null, h('b', null, 'Korrektheit: '), 'cᵈ = mᵉᵈ, ed = 1 + kφ(n) ⇒ mᵉᵈ = m · (m^φ(n))ᵏ = m · 1ᵏ = m (mod n) nach Euler-Fermat. Sicherheit beruht auf der Schwierigkeit, n zu faktorisieren.')),
          UI.callout('exam', 'Rechenbeispiel aus der Vorlesung', 'p = 37, q = 17 ⇒ n = 629, φ = 36·16 = 576. e = 5 (ggT(5, 576) = 1). 576 = 115·5 + 1 ⇒ d ≡ −115 ≡ 461. Probe 5·461 = 2305 = 4·576 + 1 ✓.'),
          UI.card('Angriffe aus dem Skript',
            UI.table(['Angriff', 'Idee', 'Lehre'], [
              ['Probedivision', 'n = 37137: durch 3 teilbar ⇒ q = 12379 ⇒ φ, d', 'p, q müssen groß sein (≥ 1024 Bit je Faktor)'],
              ['ggT zweier Moduln', 'ggT(7493, 7729) = 59 – polynomiell, egal wie groß n ist', 'echter, unabhängiger Zufall pro Schlüssel (2012: tausende reale Schlüssel gebrochen)'],
              ['kleines e, kleines m', 'mᵉ < n ⇒ c = mᵉ über ℤ ⇒ m = ᵉ√c', 'Padding (OAEP) verwenden'],
            ], { wrap: false })),
          UI.card('Textbook-RSA hat zwei Probleme',
            h('ol', null, h('li', null, h('b', null, 'Deterministisch'), ' ⇒ nie CPA-sicher (Angreifer verschlüsselt m₀ selbst und vergleicht). Fix: Zufallspadding, (m‖r)ᵉ.'),
              h('li', null, h('b', null, 'Homomorph/malleable: '), 'Enc(m₀)·Enc(m₁) = (m₀m₁)ᵉ ⇒ nicht CCA-sicher.')),
            h('p', { class: 'muted' }, '→ Station „Malleability, FO & OAEP“. Quantencomputer: Shor faktorisiert effizient.')));
      } },
      { title: 'Labor', render(el) {
        const pIn = UI.input({ value: '37', mono: true, w: 'l' }), qIn = UI.input({ value: '17', mono: true, w: 'l' }), eIn = UI.input({ value: '5', mono: true, w: 'm' });
        const mIn = UI.input({ value: '123', mono: true, w: 'l' });
        const out = h('div');
        const run = () => {
          UI.clear(out);
          try {
            const p = T.parseBig(pIn.value), q = T.parseBig(qIn.value), e = T.parseBig(eIn.value);
            if (!NT.isPrime(p) || !NT.isPrime(q)) throw new Error('p und q müssen prim sein');
            if (p === q) throw new Error('p ≠ q wählen');
            const n = p * q, phi = (p - 1n) * (q - 1n);
            if (NT.gcd(e, phi) !== 1n) throw new Error(`ggT(e, φ) = ${NT.gcd(e, phi)} ≠ 1 – anderes e wählen`);
            const eg = NT.egcd(phi, e);
            const d = NT.mod(eg.b, phi);
            let m = /^\s*\d+\s*$/.test(mIn.value) ? T.parseBig(mIn.value) : NT.textToInt(mIn.value);
            if (m >= n) throw new Error(`m = ${fmt(m)} ≥ n – Nachricht zu groß für diesen Schlüssel`);
            const c = NT.modPow(m, e, n), m2 = NT.modPow(c, d, n);
            out.append(UI.kv([['n = p·q', fmt(n)], ['φ(n)', fmt(phi)], ['pk', `(e = ${e}, n)`], ['d = e⁻¹ mod φ', fmt(d)], ['Probe e·d mod φ', String(NT.mod(e * d, phi))], ['m', fmt(m)], ['c = mᵉ mod n', fmt(c)], ['cᵈ mod n', fmt(m2) + (/^\s*\d+\s*$/.test(mIn.value) ? '' : ` = „${NT.intToText(m2)}“`)]]));
            if (n < 10n ** 12n) out.append(h('h4', null, 'Erweiterter Euklid für d'), UI.table(['rᵢ', 'sᵢ', 'tᵢ', 'qᵢ'], eg.rows.map((r) => [r.r, r.s, r.t, r.q ?? '']), { mono: true, wrap: false }));
          } catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); }
        };
        el.append(UI.card('Schlüssel erzeugen, ver- und entschlüsseln',
          h('div', { class: 'row' }, UI.field('p', pIn), UI.field('q', qIn), UI.field('e', eIn)),
          h('div', { class: 'row mt' }, UI.field('Nachricht m (Zahl oder Text)', mIn), UI.button('Rechnen', run, { kind: 'accent' }),
            UI.button('Zufällige 512-Bit-Primzahlen', () => { pIn.value = NT.randomPrime(512).toString(); qIn.value = NT.randomPrime(512).toString(); eIn.value = '65537'; mIn.value = 'Hallo RSA'; run(); })),
          out));
        run();
      } },
      { title: 'Challenges', render(el, ctx) {
        const n1 = 37137n, e1 = 1021n; const m1 = NT.randBetween(1000n, 30000n); const c1 = NT.modPow(m1, e1, n1);
        const N1 = 7493n, N2 = 7729n, e2 = 17n; const m2 = NT.randBetween(1000n, 7000n); const c2 = NT.modPow(m2, e2, N1);
        const card3 = h('div');
        el.append(
          UI.card('Challenge 1 · Probedivision', UI.kv([['n', String(n1)], ['e', String(e1)], ['c', String(c1)]]),
            h('p', null, 'Faktorisiere n, berechne d und entschlüssele c.'),
            T.answer('m =', (v) => { if (B(v || 0) === m1) { ctx.solve('trial'); return true; } return 'nein'; })),
          UI.card('Challenge 2 · Zwei Schlüssel, ein schwacher Zufallsgenerator', UI.kv([['n₁', String(N1)], ['n₂', String(N2)], ['e (beide)', String(e2)], ['c (an n₁)', String(c2)]]),
            h('p', null, 'Die beiden Moduln stammen aus unabhängigen Schlüsselpaaren – angeblich. Entschlüssele c.'),
            T.answer('m =', (v) => { if (B(v || 0) === m2) { ctx.solve('gcd'); return true; } return 'nein'; })),
          card3, T.calculator());
        // Kubikwurzel – Schlüssel asynchron erzeugen
        card3.append(UI.card('Challenge 3 · e = 3 ohne Padding', h('p', { class: 'muted' }, 'Erzeuge 512-Bit-Schlüssel …')));
        setTimeout(() => {
          const p = NT.randomPrime(256), q = NT.randomPrime(256);
          const n = p * q, word = U.pick(['JA', 'NEIN', 'HILFE', 'GEHEIM', 'OK']);
          const m = NT.textToInt(word), c = NT.modPow(m, 3n, n);
          UI.clear(card3);
          card3.append(UI.card('Challenge 3 · e = 3 ohne Padding', UI.kv([['n (512 Bit)', fmt(n)], ['e', '3'], ['c', c.toString()]]),
            h('p', null, 'Ein kurzes Wort wurde mit Textbook-RSA verschlüsselt. Welches?'),
            T.answer('Wort =', (v) => { if (v.toUpperCase() === word) { ctx.solve('cube'); return true; } return 'nein'; }, { mono: false }),
            h('p', { class: 'small muted' }, 'Tipp: Ist mᵉ < n, gibt es keine Reduktion modulo n …')));
        }, 30);
      } },
    ],
    quiz: [
      { q: 'Worauf beruht die Sicherheit von RSA?', a: ['Faktorisierung von n', 'diskreter Logarithmus', 'Kollisionsresistenz', 'DDH'], c: 0, e: 'Wer p, q kennt, kennt φ(n) und damit d.' },
      { q: 'Warum ist der ggT-Angriff so gefährlich?', a: ['Er läuft in Polynomialzeit, egal wie groß n ist', 'Er braucht einen Quantencomputer', 'Er funktioniert nur bei kleinem e', 'Er braucht den Klartext'], c: 0, e: 'Euklid ist schnell – wenn zwei Moduln einen Faktor teilen.' },
      { q: 'Für die Korrektheit von RSA wird benutzt:', a: ['Satz von Euler-Fermat', 'Satz von Pythagoras', 'Geburtstagsparadoxon', 'Fundamentalsatz der Algebra'], c: 0, e: 'm^φ(n) ≡ 1.' },
      { q: 'Wozu dient Padding bei RSA NICHT?', a: ['Um n zu vergrößern', 'Um Enc probabilistisch zu machen', 'Um die Homomorphie zu zerstören', 'Gegen mᵉ < n bei kleinem e'], c: 0, e: 'Die drei anderen Gründe stehen im Skript.' },
    ],
  });

  // ======================================================================
  const EG = { p: 1019n, g: 2n, q: 1018n };
  KQ.module({
    id: 'elgamal', world: 'K', title: 'ElGamal',
    short: 'Public-Key-Verschlüsselung aus Diffie-Hellman: probabilistisch, CPA-sicher unter DDH – aber malleable.',
    keywords: 'elgamal public key verschlüsselung probabilistisch dhke ddh malleable',
    challenges: { decrypt: { title: 'Entschlüsseln', xp: 40 }, reuse: { title: 'r wiederverwendet', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Verfahren (Gruppe G, Ordnung n, Erzeuger g)',
            UI.lib('ElGamal', ['KeyGen(): sk = x ← ℤₙ;  pk = y = gˣ', 'Enc(y, m): r ← ℤₙ;  c₁ = gʳ;  c₂ = yʳ · m;  return (c₁, c₂)', 'Dec(x, (c₁, c₂)): m = (c₁ˣ)⁻¹ · c₂']),
            h('p', null, h('b', null, 'Korrektheit: '), '(c₁ˣ)⁻¹ · c₂ = g^(−rx) · g^(rx) · m = m. Sicherheit: dlog von y (formal: DDH ⇒ CPA-sicher).')),
          UI.card('Verwandtschaft mit DHKE',
            UI.table(['ElGamal', 'entspricht in DHKE'], [['pk = gˣ', 'erste Nachricht A = gᵃ'], ['c₁ = gʳ', 'zweite Nachricht B = gᵇ'], ['c₂ = yʳ · m', 'k · m, mit k = gᵃᵇ dem gemeinsamen Geheimnis']], { wrap: false }),
            h('p', null, 'ElGamal ist also ein DH-Austausch, bei dem der Empfänger seine Hälfte vorab veröffentlicht – und k als One-Time-Pad (multiplikativ) für m dient.')),
          UI.callout('warning', 'Malleable', '(c₁, k·c₂) entschlüsselt zu k·m – ohne m oder sk zu kennen. Und r darf nie wiederverwendet werden.'));
      } },
      { title: 'Labor', render(el) {
        let gk = 'small';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const G = gk === 'small' ? { p: EG.p, g: EG.g, ord: EG.q, name: 'p = 1019, g = 2' } : GROUPS.big;
          const x = NT.randBetween(2n, G.ord - 1n), y = NT.modPow(G.g, x, G.p);
          const mIn = UI.input({ value: '42', mono: true, w: 'm' });
          const res = h('div');
          const enc = () => {
            UI.clear(res);
            let m; try { m = T.parseBig(mIn.value); } catch (e) { return; }
            if (m <= 0n || m >= G.p) { res.append(UI.status(false, 'm muss in ℤₚ* liegen')); return; }
            const rows = [];
            for (let i = 0; i < 3; i++) {
              const r = NT.randBetween(2n, G.ord - 1n), c1 = NT.modPow(G.g, r, G.p), c2 = NT.mod(NT.modPow(y, r, G.p) * m, G.p);
              const dm = NT.mod(NT.modInv(NT.modPow(c1, x, G.p), G.p) * c2, G.p);
              rows.push([fmt(r), fmt(c1), fmt(c2), fmt(dm)]);
            }
            res.append(UI.table(['r (zufällig)', 'c₁ = gʳ', 'c₂ = yʳ·m', 'Dec'], rows, { mono: true, wrap: false }), h('p', { class: 'small muted' }, 'Dreimal dieselbe Nachricht – dreimal ein anderes Chiffrat: ElGamal ist probabilistisch.'));
          };
          out.append(UI.kv([['Gruppe', G.name || ''], ['sk = x', fmt(x)], ['pk = y = gˣ', fmt(y)]]), h('div', { class: 'row mt' }, UI.field('m', mIn), UI.button('3× verschlüsseln', enc, { kind: 'accent' })), res);
          enc();
        };
        el.append(UI.card('ElGamal ausprobieren', UI.segmented([['small', 'klein: p = 1019'], ['big', 'MODP-2048']], gk, (v) => { gk = v; draw(); }), out));
        draw();
      } },
      { title: 'Challenges', render(el, ctx) {
        const { p, g, q } = EG;
        const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
        const m = NT.randBetween(2n, 1000n), r = NT.randBetween(2n, q - 1n);
        const c1 = NT.modPow(g, r, p), c2 = NT.mod(NT.modPow(y, r, p) * m, p);
        const ma = NT.randBetween(2n, 1000n), mb = NT.randBetween(2n, 1000n), r2 = NT.randBetween(2n, q - 1n);
        const d1 = NT.modPow(g, r2, p), e1 = NT.mod(NT.modPow(y, r2, p) * ma, p), e2 = NT.mod(NT.modPow(y, r2, p) * mb, p);
        el.append(
          UI.card('Challenge 1 · Als Empfänger entschlüsseln', UI.kv([['p, g', `${p}, ${g}`], ['sk = x', String(x)], ['c₁', String(c1)], ['c₂', String(c2)]]),
            T.answer('m =', (v) => { if (B(v || 0) === m) { ctx.solve('decrypt'); return true; } return 'm = (c₁ˣ)⁻¹ · c₂ mod p'; })),
          UI.card('Challenge 2 · Ein Sender nutzt dasselbe r zweimal',
            h('p', null, 'Du kennst den ersten Klartext (bekanntes Dokument) und beide Chiffrate – aber nicht sk.'),
            UI.kv([['pk = y', String(y)], ['(c₁, c₂) für m₁', `(${d1}, ${e1})`], ['m₁ (bekannt)', String(ma)], ["(c₁′, c₂′) für m₂", `(${d1}, ${e2})`]]),
            T.answer('m₂ =', (v) => { if (B(v || 0) === mb) { ctx.solve('reuse'); return true; } return 'Tipp: c₂′ / c₂ = m₂ / m₁'; })),
          T.calculator());
      } },
    ],
    quiz: [
      { q: 'Warum ist ElGamal probabilistisch?', a: ['Bei jeder Verschlüsselung wird ein frisches r gezogen', 'Weil der Schlüssel zufällig ist', 'Weil m zufällig ist', 'Ist es nicht'], c: 0, e: 'Notwendig für CPA-Sicherheit bei PKE.' },
      { q: 'Wie entschlüsselt man (c₁, c₂)?', a: ['m = (c₁ˣ)⁻¹ · c₂', 'm = c₂ˣ', 'm = c₁ · c₂', 'm = c₂ − c₁ˣ'], c: 0, e: 'c₁ˣ = gʳˣ = yʳ.' },
      { q: 'Welche DHKE-Nachricht entspricht c₁?', a: ['die zweite (B = gᵇ)', 'die erste', 'das Geheimnis k', 'keine'], c: 0, e: 'pk ↔ erste Nachricht.' },
    ],
  });

  // ======================================================================
  // RSA-Schlüssel für die Malleability-Station (einmalig, 512 Bit)
  let rsaCache = null;
  const rsaKey = () => {
    if (!rsaCache) {
      const p = NT.randomPrime(256), q = NT.randomPrime(256), n = p * q, phi = (p - 1n) * (q - 1n);
      const e = 65537n;
      rsaCache = { n, e, d: NT.modInv(e, phi) };
    }
    return rsaCache;
  };
  const egFO = (() => {
    const p = MODP2048, g = 2n, q = (p - 1n) / 2n;
    const Hr = (v) => { const hb = SHA.hash(U.utf8('FO|' + v.toString())); let x = 0n; for (const b of hb) x = (x << 8n) | BigInt(b); return NT.mod(x, q); };
    const x = NT.randBetween(2n, q - 1n), y = NT.modPow(g, x, p);
    const enc = (m) => { const s = NT.randBetween(1n, 2n ** 64n); const ms = (m << 64n) | s; const r = Hr(ms); return [NT.modPow(g, r, p), NT.mod(ms * NT.modPow(y, r, p), p)]; };
    const dec = ([c1, c2]) => { const ms = NT.mod(c2 * NT.modInv(NT.modPow(c1, x, p), p), p); const r = Hr(ms); if (c1 !== NT.modPow(g, r, p) || c2 !== NT.mod(ms * NT.modPow(y, r, p), p)) return null; return ms >> 64n; };
    const encPlain = (m) => { const r = NT.randBetween(2n, q - 1n); return [NT.modPow(g, r, p), NT.mod(m * NT.modPow(y, r, p), p)]; };
    const decPlain = ([c1, c2]) => NT.mod(c2 * NT.modInv(NT.modPow(c1, x, p), p), p);
    return { p, enc, dec, encPlain, decPlain };
  })();

  KQ.module({
    id: 'pkcca', world: 'K', title: 'Malleability, CPA/CCA bei PKE, Fujisaki-Okamoto & OAEP',
    short: 'Versiegelte Gebote verdoppeln, Textbook-RSA im CPA-Spiel brechen – und sehen, wie FO und OAEP das verhindern.',
    keywords: 'malleability homomorph auktion pk-cpa 1cpa 1cca cca fujisaki okamoto oaep padding rsa elgamal',
    challenges: { cpa: { title: 'Textbook-RSA im CPA-Spiel', xp: 50 }, double: { title: 'Gebot verdoppeln', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('PK-CPA',
            UI.lib('PK-CPA (Links-oder-Rechts)', ['(pk, sk) := KeyGen(); b ← {0,1}', 'PK(): return pk', 'Enc(m₀, m₁): return Enc(pk, m_b)', 'Angreifer rät b′; Adv = |Pr[b′ = b] − ½| vernachlässigbar']),
            h('p', null, 'Da pk öffentlich ist, kann der Angreifer selbst verschlüsseln ⇒ Enc ', h('b', null, 'muss probabilistisch sein'), '.')),
          UI.card('One-Time vs. Many-Time',
            h('div', { class: 'grid c2' }, UI.lib('L<sup>1cpa-real</sup>', ['Enc(m): if c* undef: c* := Enc(pk, m)', '        return c*']), UI.lib('L<sup>1cca</sup> (zusätzlich)', ['Dec(c): return Dec(sk, c)', '(rand: if c == c*: return m*)'])),
            h('p', null, h('b', null, '1CPA ⟺ CPA'), ' (Hybrid-Argument) – also gleich stark, aber einfacher zu analysieren. Bei CCA gilt das nicht automatisch: Malleability bricht schon 1CCA, denn aus c* lässt sich ein verwandtes c′ ≠ c* bauen und entschlüsseln.')),
          UI.card('Malleability: die Auktion',
            UI.table(['Verfahren', 'Mallory berechnet', 'Bob entschlüsselt'], [['Textbook-RSA', 'c′ = c · kᵉ mod n', 'k · m'], ['ElGamal', 'c′ = (c₁, k · c₂)', 'k · m']], { wrap: false })),
          UI.card('Fujisaki-Okamoto (FO)',
            UI.lib('Σ* aus CPA-sicherem, probabilistischem Σ', ['Σ*.C(l) = Σ.C(l + λ)        ← Längenanpassung (Trick 4)', 'Enc(pk, m): s ← {0,1}^λ; r := H(m‖s); return Σ.Enc(pk, m‖s; r)', 'Dec(sk, c): m‖s := Σ.Dec(sk, c); r := H(m‖s)', '            if c ≠ Σ.Enc(pk, m‖s; r): return ⊥', '            return m']),
            h('p', null, 'Der Zufall wird aus Klartext + Salt abgeleitet; die Neuverschlüsselung beim Entschlüsseln erzwingt, dass c zu genau einem (m, s) gehört. Manipulierte Chiffrate ⇒ fast immer ⊥ ⇒ CCA-sicher (im RO-Modell).'),
            UI.callout('errata', 'Hinweis zu den Board-Folien', 'Bei „ElGamal mit Fujisaki-Okamoto“ steht im Dec-Check „c₁ ≠ pk^r“. Richtig ist <b>c₁ ≠ g^r</b> (wie in der Gesamtzusammenfassung), denn c₁ = gʳ.')),
          UI.card('RSA-OAEP',
            h('p', null, 'Löst dasselbe für RSA mit einer Feistel-artigen Konstruktion aus zwei Hashfunktionen G, H: X = (m ‖ 0ᵏ¹) ⊕ G(r), Y = r ⊕ H(X), dann (X‖Y)ᵉ mod n. Vorteil der Feistel-Struktur: invertierbar, obwohl G und H es nicht sind. Padding bei RSA (1) randomisiert, (2) zerstört die Homomorphie, (3) verhindert mᵉ < n.')));
      } },
      { title: 'Auktion', render(el) {
        const k = rsaKey();
        let scheme = 'rsa';
        const out = h('div');
        const bid = 1500n;
        const draw = () => {
          UI.clear(out);
          const rows = [];
          if (scheme === 'rsa') {
            const c = NT.modPow(bid, k.e, k.n); const cm = NT.mod(c * NT.modPow(2n, k.e, k.n), k.n);
            rows.push(['Bieterin', `c = ${bid}ᵉ mod n`, fmt(c)], ['Mallory', 'c′ = c · 2ᵉ mod n', fmt(cm)], ['Bob entschlüsselt c′', 'c′ᵈ mod n', '<b>' + NT.modPow(cm, k.d, k.n) + ' €</b> (doppelt!)']);
          } else if (scheme === 'eg') {
            const [c1, c2] = egFO.encPlain(bid); const c2m = NT.mod(c2 * 2n, egFO.p);
            rows.push(['Bieterin', '(c₁, c₂) = (gʳ, yʳ·m)', fmt(c2)], ['Mallory', 'c₂′ = 2 · c₂', fmt(c2m)], ['Bob entschlüsselt', '(c₁ˣ)⁻¹ · c₂′', '<b>' + egFO.decPlain([c1, c2m]) + ' €</b> (doppelt!)']);
          } else {
            const [c1, c2] = egFO.enc(bid); const c2m = NT.mod(c2 * 2n, egFO.p);
            const d0 = egFO.dec([c1, c2]), d1 = egFO.dec([c1, c2m]);
            rows.push(['Bieterin', 'FO: s zufällig, r = H(m‖s)', fmt(c2)], ['Bob, unverändert', 'Neuverschlüsselungs-Check', d0 === null ? '⊥' : `<b>${d0} €</b> ✓`], ['Mallory', 'c₂′ = 2 · c₂', fmt(c2m)], ['Bob entschlüsselt c′', 'Check: c₁ = g^H(m′‖s′)?', d1 === null ? '<b class="ok-text">⊥ – Manipulation erkannt</b>' : d1 + ' €']);
          }
          out.append(UI.table(['Wer', 'Rechnung', 'Ergebnis'], rows, { wrap: false }));
        };
        el.append(UI.card(`Versiegeltes Gebot: ${bid} €`, UI.segmented([['rsa', 'Textbook-RSA'], ['eg', 'ElGamal'], ['fo', 'ElGamal + Fujisaki-Okamoto']], scheme, (v) => { scheme = v; draw(); }), h('div', { class: 'mt' }, out)));
        draw();
      } },
      { title: 'CPA-Spiel', render(el, ctx) {
        const k = rsaKey();
        el.append(UI.callout('info', 'Textbook-RSA im PK-CPA-Spiel', `pk = (e = ${k.e}, n = ${fmt(k.n)}). Wähle m₀, m₁, erhalte Enc(pk, m_b) und rate b. Den öffentlichen Schlüssel darfst du selbst benutzen.`));
        T.distGame(el, {
          rounds: 10, need: 9, labels: ['m₀ wurde verschlüsselt', 'm₁ wurde verschlüsselt'],
          setup: (b) => ({ b }),
          render: (area, w, log) => {
            const a = UI.input({ value: '111', mono: true, w: 's' }), b = UI.input({ value: '222', mono: true, w: 's' });
            const own = UI.input({ placeholder: 'm', mono: true, w: 's' });
            area.append(h('div', { class: 'row' }, UI.field('m₀', a), UI.field('m₁', b), UI.button('Challenge anfordern', () => {
              const m = T.parseBig(w.b === 0 ? a.value : b.value);
              log(`Enc(m_b) = ${fmt(NT.modPow(m, k.e, k.n))}`);
            }, { kind: 'accent' })),
              h('div', { class: 'row mt' }, UI.field('selbst verschlüsseln (öffentlich!)', own), UI.button('Enc(pk, m)', () => { try { log(`selbst: Enc(${own.value}) = ${fmt(NT.modPow(T.parseBig(own.value), k.e, k.n))}`); } catch (e) { /* */ } })));
          },
          onWin: () => ctx.solve('cpa'),
        });
      } },
      { title: 'Als Mallory', render(el, ctx) {
        const k = rsaKey();
        const bid = NT.randBetween(100n, 5000n);
        const c = NT.modPow(bid, k.e, k.n);
        el.append(UI.card('Verdopple das Gebot unbemerkt',
          UI.kv([['pk: e', String(k.e)], ['pk: n', k.n.toString()], ['abgefangenes Gebot c', c.toString()]]),
          h('p', null, 'Gib ein c′ an, das Bob zu genau dem doppelten Gebot entschlüsselt (Bob verrät dir nur, ob es geklappt hat).'),
          T.answer('c′ =', (v) => { const m2 = NT.modPow(T.parseBig(v), k.d, k.n); if (m2 === 2n * bid) { ctx.solve('double'); return true; } return 'Bob liest kein doppeltes Gebot'; }, { w: 'l' }),
          h('div', { class: 'mt' }, T.calculator())));
      } },
    ],
    quiz: [
      { q: 'Warum ist Textbook-RSA nicht CPA-sicher?', a: ['Es ist deterministisch – der Angreifer kann mit pk selbst verschlüsseln und vergleichen', 'Weil n faktorisierbar ist', 'Weil e klein ist', 'Ist es doch'], c: 0, e: 'Jedes deterministische PKE ist nicht CPA-sicher.' },
      { q: 'Was erzwingt der Neuverschlüsselungs-Check bei Fujisaki-Okamoto?', a: ['Dass c zu genau einem (m, s) mit r = H(m‖s) passt', 'Dass m kurz ist', 'Dass der Schlüssel stimmt', 'Dass s geheim bleibt'], c: 0, e: 'Manipulierte Chiffrate werden mit ⊥ abgelehnt.' },
      { q: 'Gilt 1CCA ⟺ CCA automatisch wie 1CPA ⟺ CPA?', a: ['Nein – Malleability bricht schon 1CCA', 'Ja, per Hybrid-Argument', 'Nur bei RSA', 'Nur bei ElGamal'], c: 0, e: 'Aus c* lässt sich ein verwandtes c′ ≠ c* bauen.' },
      { q: 'Warum nutzt OAEP eine Feistel-artige Struktur?', a: ['Invertierbar, obwohl G und H nicht invertierbar sind', 'Wegen der Geschwindigkeit', 'Damit e klein sein darf', 'Für die Signatur'], c: 0, e: 'Wie bei Feistel-Blockchiffren.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'hybrid', world: 'K', title: 'Hybride Verschlüsselung & KEM',
    short: 'Asymmetrisch nur den Schlüssel, symmetrisch die Daten – plus Forward Secrecy in TLS.',
    keywords: 'hybrid kem key encapsulation tls forward secrecy dhe ecdhe rsa-kem elgamal-kem',
    challenges: { fs: { title: 'Forward Secrecy verstehen', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Hybride Verschlüsselung',
            UI.lib('Σ_HybEnc', ['Enc(pk, m): k ← Σ_PKE.K', '            c_PKE := Σ_PKE.Enc(pk, k);  c_SKE := Σ_SKE.Enc(k, m)', '            return (c_PKE, c_SKE)', 'Dec(sk, (c_PKE, c_SKE)): k := Σ_PKE.Dec(sk, c_PKE); if k == ⊥: return ⊥', '            return Σ_SKE.Dec(k, c_SKE)']),
            h('p', null, 'Asymmetrisch (langsam) wird nur ein kurzer Schlüssel übertragen, die lange Nachricht symmetrisch (schnell) verschlüsselt.')),
          UI.card('Key Encapsulation Mechanism',
            h('p', null, '(pk, sk) := KeyGen(); (c, m) := Encaps(pk); m′ := Decaps(sk, c), Korrektheit m = m′. Ein KEM kann nur ', h('b', null, '(pseudo-)zufällige'), ' Klartexte „verschlüsseln“ – in der Praxis symmetrische Schlüssel.'),
            UI.table(['KEM', 'Encaps', 'Decaps'], [['ElGamal-KEM', 'r ← ℤₙ; c := gʳ; m := pkʳ', 'm := c^sk'], ['RSA-KEM', 'r ← ℤₙ; c := rᵉ mod n; m := H(r)', 'r := cᵈ mod n; m := H(r)']], { wrap: false }),
            UI.callout('errata', 'Board-Folie „Key Encapsulation mit ElGamal“', 'Dort steht „return (c₁, c₂)“ – gemeint ist <b>return (c, m)</b>.')),
          UI.card('Praxis: TLS',
            h('ul', { class: 'tight' }, h('li', null, h('b', null, 'TLS-RSA (Key Transport): '), 'Client verschlüsselt den Sitzungsschlüssel mit dem RSA-pk des Servers.'),
              h('li', null, h('b', null, 'TLS-DHE/ECDHE (Key Agreement): '), 'ephemere DH-Schlüssel pro Sitzung, danach gelöscht ⇒ ', h('b', null, 'Forward Secrecy'), '.'),
              h('li', null, 'KEM-basierte Cipher-Suites (z. B. post-quantum ML-KEM) setzen Encaps/Decaps direkt ein.'))));
      } },
      { title: 'Pipeline', render(el) {
        const k = rsaKey();
        let msg = 'Dies ist eine lange vertrauliche Nachricht, die effizient symmetrisch verschlüsselt wird.';
        let kem = 'rsa';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          let c, m, m2;
          if (kem === 'rsa') { const r = NT.randBetween(2n, k.n - 1n); c = NT.modPow(r, k.e, k.n); m = SHA.hash(U.utf8(r.toString())); m2 = SHA.hash(U.utf8(NT.modPow(c, k.d, k.n).toString())); }
          else { const G = GROUPS.big; const x = NT.randBetween(2n, G.ord - 1n), pk = NT.modPow(G.g, x, G.p); const r = NT.randBetween(2n, G.ord - 1n); c = NT.modPow(G.g, r, G.p); const sh = NT.modPow(pk, r, G.p); m = SHA.hash(U.utf8(sh.toString())); m2 = SHA.hash(U.utf8(NT.modPow(c, x, G.p).toString())); }
          const nonce = U.randomBytes(8);
          const cS = AES.ctr(m.slice(0, 16), nonce, U.utf8(msg));
          const dec = U.fromUtf8(AES.ctr(m2.slice(0, 16), nonce, cS));
          out.append(UI.table(['Schritt', 'Wert'], [
            ['1 · Encaps(pk) → c_KEM', fmt(c)], ['   … und Schlüssel k (SHA-256, erste 16 Byte)', U.hex(m.slice(0, 16))],
            ['2 · c_SKE = AES-CTR(k, m)', U.hex(cS).slice(0, 64) + '…'], ['übertragen', `c_KEM (${c.toString(16).length / 2 | 0} Byte) + Nonce (8) + c_SKE (${cS.length} Byte)`],
            ['3 · Decaps(sk, c_KEM) → k′', U.hex(m2.slice(0, 16)) + (U.equal(m, m2) ? ' ✓ = k' : ' ✗')], ['4 · AES-CTR(k′, c_SKE)', U.escape(dec)],
          ], { mono: true, wrap: false }));
        };
        el.append(UI.card('KEM + symmetrische Verschlüsselung', UI.segmented([['rsa', 'RSA-KEM (512 Bit, Demo)'], ['eg', 'ElGamal-KEM (MODP-2048)']], kem, (v) => { kem = v; draw(); }),
          h('div', { class: 'mt' }, UI.textarea({ value: msg, oninput: (v) => { msg = v; draw(); } })), out));
        draw();
      } },
      { title: 'Challenge', render(el, ctx) {
        const sessions = [['S1', 'RSA-Key-Transport'], ['S2', 'ECDHE (ephemer)'], ['S3', 'RSA-Key-Transport'], ['S4', 'DHE (ephemer)'], ['S5', 'RSA-Key-Transport']];
        const sel = new Set(); const r = h('div');
        el.append(UI.card('Ein Jahr später: der langfristige RSA-Schlüssel des Servers wird gestohlen',
          h('p', null, 'Eve hat alle fünf Sitzungen damals aufgezeichnet. Welche kann sie jetzt entschlüsseln?'),
          h('div', { class: 'col' }, sessions.map(([id, t]) => h('label', { class: 'row cursor' }, h('input', { type: 'checkbox', onchange: (e) => (e.target.checked ? sel.add(id) : sel.delete(id)) }), h('b', null, id), t))),
          h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
            UI.clear(r);
            const want = ['S1', 'S3', 'S5'];
            if (want.every((x) => sel.has(x)) && sel.size === 3) { r.append(UI.callout('success', 'Richtig', 'Nur Key-Transport-Sitzungen fallen. Bei (EC)DHE wurden a, b nach der Sitzung gelöscht – der Langzeitschlüssel diente nur zur Authentisierung (Signatur). Das ist Forward Secrecy.')); ctx.solve('fs'); }
            else r.append(UI.status(false, 'nicht ganz'));
          }, { kind: 'accent' })), r));
      } },
    ],
    quiz: [
      { q: 'Was kann ein KEM verschlüsseln?', a: ['Nur (pseudo-)zufällige Werte, z. B. Schlüssel', 'Beliebige Nachrichten', 'Nur Hashes', 'Nur Zahlen < 256'], c: 0, e: 'Encaps erzeugt Chiffrat und Klartext gleichzeitig.' },
      { q: 'Was liefert Forward Secrecy?', a: ['Vergangene Sitzungen bleiben sicher, auch wenn der Langzeitschlüssel später leakt', 'Schutz gegen Quantencomputer', 'Schnellere Handshakes', 'Integrität'], c: 0, e: 'Ephemere DH-Schlüssel.' },
    ],
  });
})();
