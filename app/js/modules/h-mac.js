/* Welt H – Message Authentication Codes, Encrypt+MAC, AEAD */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, aes: AES, sha256: SHA } = KQ;
  const h = UI.h;

  const cbcMac = (key, blocks, trace) => {
    const ci = AES.cipher(key);
    let y = new Uint8Array(16);
    const steps = [];
    blocks.forEach((b) => { const x = U.xor(y, b); y = ci.enc(x); steps.push({ x, y }); });
    return trace ? { tag: y, steps } : y;
  };
  const toBlocks = (bytes) => { const p = bytes.length % 16 ? U.concat(bytes, new Uint8Array(16 - (bytes.length % 16))) : bytes; return U.chunk(Array.from(p), 16).map((b) => Uint8Array.from(b)); };

  // ======================================================================
  KQ.module({
    id: 'mac', world: 'H', icon: '🏷️', title: 'MACs & CBC-MAC',
    short: 'Integrität statt Vertraulichkeit: MAC-Spiel, CBC-MAC, der Längenangriff und die Fixes ECBC/FCBC/CMAC.',
    keywords: 'mac message authentication code cbc-mac ecbc fcbc cmac längenerweiterung prefix integrität',
    challenges: { forge: { title: 'CBC-MAC fälschen', xp: 70 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('MAC-Sicherheit als Spiel',
            h('div', { class: 'grid c2' },
              UI.lib('L<sub>mac-real</sub>', ['K ← {0,1}^κ', 'GUESS(X, Y): return Y == F(K, X)', 'REVEAL(X):   return F(K, X)']),
              UI.lib('L<sub>mac-ideal</sub>', ['GUESS(X, Y): Lookup – sonst false', 'REVEAL(X):   lazy zufällig'])),
            h('p', null, 'Der Angreifer darf sich Tags zeigen lassen (REVEAL) und Tags raten (GUESS). Sicher heißt: Ohne vorheriges REVEAL wird ein GUESS nur mit Wahrscheinlichkeit ≤ q/2^κ akzeptiert. ', h('b', null, 'Jede sichere PRF ist ein sicherer MAC'), ' (Beweis in der Game-Hopping-Werkstatt).')),
          UI.card('CBC-MAC',
            h('p', null, 'Wie CBC-Verschlüsselung mit IV = 0, aber nur der letzte Block ist der Tag; alle Zwischenwerte werden verworfen.'),
            h('pre', { class: 'code' }, 't = E(K, … E(K, E(K, m₁) ⊕ m₂) … ⊕ mₗ)')),
          UI.card('Längenangriff (ohne Längenprefix)',
            h('p', null, 'Kennt man t₁ = MAC(m₁) und t₂ = MAC(m₂), ist t₂ auch gültig für'),
            UI.formula('m₃ = m₁ ‖ (m₂¹ ⊕ t₁) ‖ m₂² ‖ …'),
            h('p', null, 'denn nach m₁ ist der interne Zustand t₁; XOR mit (m₂¹ ⊕ t₁) ergibt genau m₂¹ – ab da läuft alles wie bei m₂. Das ist dieselbe Idee wie beim Prefix-MAC-Angriff auf SHA-256 im Praktikum.')),
          UI.card('Fixes',
            UI.table(['Variante', 'Idee'], [
              ['Längenprefix', 'm′ = |m| ‖ m, dann CBC-MAC – beweisbar sichere PRF'],
              ['ECBC', 'CBC-MAC mit K₁, Ergebnis nochmals mit K₂ verschlüsseln: F(K₂, Yₗ)'],
              ['FCBC', 'letzter Block direkt mit K₂: F(K₂, Yₗ₋₁ ⊕ Xₗ) – spart einen Aufruf'],
              ['CMAC', 'Standard, ähnlich FCBC (abgeleitete Teilschlüssel)'],
            ], { wrap: false }),
            h('p', { class: 'small muted' }, 'CBC-MAC ohne Prefix ist eine universelle Hashfunktion (UHF), aber keine PRF für variable Länge – mit einer zweiten PRF dahinter (UH-PRF) wird es sicher (Welt J).')));
      } },
      { title: '🧪 CBC-MAC-Rechner', render(el) {
        const key = U.randomBytes(16);
        let txt = 'Zahle 100 EUR an Bob. Danke!';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const blocks = toBlocks(U.utf8(txt));
          const tr = cbcMac(key, blocks, true);
          out.append(UI.table(['Block', 'mᵢ', 'Yᵢ₋₁ ⊕ mᵢ', 'Yᵢ = E(K, ·)'], tr.steps.map((s, i) => [i + 1, U.hex(blocks[i]), U.hex(s.x), (i === tr.steps.length - 1 ? '<b>' : '') + U.hex(s.y) + (i === tr.steps.length - 1 ? '</b> = Tag' : '')]), { mono: true, wrap: false }));
        };
        el.append(UI.card('CBC-MAC mit AES (Nullen-Padding für die Demo)', UI.input({ value: txt, w: 'full', oninput: (v) => { txt = v; draw(); } }), out));
        draw();
      } },
      { title: '⚔️ Challenge: Fälschung', render(el, ctx) {
        const key = U.randomBytes(16);
        const revealed = new Set();
        const m1 = U.utf8('Bestellung: 1 x '), m2 = U.utf8('Laptop, zahlbar.');
        const t1 = cbcMac(key, [m1]), t2 = cbcMac(key, [m2]);
        revealed.add(U.hex(m1)); revealed.add(U.hex(m2));
        const msgIn = UI.textarea({ mono: true, rows: 2, placeholder: 'Nachricht in Hex (Vielfaches von 16 Byte)' });
        const tagIn = UI.input({ mono: true, w: 'l', placeholder: 'Tag (Hex)' });
        const res = h('div');
        let prefix = false;
        el.append(UI.card('Der Shop prüft Bestellungen per CBC-MAC',
          h('p', null, 'Du hast zwei legitim signierte Ein-Block-Nachrichten beobachtet:'),
          UI.kv([['m₁', U.hex(m1) + `  („${U.fromUtf8(m1)}“)`], ['t₁', U.hex(t1)], ['m₂', U.hex(m2) + `  („${U.fromUtf8(m2)}“)`], ['t₂', U.hex(t2)]]),
          h('p', null, 'Ziel: Reiche eine ', h('b', null, 'neue'), ' Nachricht mit gültigem Tag ein, ohne den Schlüssel zu kennen.'),
          UI.field('Nachricht (Hex)', msgIn), h('div', { class: 'mt' }, UI.field('Tag (Hex)', tagIn)),
          h('div', { class: 'row mt' }, UI.toggle('Shop nutzt Längenprefix (Fix)', prefix, (v) => (prefix = v)),
            UI.button('🛒 Bestellung einreichen', () => {
              UI.clear(res);
              try {
                const m = U.fromHex(msgIn.value), t = U.fromHex(tagIn.value);
                if (!m.length || m.length % 16) throw new Error('Nachricht muss ein Vielfaches von 16 Byte sein');
                if (revealed.has(U.hex(m))) { res.append(UI.callout('warning', 'Nicht neu', 'Diese Nachricht wurde bereits legitim signiert – das ist keine Fälschung.')); return; }
                let blocks = toBlocks(m);
                if (prefix) { const L = new Uint8Array(16); L[15] = blocks.length; blocks = [L].concat(blocks); }
                const ok = U.equal(cbcMac(key, blocks), t);
                if (ok) { res.append(UI.callout('success', 'Tag akzeptiert!', `Der Shop hält „${U.escape(U.printable(m))}“ für echt.`)); ctx.solve('forge'); }
                else res.append(UI.callout('danger', 'Tag abgelehnt', prefix ? 'Mit Längenprefix funktioniert der Längenangriff nicht mehr.' : 'Prüfe deine Konstruktion m₁ ‖ (m₂ ⊕ t₁).'));
              } catch (e) { res.append(UI.callout('danger', 'Eingabe', e.message)); }
            }, { kind: 'accent' })), res, h('div', { class: 'mt' }, T.xorCalc())));
      } },
    ],
    quiz: [
      { q: 'Welches Schutzziel liefert ein MAC?', a: ['Integrität/Authentizität', 'Vertraulichkeit', 'Nichtabstreitbarkeit', 'Verfügbarkeit'], c: 0, e: 'MACs sind komplementär zur Verschlüsselung.' },
      { q: 'Warum ist CBC-MAC ohne Längenprefix für variable Länge unsicher?', a: ['Tags lassen sich per m₁‖(m₂⊕t₁)‖… verlängern', 'Weil AES unsicher ist', 'Weil der IV 0 ist – das ist egal', 'Weil der Tag zu kurz ist'], c: 0, e: 'Längenangriff.' },
      { q: 'Was macht ECBC anders als CBC-MAC?', a: ['Verschlüsselt das Ergebnis zusätzlich mit einem zweiten Schlüssel', 'Nutzt einen zufälligen IV', 'Gibt alle Zwischenwerte aus', 'Hasht vorher'], c: 0, e: 'ECBC(K₁‖K₂, X) = F(K₂, CBC-MAC(K₁, X)).' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'etm', world: 'H', icon: '🔐', title: 'Encrypt-then-MAC & AEAD',
    short: 'Drei Arten, Verschlüsselung und MAC zu kombinieren – nur eine ist generisch sicher. Dazu Associated Data.',
    keywords: 'encrypt-then-mac encrypt-and-mac mac-then-encrypt aead associated data gcm poly1305 ae',
    challenges: { aead: { title: 'Header umleiten', xp: 50 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.table(['Variante', 'Konstruktion', 'Sicherheit'], [
            ['<b>Encrypt-then-MAC</b>', 'C = Enc(Kₑ, M), T = MAC(Kₘ, C), sende C‖T', '<span class="ok-text">generisch CCA-sicher – immer die richtige Wahl</span>'],
            ['Encrypt-and-MAC', 'C = Enc(Kₑ, M), T = MAC(Kₘ, M)', '<span class="bad-text">nicht einmal CPA-sicher</span> (der Tag über M kann Klartextinfos leaken, z. B. Gleichheit)'],
            ['MAC-then-Encrypt', 'C = Enc(Kₑ, M ‖ MAC(Kₘ, M))', 'hängt von der Konstruktion ab (z. B. Padding-Oracles bei CBC: Lucky13)'],
          ], { wrap: false }),
          UI.card('Satz: Encrypt-then-MAC ist CCA-sicher',
            h('p', null, 'Voraussetzung: Σ CPA-sicher, F sichere PRF. Dec prüft ', h('b', null, 'zuerst'), ' den Tag und entschlüsselt nur bei Erfolg. Beweisidee: Ersetzt man F durch eine ideale Zufallsfunktion, kann Dec auf nicht selbst erzeugte (C, T) praktisch nie erfolgreich antworten (das wäre eine MAC-Fälschung). Damit ist das Dec-Orakel nutzlos und es bleibt die CPA-Sicherheit von Σ.')),
          UI.card('Authenticated Encryption (AE) & Associated Data',
            UI.lib('L<sub>ae-rand</sub>', ['AE.Enc(M): C ← Σ.C(|M|); D[C] ← M; return C', 'AE.Dec(C): if D[C] defined: return D[C]', '           return err']),
            h('p', null, 'AE kombiniert Vertraulichkeit und Integrität in einem Verfahren; alle AE-Verfahren sind CCA-sicher. ', h('b', null, 'AEAD'), ' erlaubt zusätzlich ', h('b', null, 'Associated Data'), ': öffentlicher, aber integritätsgeschützter Kontext (Paket-Header, Empfänger, Sequenznummer). Beispiele: AES-GCM (GHASH), ChaCha20-Poly1305 (Poly1305 basiert auf der Poly-UHF).')));
      } },
      { title: '🧪 Labor', render(el) {
        const Ke = U.randomBytes(16), Km = U.randomBytes(32);
        let msg = 'JA';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const M = U.utf8(msg);
          const ctr = (n) => AES.ctr(Ke, n, M);
          const n1 = U.randomBytes(8), n2 = U.randomBytes(8);
          const eam1 = { c: ctr(n1), t: SHA.hmac(Km, M).slice(0, 8) }, eam2 = { c: ctr(n2), t: SHA.hmac(Km, M).slice(0, 8) };
          const etm1 = { c: ctr(n1) }; etm1.t = SHA.hmac(Km, U.concat(n1, etm1.c)).slice(0, 8);
          const etm2 = { c: ctr(n2) }; etm2.t = SHA.hmac(Km, U.concat(n2, etm2.c)).slice(0, 8);
          out.append(h('p', null, 'Dieselbe Nachricht wird zweimal gesendet (z. B. die Antwort „JA“ auf zwei Abstimmungen):'),
            UI.table(['', '1. Senden', '2. Senden', 'Beobachtung'], [
              ['Encrypt-and-MAC', `C=${U.hex(eam1.c)} T=${U.hex(eam1.t)}`, `C=${U.hex(eam2.c)} T=${U.hex(eam2.t)}`, '<span class="bad-text">gleicher Tag ⇒ Lauscher sieht: gleiche Nachricht!</span>'],
              ['Encrypt-then-MAC', `C=${U.hex(etm1.c)} T=${U.hex(etm1.t)}`, `C=${U.hex(etm2.c)} T=${U.hex(etm2.t)}`, '<span class="ok-text">alles verschieden</span>'],
            ], { mono: true, wrap: false }),
            h('p', { class: 'small muted' }, 'Ein deterministischer MAC über den Klartext ist selbst eine deterministische „Verschlüsselung“ – daher nicht CPA-sicher.'));
        };
        el.append(UI.card('Encrypt-and-MAC leakt Gleichheit', UI.input({ value: msg, oninput: (v) => { msg = v; draw(); } }), out));
        draw();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        const Ke = U.randomBytes(16), Km = U.randomBytes(32);
        const nonce = U.randomBytes(8);
        const ad = U.utf8('an:bob');
        const body = U.utf8('Gehalt: 5200 EUR');
        const c = AES.ctr(Ke, nonce, body);
        const tagWeak = SHA.hmac(Km, U.concat(nonce, c)).slice(0, 16);
        const tagAead = SHA.hmac(Km, U.concat(U.utf8(String(ad.length)), ad, nonce, c)).slice(0, 16);
        const adIn = UI.input({ value: 'an:bob', mono: true, w: 'm' });
        let mode = 'weak';
        const res = h('div');
        el.append(UI.card('Mallory will die Nachricht an sich umleiten',
          h('p', null, 'Ein Mailserver stellt Nachrichten anhand des unverschlüsselten Headers zu. Der Inhalt ist verschlüsselt und per MAC geschützt. Ändere den Header auf ', h('code', null, 'an:eve'), ', sodass der Server ihn akzeptiert und an dich ausliefert.'),
          UI.kv([['Header (AD)', 'an:bob'], ['Nonce', U.hex(nonce)], ['Chiffrat', U.hex(c)], ['Tag', mode === 'weak' ? U.hex(tagWeak) : U.hex(tagAead)]]),
          h('div', { class: 'row mt' }, h('span', null, 'Server-Variante:'), UI.segmented([['weak', 'MAC nur über Nonce‖Chiffrat'], ['aead', 'AEAD: MAC auch über Header']], mode, (v) => { mode = v; UI.clear(res); })),
          h('div', { class: 'row mt' }, UI.field('Header', adIn), UI.button('📨 Zustellen', () => {
            UI.clear(res);
            const a = U.utf8(adIn.value);
            const tag = mode === 'weak' ? tagWeak : tagAead;
            const expect = mode === 'weak' ? SHA.hmac(Km, U.concat(nonce, c)).slice(0, 16) : SHA.hmac(Km, U.concat(U.utf8(String(a.length)), a, nonce, c)).slice(0, 16);
            if (!U.equal(expect, tag)) { res.append(UI.callout('danger', 'Abgelehnt', 'Der Tag passt nicht – der Header ist integritätsgeschützt (Associated Data).')); return; }
            const to = U.fromUtf8(a);
            res.append(UI.callout(to === 'an:eve' ? 'warning' : 'info', 'Zugestellt', `Empfänger <b>${U.escape(to)}</b> erhält: „${U.fromUtf8(AES.ctr(Ke, nonce, c))}“`));
            if (to === 'an:eve' && mode === 'weak') { ctx.solve('aead'); res.append(UI.callout('tip', 'Lehre', 'Jetzt schalte auf „AEAD“ um und versuche es erneut.')); }
          }, { kind: 'accent' })), res));
      } },
    ],
    quiz: [
      { q: 'Welche Kombination ist generisch CCA-sicher?', a: ['Encrypt-then-MAC', 'Encrypt-and-MAC', 'MAC-then-Encrypt', 'alle drei'], c: 0, e: 'Unter CPA-Sicherheit von Σ und PRF-Sicherheit von F.' },
      { q: 'Was sind „Associated Data“ bei AEAD?', a: ['Öffentliche, aber integritätsgeschützte Zusatzdaten', 'Ein zweiter Schlüssel', 'Verschlüsselte Metadaten', 'Der IV'], c: 0, e: 'z. B. Header, die der Router lesen muss.' },
      { q: 'Warum ist Encrypt-and-MAC nicht CPA-sicher?', a: ['Der deterministische Tag über M verrät gleiche Nachrichten', 'Weil zwei Schlüssel benutzt werden', 'Weil der MAC zu kurz ist', 'Ist es doch'], c: 0, e: 'Siehe Labor.' },
    ],
  });
})();
