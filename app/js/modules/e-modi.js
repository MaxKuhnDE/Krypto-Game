/* Welt E – Betriebsmodi, Padding, Malleability, Padding-Oracle */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, aes: AES } = KQ;
  const h = UI.h;

  /** Flussdiagramm für ECB/CBC/CTR (3 Blöcke) als SVG */
  const modeSvg = (mode) => {
    const W = 560, H = 190, bx = [110, 280, 450];
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" style="max-width:100%">`;
    const node = (x, y, t, cls = 'flow-node', w = 64) => `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="6" class="${cls}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12">${t}</text>`;
    const xor = (x, y) => `<circle cx="${x}" cy="${y}" r="11" class="flow-op"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14">⊕</text>`;
    const line = (x1, y1, x2, y2, hot) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="flow-line${hot ? ' hot' : ''}"/>`;
    bx.forEach((x, i) => {
      if (mode === 'ECB') {
        s += node(x, 25, `m${i + 1}`) + line(x, 39, x, 76) + node(x, 90, 'E(k,·)', 'flow-op', 70) + line(x, 104, x, 146) + node(x, 160, `c${i + 1}`);
      } else if (mode === 'CBC') {
        s += node(x, 20, `m${i + 1}`) + line(x, 34, x, 59) + xor(x, 70) + line(x, 81, x, 101) + node(x, 115, 'E(k,·)', 'flow-op', 70) + line(x, 129, x, 151) + node(x, 165, `c${i + 1}`);
        const px = i === 0 ? 20 : bx[i - 1];
        if (i === 0) s += node(30, 70, 'IV', 'flow-node', 40) + line(50, 70, x - 11, 70, true);
        else s += `<path d="M ${px + 32} 165 L ${px + 55} 165 L ${px + 55} 70 L ${x - 11} 70" class="flow-line hot"/>`;
      } else {
        s += node(x, 25, `IV+${i}`, 'flow-node', 56) + line(x, 39, x, 61) + node(x, 75, 'E(k,·)', 'flow-op', 70) + line(x, 89, x, 114) + xor(x, 125) + node(x - 62, 125, `m${i + 1}`, 'flow-node', 40) + line(x - 42, 125, x - 11, 125) + line(x, 136, x, 151) + node(x, 165, `c${i + 1}`);
      }
    });
    return UI.html(s + '</svg>');
  };
  KQ.modeSvg = modeSvg;

  /** Eigenes Testbild (256×128, 1 Byte = Palettenindex): Schlüssel + Schriftzug „AES“ */
  const makeImage = () => {
    const W = 256, H = 128, px = new Uint8Array(W * H);
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - 50, dy = y - 64, r = Math.hypot(dx, dy);
      if (r < 36 && r > 16) set(x, y, 1);                       // Schlüsselring
      if (y >= 56 && y <= 72 && x >= 84 && x <= 138) set(x, y, 1); // Schaft
      if (x >= 110 && x <= 119 && y >= 72 && y <= 96) set(x, y, 1); // Bart
      if (x >= 129 && x <= 138 && y >= 72 && y <= 88) set(x, y, 1);
      if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6) set(x, y, 3); // Rahmen
    }
    const font = { A: ['0110', '1001', '1111', '1001', '1001'], E: ['1111', '1000', '1110', '1000', '1111'], S: ['0111', '1000', '0110', '0001', '1110'] };
    'AES'.split('').forEach((ch, k) => font[ch].forEach((row, ry) => row.split('').forEach((b, rx) => {
      if (b === '1') for (let yy = 0; yy < 12; yy++) for (let xx = 0; xx < 7; xx++) set(154 + k * 30 + rx * 6 + xx, 34 + ry * 12 + yy, 2);
    })));
    return { W, H, px };
  };
  const PALETTE = [[235, 240, 248], [0, 95, 184], [196, 43, 28], [60, 60, 70]];
  const drawImg = (bytes, W, H, mode) => {
    const cv = h('canvas', { width: W, height: H, class: 'pixel-canvas', style: { width: '256px', height: '128px' } });
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const v = bytes[i];
      // Chiffrat: Farbe je 16-Byte-Block aus dessen ersten drei Bytes – gleiche Blöcke ⇒ gleiche Farbe
      const blk = i - (i % 16);
      const [r, g, b] = mode === 'plain' ? PALETTE[v] : [bytes[blk], bytes[blk + 1], bytes[blk + 2]];
      img.data.set([r, g, b, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  };

  // ======================================================================
  KQ.module({
    id: 'modi', world: 'E', icon: '⛓️', title: 'ECB, CBC, CTR & Padding',
    short: 'Das „ECB-Bild“, PKCS#7-Padding und wie sich Bitfehler in jedem Modus fortpflanzen.',
    keywords: 'betriebsmodi ecb cbc ctr padding pkcs7 iv nonce fehlerfortpflanzung',
    challenges: { ecb: { title: 'ECB-Chiffrat erkennen', xp: 30 }, padding: { title: 'Padding bestimmen', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('ECB – Electronic Codebook', modeSvg('ECB'), h('p', null, 'cᵢ = E(k, mᵢ). Jeder Block unabhängig. ', h('b', { class: 'bad-text' }, 'Unsicher:'), ' gleicher Klartextblock ⇒ gleicher Chiffratblock – Muster bleiben sichtbar.')),
          UI.card('CBC – Cipher Block Chaining', modeSvg('CBC'), h('p', null, 'cᵢ = E(k, cᵢ₋₁ ⊕ mᵢ), c₀ = IV (zufällig!). Gleiche Klartexte ⇒ verschiedene Chiffrate. Braucht Padding. Verschlüsselung sequentiell, Entschlüsselung parallelisierbar.')),
          UI.card('CTR – Counter Mode', modeSvg('CTR'), h('p', null, 'cᵢ = mᵢ ⊕ E(k, IV + i). Macht aus der Blockchiffre eine Stromchiffre: Der ', h('b', null, 'Zähler'), ' wird verschlüsselt, nicht der Klartext. Kein Padding, voll parallelisierbar. IV/Zähler darf sich nie wiederholen.')),
          UI.table(['Eigenschaft', 'ECB', 'CBC', 'CTR'], [
            ['IND-CPA-sicher', '✗', '✓ (zufälliger IV)', '✓ (eindeutige Nonce)'],
            ['Padding nötig', 'ja', 'ja', 'nein'],
            ['parallel verschlüsseln', 'ja', 'nein', 'ja'],
            ['1 Bitfehler in cᵢ wirkt auf', 'Block i', 'Block i (ganz) + 1 Bit in i+1', 'genau 1 Bit'],
            ['Integrität', '✗', '✗ (malleable)', '✗ (malleable)'],
          ], { wrap: false }),
          UI.card('Padding (PKCS#7-artig)',
            h('p', null, 'Hat der letzte Block m Bytes (0 < m ≤ 16), werden n = 16 − m Bytes mit dem Wert n angehängt, z. B. 3 fehlende Bytes → ', h('code', null, '03 03 03'), '. Ist der letzte Block voll, wird ein ', h('b', null, 'ganzer Padding-Block 16 × 0x10'), ' angehängt – sonst wäre das Entfernen mehrdeutig.')));
      } },
      { title: '🧪 Bild verschlüsseln', render(el) {
        const { W, H, px } = makeImage();
        const key = U.randomBytes(16), iv = U.randomBytes(16), nonce = U.randomBytes(8);
        const ecb = AES.ecbEncrypt(key, px, false), cbc = AES.cbcEncrypt(key, iv, px, false), ctr = AES.ctr(key, nonce, px);
        const cell = (t, cv, note) => h('div', { class: 'col', style: { alignItems: 'center' } }, h('b', null, t), cv, h('div', { class: 'small muted center' }, note));
        el.append(UI.card('Dasselbe Bild mit AES-128 in drei Modi',
          h('div', { class: 'grid c2', style: { justifyItems: 'center' } },
            cell('Klartext', drawImg(px, W, H, 'plain'), '256×128, 1 Byte/Pixel'),
            cell('ECB', drawImg(ecb, W, H), 'Umrisse bleiben sichtbar!'),
            cell('CBC', drawImg(cbc, W, H), 'Rauschen'),
            cell('CTR', drawImg(ctr, W, H), 'Rauschen')),
          h('p', { class: 'small muted' }, 'Darstellung der Chiffrate: Jeder 16-Byte-Block (= 16 Pixel einer Zeile) wird in einer Farbe gezeichnet, die aus seinen Bytes abgeleitet ist. Identische Chiffratblöcke erscheinen also in identischer Farbe.'),
          UI.callout('info', 'Warum?', 'Ein AES-Block umfasst 16 nebeneinanderliegende Pixel. Einfarbige Flächen ergeben identische Klartextblöcke – und in ECB identische Chiffratblöcke. Die Struktur des Bildes überlebt die „Verschlüsselung“.')));
      } },
      { title: '🧪 Padding & Fehlerfortpflanzung', render(el) {
        let txt = 'Kryptografie macht Spass!';
        const padOut = h('div');
        const drawPad = () => {
          UI.clear(padOut);
          const m = U.utf8(txt), p = AES.pad(m);
          padOut.append(UI.bytes(p, { cols: 16, cls: (i) => (i >= m.length ? 'pad' : ''), fmt: (b, i) => (i < m.length && b >= 32 && b < 127 ? String.fromCharCode(b) : U.hex8(b)) }),
            h('p', { class: 'small' }, `${m.length} Byte Nachricht → ${p.length / 16} Block/Blöcke, ${p.length - m.length} Padding-Bytes mit Wert 0x${U.hex8(p.length - m.length)}.`));
        };
        const key = U.randomBytes(16), iv = U.randomBytes(16), nonce = U.randomBytes(8);
        const msg = U.utf8('BLOCK-EINS-ABCDEBLOCK-ZWEI-FGHIJBLOCK-DREI-KLMNOBLOCK-VIER-PQRST');
        const C = { ECB: AES.ecbEncrypt(key, msg, false), CBC: AES.cbcEncrypt(key, iv, msg, false), CTR: AES.ctr(key, nonce, msg) };
        let fb = 20; // Bitposition (Byte*8+bit)
        const errOut = h('div');
        const drawErr = () => {
          UI.clear(errOut);
          ['ECB', 'CBC', 'CTR'].forEach((mode) => {
            const c = C[mode].slice(); c[fb >> 3] ^= 0x80 >> (fb & 7);
            const d = mode === 'ECB' ? (() => { const ci = AES.cipher(key); const o = new Uint8Array(c.length); for (let i = 0; i < c.length; i += 16) o.set(ci.dec(c.subarray(i, i + 16)), i); return o; })()
              : mode === 'CBC' ? AES.cbcDecrypt(key, iv, c, false).plain : AES.ctr(key, nonce, c);
            errOut.append(h('div', { class: 'mt' }, h('b', null, mode), UI.bytes(d, { cols: 16, cls: (i, b) => (b !== msg[i] ? 'diff' : ''), fmt: (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·') })));
          });
        };
        el.append(UI.card('Padding live', UI.input({ value: txt, w: 'full', oninput: (v) => { txt = v; drawPad(); } }), h('div', { class: 'mt' }, padOut)),
          UI.card('Ein Bit im Chiffrat kippen – was kommt beim Entschlüsseln heraus?',
            UI.slider({ label: 'Bit im Chiffrat', min: 0, max: msg.length * 8 - 1, value: fb, format: (v) => `${v} (Block ${Math.floor(v / 128) + 1}, Byte ${(v >> 3) % 16})`, oninput: (v) => { fb = v; drawErr(); } }),
            errOut, h('p', { class: 'small muted mt' }, 'Rot = verfälschte Bytes. In CBC wird Block i unlesbar, in Block i+1 kippt genau das entsprechende Bit – das ist die Grundlage des Bitflip-Angriffs.')));
        drawPad(); drawErr();
      } },
      { title: '⚔️ Challenges', render(el, ctx) {
        const key = U.randomBytes(16);
        const ecbIdx = U.randInt(0, 3);
        const base = U.utf8('ANGRIFF UM 06:00ANGRIFF UM 06:00RUECKZUG UM 0900ANGRIFF UM 06:00');
        const cts = [0, 1, 2, 3].map((i) => (i === ecbIdx ? AES.ecbEncrypt(key, base, false) : AES.cbcEncrypt(key, U.randomBytes(16), base, false)));
        const r1 = h('div');
        const lens = U.shuffle([5, 13, 16, 23, 31, 32, 40]).slice(0, 3);
        let pDone = 0; const pArea = h('div');
        const pDraw = () => {
          UI.clear(pArea);
          if (pDone >= 3) { pArea.append(UI.status(true, 'alle drei richtig')); ctx.solve('padding'); return; }
          const L = lens[pDone], n = 16 - (L % 16);
          pArea.append(T.answer(`Nachricht mit ${L} Byte: Anzahl und Wert der Padding-Bytes? (Format „Anzahl,Hexwert“, z. B. 3,03)`, (v) => {
            const [a, b] = v.split(',').map((x) => x.trim());
            if (+a === n && parseInt(b, 16) === n) { pDone++; setTimeout(pDraw, 400); return true; }
            return L % 16 === 0 ? 'Achtung: voller letzter Block' : 'nochmal zählen';
          }, { w: 's' }));
        };
        pDraw();
        el.append(
          UI.card('Challenge 1 · Welches Chiffrat stammt aus ECB?',
            h('p', null, 'Vier Chiffrate derselben 64-Byte-Nachricht – drei in CBC mit zufälligem IV, eines in ECB.'),
            h('div', { class: 'col' }, cts.map((c, i) => h('div', { class: 'row' }, UI.button(`Chiffrat ${i + 1}`, () => {
              UI.clear(r1);
              if (i === ecbIdx) { r1.append(UI.status(true, 'richtig – Block 1, 2 und 4 sind identisch')); ctx.solve('ecb'); }
              else r1.append(UI.status(false, 'nein – suche nach wiederholten 16-Byte-Blöcken'));
            }, { sm: true }), h('code', { class: 'small' }, U.chunk(Array.from(c), 16).map((b) => U.hex(b).slice(0, 8) + '…').join(' '))))),
            r1),
          UI.card('Challenge 2 · Padding', pArea));
      } },
    ],
    quiz: [
      { q: 'Welcher Modus braucht KEIN Padding?', a: ['CTR', 'ECB', 'CBC', 'alle brauchen Padding'], c: 0, e: 'CTR ist eine Stromchiffre – Schlüsselstrom wird einfach abgeschnitten.' },
      { q: 'Wie viele Padding-Bytes bekommt eine 32-Byte-Nachricht?', a: ['16 (ganzer Block 0x10)', '0', '1', '32'], c: 0, e: 'Sonst wäre unklar, ob das letzte Byte Padding ist.' },
      { q: 'Warum ist ECB nicht IND-CPA-sicher?', a: ['Gleiche Klartextblöcke ergeben gleiche Chiffratblöcke', 'Weil kein IV benutzt wird – das ist egal', 'Weil AES unsicher ist', 'Weil Padding fehlt'], c: 0, e: 'Unterscheider: zwei gleiche Blöcke verschlüsseln lassen.' },
      { q: 'Ein Bit in cᵢ kippt. Was passiert bei CBC-Entschlüsselung?', a: ['mᵢ wird zerstört, in mᵢ₊₁ kippt dasselbe Bit', 'Nur ein Bit in mᵢ kippt', 'Alle folgenden Blöcke sind zerstört', 'Nichts'], c: 0, e: 'mᵢ₊₁ = D(cᵢ₊₁) ⊕ cᵢ.' },
    ],
  });

  // ======================================================================
  const AMOUNT_BLOCK = 'BETRAG:00010 EUR';
  KQ.module({
    id: 'bitflip', world: 'E', icon: '💸', title: 'Malleability: CBC- & CTR-Bitflipping',
    short: 'Ohne Schlüssel den Klartext gezielt ändern: M ⊕ M′ = C₀ ⊕ C₀′ – Verschlüsselung ist kein Integritätsschutz.',
    keywords: 'malleability manipulierbar bitflip cbc ctr integrität iv',
    challenges: { amount: { title: 'Überweisung manipulieren (CBC)', xp: 60 }, ctr: { title: 'Rolle ändern (CTR)', xp: 40 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('CBC ist malleable',
            h('p', null, 'C = C₀‖C₁ verschlüsselt M (C₀ = IV). Ändert man nur C₀ zu C₀′ und lässt entschlüsseln:'),
            UI.formula('M = F⁻¹(K, C₁) ⊕ C₀,   M′ = F⁻¹(K, C₁) ⊕ C₀′    ⇒    M ⊕ M′ = C₀ ⊕ C₀′'),
            h('p', null, 'Wer den Klartext (oder sein Format) kennt, kann jede gewünschte Änderung Δ = M ⊕ M′ einbauen: ', h('b', null, 'C₀′ = C₀ ⊕ M ⊕ M′'), '. Für spätere Blöcke wird der vorherige Chiffratblock manipuliert – dieser Block wird dabei aber zerstört.')),
          UI.card('CTR (und jede Stromchiffre) ist noch einfacher',
            UI.formula('c = m ⊕ ks  ⇒  c ⊕ Δ entschlüsselt zu m ⊕ Δ'),
            h('p', null, 'Bit für Bit, ohne Kollateralschaden.')),
          UI.callout('exam', 'Konsequenz', 'CBC/CTR sind CPA-, aber nicht CCA-sicher. Gegen Manipulation hilft nur Integritätsschutz: Encrypt-then-MAC oder AEAD (GCM, ChaCha20-Poly1305).'));
      } },
      { title: '⚔️ Challenge: Bank', render(el, ctx) {
        const key = U.randomBytes(16), iv = U.randomBytes(16);
        const plain = U.utf8(AMOUNT_BLOCK + 'EMPF:EVE;ID=4711');
        const ct = AES.cbcEncrypt(key, iv, plain);
        const ivEdit = iv.slice();
        const ivInputs = h('div', { class: 'bytes', style: { gridTemplateColumns: 'repeat(16, auto)' } });
        const res = h('div');
        const drawInputs = () => {
          UI.clear(ivInputs);
          ivEdit.forEach((b, i) => {
            const inp = h('input', { class: 'input mono', value: U.hex8(b), maxlength: 2, style: { width: '38px', padding: '3px', textAlign: 'center', minHeight: '28px' } });
            if (b !== iv[i]) inp.style.background = 'var(--warning-bg)';
            inp.addEventListener('change', () => { const v = parseInt(inp.value, 16); if (!isNaN(v) && v >= 0 && v < 256) ivEdit[i] = v; drawInputs(); });
            ivInputs.append(inp);
          });
        };
        const send = () => {
          UI.clear(res);
          const d = AES.cbcDecrypt(key, ivEdit, ct);
          if (!d.ok) { res.append(UI.callout('danger', 'Bank: Padding-Fehler', 'Nachricht verworfen.')); return; }
          const s = U.printable(d.plain);
          const m = /^BETRAG:(\d{5}) EUR/.exec(s);
          res.append(UI.callout(m ? 'info' : 'warning', 'Bank entschlüsselt:', `<code>${U.escape(s)}</code>` + (m ? `<br>Überweise <b>${+m[1]} EUR</b> an EVE.` : '<br>Format ungültig – abgelehnt.')));
          if (m && +m[1] === 99999) { res.append(UI.callout('success', 'Erfolg!', 'Ohne den Schlüssel zu kennen, hast du den Betrag auf 99999 EUR gesetzt.')); ctx.solve('amount'); }
        };
        drawInputs();
        el.append(UI.card('Mallorys Werkbank',
          h('p', null, 'Eve hat eine Überweisung über 10 EUR an sich selbst ausgelöst. Das Format der Bank ist öffentlich: Block 1 = ', h('code', null, AMOUNT_BLOCK), '. Die Nachricht geht als IV‖C an die Bank. Ziel: Die Bank soll ', h('b', null, 'BETRAG:99999 EUR'), ' lesen.'),
          UI.kv([['Chiffrat C', U.hex(ct, ' ')]]),
          h('h4', null, 'IV (editierbar, Hex pro Byte)'), ivInputs,
          h('div', { class: 'row mt' }, UI.button('📨 An die Bank senden', send, { kind: 'accent' }), UI.button('IV zurücksetzen', () => { ivEdit.set(iv); drawInputs(); UI.clear(res); }, { kind: 'subtle' })),
          res, h('div', { class: 'grid c2 mt' }, T.xorCalc(), UI.callout('tip', 'Hinweis', 'IV′ = IV ⊕ M ⊕ M′. Im XOR-Rechner kannst du Text in Anführungszeichen eingeben, z. B. "BETRAG:00010 EUR".'))));
      } },
      { title: '⚔️ Challenge: CTR', render(el, ctx) {
        const key = U.randomBytes(16), nonce = U.randomBytes(8);
        const m = 'name=eve;rolle=user;exp=2030';
        const c = AES.ctr(key, nonce, U.utf8(m));
        const cIn = UI.input({ value: U.hex(c), mono: true, w: 'full' });
        const res = h('div');
        el.append(UI.card('Session-Token in CTR',
          h('p', null, 'Der Server speichert das Token ', h('code', null, m), ' AES-CTR-verschlüsselt im Cookie (ohne MAC). Ändere das Chiffrat so, dass der Server ', h('code', null, 'rolle=root'), ' liest.'),
          UI.field('Cookie (Hex)', cIn),
          h('div', { class: 'row mt' }, UI.button('🍪 Cookie senden', () => {
            UI.clear(res);
            try {
              const d = U.printable(AES.ctr(key, nonce, U.fromHex(cIn.value)));
              res.append(UI.callout('info', 'Server liest:', `<code>${U.escape(d)}</code>`));
              if (d.includes('rolle=root;')) { res.append(UI.callout('success', 'Root!', 'Vier Bytes per XOR geändert – ohne Schlüssel.')); ctx.solve('ctr'); }
            } catch (e) { res.append(UI.callout('danger', 'Fehler', e.message)); }
          }, { kind: 'accent' })), res,
          h('div', { class: 'mt' }, T.xorCalc()),
          h('p', { class: 'small muted' }, `„user“ beginnt bei Byte ${m.indexOf('user')} (Hex-Zeichen ${2 * m.indexOf('user')}).`)));
      } },
    ],
    quiz: [
      { q: 'Wie wählt man C₀′, damit der erste CBC-Block zu M′ entschlüsselt?', a: ['C₀′ = C₀ ⊕ M ⊕ M′', 'C₀′ = M′', 'C₀′ = E(K, M′)', 'unmöglich ohne Schlüssel'], c: 0, e: 'Folgt aus M ⊕ M′ = C₀ ⊕ C₀′.' },
      { q: 'Was folgt aus der Malleability von CBC?', a: ['CBC ist nicht CCA-sicher', 'CBC ist nicht CPA-sicher', 'AES ist unsicher', 'Der IV muss geheim sein'], c: 0, e: 'Mit Dec-Orakel kann der Angreifer verwandte Chiffrate entschlüsseln lassen.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'paddingoracle', world: 'E', icon: '🔮', title: 'Padding-Oracle-Angriff',
    short: 'Eine Fehlermeldung „Padding falsch“ genügt, um CBC byteweise ohne Schlüssel zu entschlüsseln.',
    keywords: 'padding oracle cbc pkcs7 fehlermeldung vaudenay imessage gzip',
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Das Orakel',
            h('p', null, 'Ein Server entschlüsselt CBC-Nachrichten und meldet (direkt oder über Laufzeit/Fehlercode), ', h('b', null, 'ob das Padding korrekt war'), '. Mehr braucht der Angreifer nicht.')),
          UI.card('Angriff auf das letzte Byte',
            h('ol', null,
              h('li', null, 'Nimm C = C₀‖C₁ und ersetze C₀ durch einen frei gewählten Block r: C̃ = r‖C₁.'),
              h('li', null, 'Variiere r₁₅ über 0…255. Meldet das Orakel „Padding OK“, endet der Klartext (sehr wahrscheinlich) auf 0x01: D(C₁)₁₅ ⊕ r₁₅ = 0x01.'),
              h('li', null, 'Da P₁ = D(C₁) ⊕ C₀ gilt: ', h('b', null, 'P₁[15] = 0x01 ⊕ r₁₅ ⊕ C₀[15]'), '.')),
            h('p', null, 'Nächstes Byte: Setze r₁₅ so, dass das letzte Byte zu 0x02 wird (r₁₅ = D₁₅ ⊕ 0x02), und suche r₁₄ mit Padding 02 02 – usw. Höchstens 256 Anfragen pro Byte, also ≤ 4096 pro Block statt 2¹²⁸.'),
            UI.callout('warning', 'Falsch-Positiv', 'Beim ersten Byte kann zufällig „02 02“ entstehen (wenn D₁₄ ⊕ r₁₄ = 02). Gegenprobe: r₁₄ ändern und erneut fragen – bei echtem 0x01 bleibt das Padding gültig.')),
          UI.card('Reale Fälle',
            h('ul', { class: 'tight' }, h('li', null, 'PKCS#7-Padding-Oracle (Vaudenay 2002; ASP.NET, Java Server Faces, Lucky13 als Timing-Variante).'),
              h('li', null, 'Apple iMessage: Gzip-Oracle – Fehlermeldung bei fehlerhaftem gzip nach dem Entschlüsseln.'))),
          UI.callout('exam', 'Lehre', 'Zu detaillierte Fehlermeldungen über das Datenformat brechen die Verschlüsselung. Abhilfe: Encrypt-then-MAC (MAC vor dem Entschlüsseln prüfen) bzw. AEAD.'));
      } },
    ],
    quiz: [
      { q: 'Welche Information braucht der Angreifer beim Padding-Oracle-Angriff?', a: ['Nur ob das Padding nach dem Entschlüsseln gültig war', 'Den Schlüssel', 'Den vollständigen Klartext', 'Einen zweiten Klartextblock'], c: 0, e: 'Ein einziges Bit Rückmeldung pro Anfrage genügt.' },
      { q: 'Wie verhindert man Padding-Oracles grundsätzlich?', a: ['Encrypt-then-MAC bzw. AEAD: Integrität vor dem Entschlüsseln prüfen', 'Längere Schlüssel', 'ECB statt CBC', 'Den IV geheim halten'], c: 0, e: 'Manipulierte Chiffrate werden verworfen, bevor das Padding überhaupt betrachtet wird.' },
      { q: 'Welche reale Variante wird im Skript genannt?', a: ['Apple iMessage Gzip-Oracle', 'Heartbleed', 'Spectre', 'ROCA'], c: 0, e: 'Fehlermeldung bei fehlerhaftem gzip nach dem Entschlüsseln.' },
    ],
  });
})();
