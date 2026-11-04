/* Welt I – Hashfunktionen, Merkle-Damgård, Length-Extension, HMAC */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, sha256: SHA, toys: TOY } = KQ;
  const h = UI.h;

  const trunc = (bytes, bits) => { let v = 0; for (let i = 0; i < bits; i++) v = v * 2 + ((bytes[i >> 3] >> (7 - (i & 7))) & 1); return v; };
  const H = (s) => SHA.hash(U.utf8(s));

  // ======================================================================
  KQ.module({
    id: 'hash', world: 'I', title: 'Hashfunktionen & ihre Sicherheit',
    short: 'Kollisions-, Preimage- und 2nd-Preimage-Resistenz, Salt gegen Rainbow-Tables, generische Angriffe live.',
    keywords: 'hash sha-256 kollision preimage second preimage salt rainbow table geburtstagsangriff fingerabdruck',
    challenges: { collision: { title: 'Kollision (20 Bit) einreichen', xp: 40 }, salt: { title: 'Gleiches Passwort finden', xp: 30 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Definition',
            UI.formula('Hₙ : {0,1}* → {0,1}ⁿ'),
            h('p', null, 'Beliebig lange Eingabe → fester „Fingerabdruck“. Nach dem ', h('b', null, 'Schubfachprinzip'), ' muss es Kollisionen geben (mehr Nachrichten als Hashwerte) – Ziel ist nur, dass sie schwer zu finden sind.')),
          UI.table(['Eigenschaft', 'Angreifer soll nicht finden …', 'generischer Aufwand'], [
            ['Kollisionsresistenz', 'm ≠ m′ mit H(m) = H(m′)', '≈ 2^(n/2) (Geburtstag)'],
            ['Preimage-Resistenz', 'zu gegebenem Y ein X′ mit H(X′) = Y', '≈ 2ⁿ'],
            ['2nd-Preimage-Resistenz', 'zu gegebenem X ein X′ ≠ X mit H(X′) = H(X)', '≈ 2ⁿ'],
          ], { wrap: false }),
          UI.card('Warum eine Familie mit Salt?',
            h('p', null, 'Für eine feste Funktion H gibt es trivial einen Algorithmus mit eingebauter Kollision (O(1)) – man weiß ihn nur nicht. Formal definiert man Sicherheit daher über eine ', h('b', null, 'Familie Hₙ(S, X)'), ' mit zufällig gewähltem Salt S.')),
          UI.card('Praxis: Salt bei Passwort-Hashes',
            h('p', null, 'Ohne Salt sind Rainbow-Tables (vorausberechnete Hash-Wörterbücher) effektiv und gleiche Passwörter haben gleiche Hashes. Mit Salt muss der Angreifer pro Salt neu rechnen. (In der Praxis zusätzlich langsame Funktionen wie Argon2/scrypt.)')));
      } },
      { title: 'SHA-256 & Avalanche', render(el) {
        let a = 'Kryptografie', b = 'kryptografie';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const ha = H(a), hb = H(b);
          out.append(UI.kv([['SHA-256(a)', U.hex(ha)], ['SHA-256(b)', U.hex(hb)]]),
            h('div', { class: 'mt' }, UI.bitrow(U.bytesToBits(U.xor(ha, hb)), { group: 8, cls: (i, x) => (x === '1' ? 'diff' : '') })),
            h('p', null, 'Unterschiedliche Bits: ', h('b', null, `${U.hamming(ha, hb)} von 256`), ' (ideal ≈ 128).'));
        };
        el.append(UI.card('Zwei Eingaben vergleichen', h('div', { class: 'grid c2' }, UI.field('a', UI.input({ value: a, w: 'full', oninput: (v) => { a = v; draw(); } })), UI.field('b', UI.input({ value: b, w: 'full', oninput: (v) => { b = v; draw(); } }))), out));
        draw();
      } },
      { title: 'Generische Angriffe', render(el) {
        let bits = 20;
        const out = h('div');
        let running = null;
        const stop = () => { if (running) { clearTimeout(running); running = null; } };
        UI.onLeave(stop);
        const runSearch = (kind) => {
          stop(); UI.clear(out);
          const status = h('div'); out.append(status);
          const target = trunc(H('geheim-' + U.randInt(0, 1e9)), bits);
          const seen = new Map();
          let n = 0; const t0 = performance.now();
          const step = () => {
            for (let i = 0; i < 4000; i++) {
              n++;
              const s = 'msg-' + n.toString(36) + '-' + U.randInt(0, 1e6);
              const v = trunc(H(s), bits);
              if (kind === 'pre' && v === target) { done(`Preimage gefunden: „${s}“ ↦ ${v.toString(16)}`); return; }
              if (kind === 'col') { if (seen.has(v) && seen.get(v) !== s) { done(`Kollision: „${seen.get(v)}“ und „${s}“ ↦ ${v.toString(16)}`, [seen.get(v), s]); return; } seen.set(v, s); }
              if (n > 2 ** (bits + 3)) { done('abgebrochen'); return; }
            }
            UI.clear(status); status.append(h('p', null, `Versuche: ${n.toLocaleString('de-DE')} …`));
            running = setTimeout(step, 0);
          };
          const done = (msg, pair) => {
            running = null; UI.clear(status);
            status.append(UI.callout('success', msg, `${n.toLocaleString('de-DE')} Versuche in ${((performance.now() - t0) / 1000).toFixed(2)} s · Erwartung ${kind === 'pre' ? '2^' + bits + ' = ' + (2 ** bits).toLocaleString('de-DE') : '≈ 1,18·2^' + bits / 2 + ' = ' + Math.round(1.18 * 2 ** (bits / 2)).toLocaleString('de-DE')}`));
            if (pair) status.append(h('p', { class: 'small' }, 'Kopiere die beiden Strings für die Challenge.'));
          };
          step();
        };
        el.append(UI.card('SHA-256 auf t Bit gekürzt',
          h('p', null, 'Wie lange dauert es, für einen gekürzten Hash ein Urbild bzw. eine Kollision zu finden?'),
          UI.slider({ label: 't =', min: 8, max: 24, value: bits, oninput: (v) => { bits = v; } }),
          h('div', { class: 'row mt' }, UI.button('Preimage suchen (≈ 2^t)', () => runSearch('pre')), UI.button('Kollision suchen (≈ 2^(t/2))', () => runSearch('col'), { kind: 'accent' }), UI.button('Stopp', stop, { kind: 'subtle' })),
          out, h('p', { class: 'small muted' }, 'Hochgerechnet auf volle 256 Bit: Kollision ≈ 2¹²⁸ Versuche – unmöglich.')));
      } },
      { title: 'Challenges', render(el, ctx) {
        const a = UI.input({ w: 'l', placeholder: 'String 1' }), b = UI.input({ w: 'l', placeholder: 'String 2' });
        const r1 = h('div');
        const users = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'];
        const pws = ['sommer2024', 'Passwort!', 'hunter2', 'krypto', 'qwertz', 'drache'];
        const alicePw = U.pick(pws);
        const twin = U.pick(users.slice(1));
        const assigned = users.map((u) => (u === 'alice' || u === twin ? alicePw : U.pick(pws.filter((p) => p !== alicePw))));
        let salted = false;
        const tbl = h('div'); const r2 = h('div');
        const salts = users.map(() => U.hex(U.randomBytes(4)));
        const drawT = () => {
          UI.clear(tbl);
          tbl.append(UI.table(['Nutzer', salted ? 'Salt' : '', salted ? 'SHA-256(Salt ‖ Passwort)' : 'SHA-256(Passwort)'],
            users.map((u, i) => [u, salted ? salts[i] : '', U.hex(SHA.hash(U.utf8((salted ? salts[i] : '') + assigned[i]))).slice(0, 32) + '…']), { mono: true, wrap: false }));
        };
        drawT();
        el.append(UI.card('Challenge 1 · Kollision einreichen',
          h('p', null, 'Gib zwei verschiedene Strings an, deren SHA-256 in den ersten ', h('b', null, '20 Bit'), ' übereinstimmt. (Das Werkzeug „Generische Angriffe“ hilft – überlege, wie viele Versuche du erwartest.)'),
          h('div', { class: 'row' }, a, b, UI.button('Prüfen', () => {
            UI.clear(r1);
            if (a.value === b.value) { r1.append(UI.status(false, 'Strings müssen verschieden sein')); return; }
            const x = trunc(H(a.value), 20), y = trunc(H(b.value), 20);
            if (x === y) { r1.append(UI.status(true, `beide ↦ ${x.toString(16)}`)); ctx.solve('collision'); }
            else r1.append(UI.status(false, `${x.toString(16)} ≠ ${y.toString(16)}`));
          }, { kind: 'accent' })), r1),
          UI.card('Challenge 2 · Passwort-Datenbank geleakt',
            h('p', null, 'Welcher Nutzer hat dasselbe Passwort wie alice?'), tbl,
            h('div', { class: 'row mt' }, users.slice(1).map((u) => UI.button(u, () => {
              UI.clear(r2);
              if (u === twin) { r2.append(UI.callout('success', 'Richtig', 'Ohne Salt verraten gleiche Hashes gleiche Passwörter. Schalte Salt ein – dann sieht man es nicht mehr.')); ctx.solve('salt'); }
              else r2.append(UI.status(false, 'nein'));
            }, { sm: true })), UI.toggle('mit Salt', salted, (v) => { salted = v; drawT(); })), r2));
      } },
    ],
    quiz: [
      { q: 'Wie viele Versuche braucht ein generischer Kollisionsangriff auf SHA-256?', a: ['≈ 2¹²⁸', '≈ 2²⁵⁶', '≈ 2⁶⁴', '≈ 256²'], c: 0, e: 'Geburtstagsschranke 2^(n/2).' },
      { q: 'Wogegen hilft ein Salt bei Passwort-Hashes?', a: ['Vorausberechnete Tabellen (Rainbow Tables) und Erkennen gleicher Passwörter', 'Brute Force eines einzelnen Hashes', 'Kollisionsangriffe', 'Längenerweiterung'], c: 0, e: 'Pro Salt müsste neu gerechnet werden.' },
      { q: 'Warum muss jede Hashfunktion Kollisionen haben?', a: ['Schubfachprinzip: unendlich viele Eingaben, 2ⁿ Ausgaben', 'Weil sie schlecht konstruiert ist', 'Wegen des Paddings', 'Muss sie nicht'], c: 0, e: 'Das Ziel ist nur, dass sie schwer zu finden sind.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'merkle', world: 'I', title: 'Merkle-Damgård-Konstruktion',
    short: 'Kompressionsfunktionen verketten – und warum ohne Längen-Padding Kollisionen geschenkt sind.',
    keywords: 'merkle damgård kompressionsfunktion padding verkettung kollisionsresistent beweis sha-256',
    challenges: { nopad: { title: 'Kollision ohne Längenpadding', xp: 50 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Verkettung',
            h('p', null, 'Eine Kompressionsfunktion Hₙ: {0,1}²ⁿ → {0,1}ⁿ (mit Salt S) wird verkettet: Y₁ = X₁, Yᵢ₊₁ = Hₙ(S, Yᵢ ‖ Xᵢ₊₁). Der letzte Wert ist der Hash.'),
            h('p', null, h('b', null, 'Lemma: '), 'Für ', h('b', null, 'feste'), ' Blockzahl l ist die Verkettung kollisionsresistent, wenn Hₙ es ist.')),
          UI.card('Für variable Länge unsicher (Beweis durch Angriff)',
            h('p', null, 'Wähle X₁‖X₂‖X₃‖X₄ und berechne Y₁ = Hₙ(S, X₁‖X₂). Dann gilt'),
            UI.formula('H*(S, X₁‖X₂‖X₃‖X₄) = H*(S, Y₁‖X₃‖X₄)'),
            h('p', null, '– zwei verschiedene Nachrichten (4 vs. 3 Blöcke) mit gleichem Hash, ohne Hₙ zu brechen. ∎')),
          UI.card('Merkle-Damgård-Padding',
            UI.formula('Pad(X) = X ‖ 0ᵖ ‖ L,    L = |X|'),
            h('p', null, h('b', null, 'Lemma: '), 'Ist Hₙ kollisionsresistent, dann auch MD. ', h('b', null, 'Beweis'), ' (Kollision rückwärts verfolgen): Fall 1 |X| = |X*|: am Ende Hₙ(S, Z‖Yₗ) = Hₙ(S, Z*‖Y*ₗ); verschiedene Eingaben ⇒ Hₙ-Kollision, sonst einen Block zurückgehen – irgendwo unterscheiden sich X, X*. Fall 2 |X| ≠ |X*|: die letzten Blöcke enthalten verschiedene Längen ⇒ direkt eine Hₙ-Kollision. ∎'),
            h('p', { class: 'muted' }, 'SHA-256 ist MD-basiert: Nachricht ‖ 0x80 ‖ 0x00… ‖ 64-Bit-Länge, Blöcke à 512 Bit, interner Zustand 256 Bit.')),
          UI.callout('warning', 'Nebenwirkung: Length-Extension', 'Ohne Salt gilt: Aus Y = H*(K‖X) lässt sich H*(Pad(K‖X)‖X′) berechnen, ohne K zu kennen ⇒ F(K, X) = H*(K‖X) ist keine sichere PRF (nächste Station).'));
      } },
      { title: 'SHA-256 von innen', render(el) {
        let txt = 'abc';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const m = U.utf8(txt);
          const tr = SHA.trace(m);
          const blocks = U.chunk(Array.from(tr.padded), 64);
          out.append(h('p', null, `${m.length} Byte Nachricht → ${blocks.length} Block/Blöcke à 64 Byte (gelb: Padding 0x80 00… ‖ Länge ${m.length * 8} Bit).`));
          blocks.forEach((b, i) => out.append(h('div', { class: 'mt' }, h('b', null, `Block ${i + 1}`), UI.bytes(b, { cols: 16, cls: (j) => (i * 64 + j >= m.length ? 'pad' : '') }))));
          out.append(h('h4', null, 'Verkettung der Zustände'),
            UI.table(['Schritt', 'Zustand (8 × 32 Bit)'], tr.states.map((s, i) => [i === 0 ? 'IV' : `nach Block ${i}`, s.map(U.hex32).join(' ')]), { mono: true, wrap: false }),
            h('p', null, 'Hash = letzter Zustand: ', h('code', null, U.hex(tr.digest))));
        };
        el.append(UI.card('Padding und Zustandsverkettung', UI.input({ value: txt, w: 'full', oninput: (v) => { txt = v; draw(); } }), out));
        draw();
      } },
      { title: 'Challenge', render(el, ctx) {
        const X = Array.from({ length: 4 }, () => U.randInt(0, 0xffff));
        const target = TOY.chainNoPad(X).hash;
        const ins = [0, 1, 2].map(() => UI.input({ mono: true, w: 's', placeholder: 'hex' }));
        const res = h('div');
        const cy = UI.input({ mono: true, w: 's', placeholder: 'y' }), cx = UI.input({ mono: true, w: 's', placeholder: 'x' }), co = h('span', { class: 'mono' });
        el.append(UI.card('Kollision ohne Längenpadding (16-Bit-Spielzeug)',
          h('p', null, 'Hash ohne Padding: Y₁ = X₁, Yᵢ₊₁ = h(Yᵢ, Xᵢ₊₁). Gegeben ist die 4-Block-Nachricht ', h('code', null, X.map(U.hex16).join(' ‖ ')), ' mit Hash ', h('code', null, U.hex16(target)), '. Finde eine ', h('b', null, '3-Block-Nachricht'), ' mit demselben Hash.'),
          h('div', { class: 'card flat' }, h('b', null, 'Kompressionsfunktion h(y, x)'), h('div', { class: 'row mt' }, cy, cx, UI.button('h berechnen', () => { co.textContent = '= ' + U.hex16(TOY.compress16(parseInt(cy.value, 16) & 0xffff, parseInt(cx.value, 16) & 0xffff)); }, { sm: true }), co)),
          h('div', { class: 'row mt' }, ins.map((x, i) => UI.field(`Block ${i + 1}`, x)), UI.button('Prüfen', () => {
            UI.clear(res);
            const bl = ins.map((x) => parseInt(x.value, 16));
            if (bl.some((v) => isNaN(v) || v > 0xffff)) { res.append(UI.status(false, 'drei 16-Bit-Hexwerte angeben')); return; }
            const hv = TOY.chainNoPad(bl).hash;
            if (hv === target) {
              const md1 = TOY.chainMD(X).hash, md2 = TOY.chainMD(bl).hash;
              res.append(UI.callout('success', 'Kollision gefunden', `Beide Nachrichten haben den Hash ${U.hex16(hv)}. Mit Merkle-Damgård-Längenblock dagegen: ${U.hex16(md1)} ≠ ${U.hex16(md2)} – der Längenblock verhindert den Trick.`));
              ctx.solve('nopad');
            } else res.append(UI.status(false, `Hash ${U.hex16(hv)} ≠ ${U.hex16(target)}`));
          }, { kind: 'accent' })), res));
      } },
    ],
    quiz: [
      { q: 'Was hängt Merkle-Damgård-Padding an?', a: ['Füllbits und die Nachrichtenlänge', 'Einen zufälligen Salt', 'Den Schlüssel', 'Den Hash der Nachricht'], c: 0, e: 'Pad(X) = X ‖ 0ᵖ ‖ |X|.' },
      { q: 'Im MD-Beweis, Fall |X| ≠ |X*|: woher kommt die Kollision?', a: ['Die letzten Blöcke unterscheiden sich durch die Länge ⇒ direkte Hₙ-Kollision', 'Aus dem ersten Block', 'Aus dem Salt', 'Es gibt keine'], c: 0, e: 'Deshalb ist das Längensuffix entscheidend.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'lengthext', world: 'I', title: 'Length-Extension & HMAC',
    short: 'Warum SHA-256(k‖m) kein MAC ist (Praktikum 3.2) – und wie HMAC das mit ipad/opad löst.',
    keywords: 'length extension längenerweiterung sha-256 prefix mac hmac nmac ipad opad praktikum',
    challenges: { forge: { title: 'Prefix-MAC verlängern', xp: 70 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Das Problem mit t = H(k ‖ m)',
            h('p', null, 'Bei Merkle-Damgård ist der Hashwert ', h('b', null, 'gleich dem internen Zustand'), ' nach dem letzten Block. Wer t = H(k‖m) und die Länge |k‖m| kennt, kann einfach weiterrechnen:'),
            UI.formula('H(k ‖ m ‖ pad ‖ m′) = compress*(Zustand := t, m′)'),
            h('p', null, 'pad ist das MD-Padding der ursprünglichen Länge – es landet als „Klebstoff“ in der gefälschten Nachricht. Der Schlüssel wird nie gebraucht; nur seine Länge (oft durchprobierbar).')),
          UI.table(['Konstruktion', 'Idee', 'sicher?'], [
            ['H(k‖m)', 'Prefix-MAC', '<span class="bad-text">nein (Length-Extension)</span>'],
            ['Hash-then-PRF', 'F′(K₁‖K₂, X) = F(K₂, H*(K₁, X))', '✓'],
            ['NMAC', 'H*_IV(K₂, H*_IV(K₁‖X)) – braucht wählbaren IV', '✓ (unpraktisch)'],
            ['<b>HMAC</b>', 'H((K ⊕ opad) ‖ H((K ⊕ ipad) ‖ X))', '<span class="ok-text">✓ – der Praxis-Standard</span>'],
          ], { wrap: false }),
          UI.callout('info', 'Und SHA-3?', 'Sponge-Konstruktionen geben nur einen Teil des Zustands aus (die Capacity bleibt verborgen) – Length-Extension funktioniert dort nicht.'));
      } },
      { title: 'Challenge: Prefix-MAC', render(el, ctx) {
        const keyLen = U.randInt(8, 20);
        const key = U.randomBytes(keyLen);
        const msg = U.utf8('user=bob&role=user');
        const tag = SHA.hash(U.concat(key, msg));
        const ext = UI.input({ value: '&role=admin', w: 'm' });
        let guess = 12;
        const out = h('div'), res = h('div');
        let forged = null;
        const build = () => {
          UI.clear(out); UI.clear(res);
          const e = U.utf8(ext.value);
          const f = SHA.lengthExtend(tag, guess, msg, e);
          forged = f;
          out.append(h('p', null, `Annahme |k| = ${guess} ⇒ ursprüngliche Länge ${guess + msg.length} Byte ⇒ Klebe-Padding (${f.glue.length} Byte):`),
            UI.bytes(f.glue, { cols: 16, cls: () => 'pad' }),
            h('p', null, 'Startzustand = Tag t als 8 Wörter: ', h('code', null, SHA.bytesToState(tag).map(U.hex32).join(' '))),
            UI.kv([['gefälschte Nachricht', U.printable(f.forgedMsg)], ['als Hex', U.hex(f.forgedMsg)], ['gefälschter Tag', U.hex(f.digest)]]));
        };
        el.append(UI.card('API mit Prefix-MAC',
          h('p', null, 'Ein Server akzeptiert Anfragen, wenn tag = SHA-256(k ‖ anfrage) stimmt. Die Schlüssellänge kennst du nicht (zwischen 8 und 20 Byte). Abgefangen:'),
          UI.kv([['Anfrage', U.fromUtf8(msg)], ['Tag', U.hex(tag)]]),
          h('div', { class: 'row mt' }, UI.field('Anhängen', ext), UI.slider({ label: 'vermutete |k| =', min: 1, max: 32, value: guess, oninput: (v) => { guess = v; build(); } }), UI.button('Berechnen', build)),
          out,
          h('div', { class: 'row mt' }, UI.button('An den Server senden', () => {
            UI.clear(res);
            if (!forged) return;
            const ok = U.equal(SHA.hash(U.concat(key, forged.forgedMsg)), forged.digest);
            const admin = U.printable(forged.forgedMsg).includes('role=admin');
            if (ok && admin) { res.append(UI.callout('success', `Akzeptiert (|k| war ${keyLen})`, 'Der Server parst den letzten role-Parameter: Du bist Admin – ohne den Schlüssel zu kennen.')); ctx.solve('forge'); }
            else if (ok) res.append(UI.callout('warning', 'Tag gültig', 'aber die Anfrage enthält kein role=admin.'));
            else res.append(UI.callout('danger', 'Tag ungültig', 'Falsche Schlüssellänge? Probiere andere Werte.'));
          }, { kind: 'accent' })), res));
        build();
      } },
      { title: 'HMAC', render(el) {
        let k = 'geheim', m = 'user=bob&role=user';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const tr = SHA.hmac(U.utf8(k), U.utf8(m), true);
          out.append(UI.kv([['K* (auf 64 Byte)', U.hex(tr.k0).slice(0, 48) + '…'], ['K* ⊕ ipad (0x36…)', U.hex(tr.ipad).slice(0, 48) + '…'], ['K* ⊕ opad (0x5c…)', U.hex(tr.opad).slice(0, 48) + '…'],
            ['innerer Hash H((K*⊕ipad) ‖ m)', U.hex(tr.innerHash)], ['HMAC = H((K*⊕opad) ‖ innen)', U.hex(tr.tag)]]),
            UI.callout('success', 'Warum hier keine Length-Extension?', 'Der Angreifer könnte den inneren Hash verlängern – aber er sieht ihn nie. Ausgegeben wird nur der äußere Hash, dessen Eingabe die feste Länge 64 + 32 Byte hat und mit einem Schlüssel beginnt.'));
        };
        el.append(UI.card('HMAC-SHA-256 (RFC 2104)', h('div', { class: 'grid c2' }, UI.field('Schlüssel', UI.input({ value: k, w: 'full', oninput: (v) => { k = v; draw(); } })), UI.field('Nachricht', UI.input({ value: m, w: 'full', oninput: (v) => { m = v; draw(); } }))), out));
        draw();
      } },
    ],
    quiz: [
      { q: 'Warum ist H(k‖m) mit SHA-256 kein sicherer MAC?', a: ['Length-Extension: Hash = interner Zustand', 'SHA-256 hat Kollisionen', 'Der Schlüssel ist zu kurz', 'Weil k vorne steht – hinten wäre es sicher'], c: 0, e: 'MD-Konstruktion ohne Finalisierung.' },
      { q: 'Was muss der Angreifer für die Längenerweiterung kennen?', a: ['Tag, Nachricht und die Länge des Schlüssels', 'Den Schlüssel', 'Eine Kollision', 'Den IV des Servers'], c: 0, e: 'Die Länge lässt sich meist durchprobieren.' },
      { q: 'HMAC(K, X) =', a: ['H((K⊕opad) ‖ H((K⊕ipad) ‖ X))', 'H(K ‖ X ‖ K)', 'H(X) ⊕ K', 'H(K ⊕ X)'], c: 0, e: 'Wie NMAC, aber mit abgeleiteten Schlüsseln statt wählbarem IV.' },
    ],
  });
})();
