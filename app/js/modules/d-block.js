/* Welt D – Blockchiffren: Konfusion/Diffusion, Feistel, SIMON, AES */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T, aes: AES, gf28: GF, simon: SIM, toys: TOY } = KQ;
  const h = UI.h;

  // ======================================================================
  KQ.module({
    id: 'konfusion', world: 'D', icon: '🌪️', title: 'Konfusion, Diffusion & Avalanche',
    short: 'Shannons Bauprinzipien, Produktchiffren – und wie schnell sich ein gekipptes Bit in AES ausbreitet.',
    keywords: 'konfusion diffusion avalanche lawineneffekt produktchiffre s-box shannon runden',
    challenges: { sort: { title: 'Bausteine zuordnen', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Blockchiffren',
            h('p', null, 'Verschlüsseln Blöcke fester Länge l (meist 128 Bit; 64 Bit gilt als unsicher – Sweet32). Die Nachricht wird in ⌈|m|/l⌉ Blöcke zerlegt, der letzte per Padding aufgefüllt. Zusammengesetzt werden sie über Betriebsmodi (Welt E).')),
          UI.card('Shannons zwei Prinzipien',
            h('div', { class: 'grid c2' },
              h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, 'Konfusion'), h('p', { class: 'small' }, 'Verschleiert die Beziehung Schlüssel ↔ Chiffrat: Jedes Chiffratbit soll nichtlinear von möglichst vielen Schlüsselbits abhängen. Braucht nichtlineare Bausteine („UND-Gatter-Äquivalent“): S-Boxen (DES, AES), modulare Addition (ChaCha20), AND (SIMON).')),
              h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, 'Diffusion'), h('p', { class: 'small' }, 'Verteilt den Einfluss eines Klartextbits auf möglichst viele Chiffratbits. Ideal: 1 gekipptes Bit ändert ≈ 50 % aller Ausgabebits (Avalanche-Effekt). Umsetzung: lineare Permutationen, ShiftRows, MixColumns, Rotationen.')))),
          UI.card('n-Runden-Produktchiffre',
            h('pre', { class: 'code' }, 'Input\n → Schlüssel-Addition 1\n → Konfusion → Diffusion        ┐\n → Schlüssel-Addition 2         │  n Runden\n → …                            ┘\n → Schlüssel-Addition n+1\nOutput'),
            h('p', null, 'Einzelne Komponenten sind schwach; erst die regelmäßige Wiederholung mit Rundenschlüsseln (vom Key-Scheduler aus dem Originalschlüssel abgeleitet) macht die Chiffre stark.')));
      } },
      { title: '🧪 Avalanche-Labor', render(el) {
        const key = U.fromHex('000102030405060708090a0b0c0d0e0f');
        let pt = U.fromHex('00112233445566778899aabbccddeeff');
        let flip = 0, target = 'pt';
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const p2 = pt.slice(), k2 = key.slice();
          if (target === 'pt') p2[flip >> 3] ^= 0x80 >> (flip & 7); else k2[flip >> 3] ^= 0x80 >> (flip & 7);
          const a = AES.encryptBlock(pt, key, true), b = AES.encryptBlock(p2, k2, true);
          const ark = (tr) => tr.steps.filter((s) => s.op === 'AddRoundKey');
          const ra = ark(a), rb = ark(b);
          const pts = ra.map((s, i) => [i, U.hamming(s.state, rb[i].state)]);
          const diffBits = U.bytesToBits(U.xor(a.output, b.output));
          const xorc = U.hamming(U.xor(pt, key), U.xor(p2, k2));
          out.append(
            h('p', null, `Gekipptes Bit: ${target === 'pt' ? 'Klartext' : 'Schlüssel'}-Bit ${flip}. Geänderte Chiffratbits: `, h('b', null, `${U.hamming(a.output, b.output)} von 128`), ` (${(U.hamming(a.output, b.output) / 1.28).toFixed(0)} %).`),
            UI.bitrow(diffBits, { group: 8, cls: (i, x) => (x === '1' ? 'diff' : '') }),
            h('h4', null, 'Unterschiedliche Bits im Zustand nach jeder Runde'),
            UI.chart({ series: [{ points: pts, color: UI.css('--accent'), dots: true, label: 'AES-128' }, { points: pts.map(([x]) => [x, 64]), color: UI.css('--text-3'), dash: [4, 4], label: 'ideal ≈ 64' }, { points: pts.map(([x]) => [x, xorc]), color: UI.css('--danger'), label: 'c = m ⊕ k (ohne Diffusion)' }], ymin: 0, ymax: 100, xlabel: 'Runde', height: 230 }),
            h('p', { class: 'small muted' }, 'Nach Runde 1 hat sich der Unterschied über eine Spalte verteilt (MixColumns), nach Runde 2 über den ganzen Zustand – volle Diffusion nach 2 Runden. Die „XOR-Chiffre“ c = m ⊕ k ändert dagegen immer genau 1 Bit.'));
        };
        el.append(UI.card('Ein Bit kippen – welche Bits ändern sich?',
          h('div', { class: 'row' }, UI.segmented([['pt', 'im Klartext'], ['key', 'im Schlüssel']], target, (v) => { target = v; draw(); }),
            UI.slider({ label: 'Bit-Nummer', min: 0, max: 127, value: flip, oninput: (v) => { flip = v; draw(); } }),
            UI.button('🎲 Zufälliger Klartext', () => { pt = U.randomBytes(16); draw(); }, { sm: true })),
          out));
        draw();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        const items = U.shuffle([
          ['AES SubBytes (S-Box)', 'K'], ['AES ShiftRows', 'D'], ['AES MixColumns', 'D'], ['Addition mod 2³² (ChaCha20)', 'K'],
          ['Rotation ⋘ n', 'D'], ['AND in der SIMON-F-Funktion', 'K'], ['Bitpermutation (DES P-Box)', 'D'], ['Multiplikatives Inverses in 𝔽₂⁸', 'K'],
        ]);
        const ans = {}; const r = h('div');
        el.append(UI.card('Konfusion (nichtlinear) oder Diffusion (verteilend, linear)?',
          h('div', { class: 'col' }, items.map(([t], i) => h('div', { class: 'row' }, h('span', { style: { width: '300px' } }, t), UI.segmented([['K', 'Konfusion'], ['D', 'Diffusion']], null, (v) => (ans[i] = v))))),
          h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
            UI.clear(r);
            const wrong = items.filter(([, a], i) => ans[i] !== a);
            if (!wrong.length) { r.append(UI.status(true, 'alles richtig')); ctx.solve('sort'); }
            else r.append(UI.status(false, 'falsch: ' + wrong.map(([t]) => t).join(', ')));
          }, { kind: 'accent' }), r)));
      } },
    ],
    quiz: [
      { q: 'Welcher AES-Baustein ist der einzige nichtlineare?', a: ['SubBytes', 'ShiftRows', 'MixColumns', 'AddRoundKey'], c: 0, e: 'Das Inverse in 𝔽₂⁸ ist nichtlinear.' },
      { q: 'Was beschreibt der Avalanche-Effekt?', a: ['1 geändertes Eingabebit ändert ≈ 50 % der Ausgabebits', 'Der Schlüssel wird lawinenartig länger', 'Fehler im Chiffrat setzen sich fort', 'Die Rundenzahl verdoppelt sich'], c: 0, e: 'Kennzeichen guter Diffusion.' },
      { q: 'Warum gilt eine Blocklänge von 64 Bit als unsicher?', a: ['Geburtstagskollisionen nach ≈ 2³² Blöcken (Sweet32)', 'Weil 64-Bit-Schlüssel zu kurz sind', 'Weil kein Padding möglich ist', 'Weil AES 64 Bit nicht unterstützt'], c: 0, e: 'Bei 2³² Blöcken (32 GiB) werden Kollisionen wahrscheinlich.' },
    ],
  });

  // ======================================================================
  const feistelSvg = (rounds, L0, R0) => {
    const W = 460, rowH = 90, top = 30;
    let s = `<svg viewBox="0 0 ${W} ${top + rounds.length * rowH + 40}" width="${W}" style="max-width:100%">`;
    const box = (x, y, t, cls = 'flow-node', w = 70) => `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="6" class="${cls}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" class="mono">${t}</text>`;
    const xL = 90, xR = 370, xF = 250;
    s += box(xL, top, 'L₀=' + U.hex8(L0)) + box(xR, top, 'R₀=' + U.hex8(R0));
    rounds.forEach((r, i) => {
      const y = top + (i + 1) * rowH;
      const ym = y - rowH / 2;
      s += `<line x1="${xR}" y1="${y - rowH + 14}" x2="${xR}" y2="${ym}" class="flow-line"/><line x1="${xR}" y1="${ym}" x2="${xF + 30}" y2="${ym}" class="flow-line"/>`;
      s += box(xF, ym, `F(k${i + 1})`, 'flow-op', 60);
      s += `<text x="${xF}" y="${ym - 20}" text-anchor="middle" font-size="10" class="t2 mono">k=${U.hex8(r.k)} → ${U.hex8(r.f)}</text>`;
      s += `<line x1="${xF - 30}" y1="${ym}" x2="${xL + 12}" y2="${ym}" class="flow-line"/><circle cx="${xL}" cy="${ym}" r="11" class="flow-op"/><text x="${xL}" y="${ym + 5}" text-anchor="middle" font-size="14">⊕</text>`;
      s += `<line x1="${xL}" y1="${y - rowH + 14}" x2="${xL}" y2="${ym - 11}" class="flow-line"/>`;
      // Kreuzung
      s += `<line x1="${xL}" y1="${ym + 11}" x2="${xR}" y2="${y - 14}" class="flow-line hot"/><line x1="${xR}" y1="${ym}" x2="${xL}" y2="${y - 14}" class="flow-line"/>`;
      s += box(xL, y, `L${i + 1}=${U.hex8(r.nL)}`) + box(xR, y, `R${i + 1}=${U.hex8(r.nR)}`);
    });
    return UI.html(s + '</svg>');
  };
  const FS = {
    toy: [(k, x) => TOY.roundF(k, x), 'Toy-PRF (nicht bijektiv)'],
    lin: [(k, x) => x ^ k, 'F(k,x) = x ⊕ k (linear!)'],
    zero: [() => 0, 'F ≡ 0 (nur Vertauschen)'],
  };

  KQ.module({
    id: 'feistel', world: 'D', icon: '🪜', title: 'Feistel-Netzwerk',
    short: 'Invertierbar, obwohl F es nicht ist: Runden visualisieren, entschlüsseln, Luby-Rackoff.',
    keywords: 'feistel netzwerk runden des luby rackoff prp invertierbar',
    challenges: { order: { title: 'Rundenschlüssel-Reihenfolge', xp: 30 }, collision: { title: 'F ist nicht bijektiv', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        const rk = [0x3a, 0xc5, 0x19];
        const tr = TOY.feistelEnc(0x4b, 0x51, rk, TOY.roundF, true);
        el.append(
          UI.card('Struktur (Horst Feistel, 1973)',
            UI.formula('L<sub>i+1</sub> = R<sub>i</sub>          R<sub>i+1</sub> = L<sub>i</sub> ⊕ F(R<sub>i</sub>, k<sub>i</sub>)'),
            h('div', { class: 'grid c2' }, feistelSvg(tr.rounds, 0x4b, 0x51),
              h('div', null,
                h('p', null, 'Rᵢ läuft unverändert nach links und speist parallel F(Rᵢ, kᵢ); dessen Ausgabe wird mit Lᵢ ge-XOR-t und bildet die neue rechte Hälfte.'),
                h('p', null, h('b', null, 'Entschlüsselung'), ' mit denselben Komponenten: aus Rₙ = Lₙ₋₁ ⊕ F(Rₙ₋₁, kₙ₋₁) und Lₙ = Rₙ₋₁ folgt'),
                UI.formula('R<sub>n−1</sub> = L<sub>n</sub>,     L<sub>n−1</sub> = R<sub>n</sub> ⊕ F(L<sub>n</sub>, k<sub>n−1</sub>)'),
                h('p', null, '⇒ Rundenschlüssel in ', h('b', null, 'umgekehrter Reihenfolge'), ' anwenden. F muss ', h('b', null, 'nicht'), ' invertierbar sein!')))),
          UI.card('Luby-Rackoff',
            h('p', null, 'Ist F eine sichere PRF, dann ist das Feistel-Netzwerk mit ', h('b', null, '3 Runden eine PRP'), ' und mit 4 Runden eine starke PRP (auch mit Entschlüsselungsorakel). Mit 1 oder 2 Runden gibt es einfache Unterscheider – probiere sie in der Arena (Welt F) aus.'),
            UI.callout('warning', 'Praxis-Lücke', 'Reale Rundenfunktionen sind meist keine echten PRFs – der Satz begründet die Struktur, nicht die Sicherheit konkreter Chiffren. Beweis (Three-Hop + Bad-Event) in der Game-Hopping-Werkstatt.')));
      } },
      { title: '🧪 Labor', render(el) {
        let txt = 'Hi', nR = 4, keys = Array.from({ length: 8 }, () => U.randInt(0, 255)), fsel = 'toy', rev = true;
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          const b = U.utf8(txt.padEnd(2, ' ')).slice(0, 2);
          const F = FS[fsel][0], ks = keys.slice(0, nR);
          const enc = TOY.feistelEnc(b[0], b[1], ks, F, true);
          const dec = TOY.feistelDec(enc.L, enc.R, rev ? ks : ks.slice().reverse(), F, true);
          const img = new Set(); for (let x = 0; x < 256; x++) img.add(F(ks[0], x));
          out.append(h('div', { class: 'grid c2' },
            h('div', null, h('h4', null, 'Verschlüsselung'), feistelSvg(enc.rounds, b[0], b[1])),
            h('div', null,
              h('h4', null, 'Ergebnis'),
              UI.kv([['Klartext', `${U.hex8(b[0])} ${U.hex8(b[1])} („${String.fromCharCode(b[0], b[1])}“)`], ['Chiffrat', `${U.hex8(enc.L)} ${U.hex8(enc.R)}`], ['Rundenschlüssel', ks.map(U.hex8).join(' ')],
                ['Entschlüsselt', `${U.hex8(dec.L)} ${U.hex8(dec.R)}`], ['|Bild von F(k₁,·)|', `${img.size} von 256 ⇒ ${img.size < 256 ? 'nicht bijektiv' : 'bijektiv'}`]]),
              dec.L === b[0] && dec.R === b[1] ? UI.callout('success', 'Entschlüsselung korrekt', 'Obwohl F nicht invertierbar sein muss.') : UI.callout('danger', 'Entschlüsselung falsch', 'Die Rundenschlüssel wurden in der falschen Reihenfolge angewendet.'),
              fsel === 'lin' ? UI.callout('warning', 'Lineare F', 'Mit F(k,x) = x ⊕ k ist die ganze Chiffre affin über 𝔽₂ – mit wenigen Klartext-Chiffrat-Paaren lösbar (lineares Gleichungssystem).') : null,
              fsel === 'zero' ? UI.callout('warning', 'F ≡ 0', 'Ohne Rundenfunktion werden die Hälften nur vertauscht – keinerlei Sicherheit.') : null)));
        };
        el.append(UI.card('16-Bit-Feistel (2 Hälften à 8 Bit)',
          h('div', { class: 'row' }, UI.field('Klartext (2 Zeichen)', UI.input({ value: txt, maxlength: 2, w: 's', oninput: (v) => { txt = v; draw(); } })),
            UI.slider({ label: 'Runden', min: 1, max: 8, value: nR, oninput: (v) => { nR = v; draw(); } }),
            UI.select(Object.entries(FS).map(([k, v]) => [k, v[1]]), fsel, (v) => { fsel = v; draw(); }),
            UI.button('🎲 Neue Schlüssel', () => { keys = keys.map(() => U.randInt(0, 255)); draw(); }, { sm: true }),
            UI.toggle('Entschlüsseln mit umgekehrten Schlüsseln', rev, (v) => { rev = v; draw(); })),
          out));
        draw();
      } },
      { title: '⚔️ Challenges', render(el, ctx) {
        const keys = Array.from({ length: 4 }, () => U.randInt(0, 255));
        const msg = 'GEHEIM';
        const blocks = U.chunk(Array.from(U.utf8(msg)), 2).map(([a, b]) => TOY.feistelEnc(a, b, keys));
        const sel = [null, null, null, null];
        const out = h('div');
        const draw = () => {
          UI.clear(out);
          if (sel.some((s) => s === null)) { out.append(h('p', { class: 'muted' }, 'Wähle für alle vier Positionen einen Schlüssel.')); return; }
          const ks = sel.map((i) => keys[i]);
          // Entschlüsselung: Funktion erwartet Verschlüsselungsreihenfolge und kehrt sie um – hier wenden wir ks direkt in der gewählten Reihenfolge an
          const pt = blocks.map(([L, R]) => { let l = L, r = R; ks.forEach((k) => { const f = TOY.roundF(k, l); const pR = l, pL = r ^ f; l = pL; r = pR; }); return [l, r]; }).flat();
          const s = U.printable(Uint8Array.from(pt));
          out.append(h('p', null, 'Entschlüsselt: ', h('b', { class: 'mono' }, s)));
          if (s === msg) { out.append(UI.status(true, 'richtig – umgekehrte Reihenfolge')); ctx.solve('order'); }
        };
        const k = U.randInt(0, 255);
        let showTable = false;
        const tbl = h('div');
        el.append(
          UI.card('Challenge 1 · In welcher Reihenfolge entschlüsseln?',
            h('p', null, 'Eine 4-Runden-Feistel-Chiffre hat drei Blöcke verschlüsselt: ', h('code', null, blocks.map(([a, b]) => U.hex8(a) + U.hex8(b)).join(' ')), '. Die Rundenschlüssel der Verschlüsselung waren k₁…k₄ = ', h('code', null, keys.map(U.hex8).join(', ')), '.'),
            h('div', { class: 'row' }, [0, 1, 2, 3].map((p) => UI.field(`Entschlüsselungsrunde ${p + 1}`, UI.select([['', '–']].concat(keys.map((x, i) => [i, `k${i + 1} = ${U.hex8(x)}`])), '', (v) => { sel[p] = v === '' ? null : +v; draw(); })))),
            out),
          UI.card('Challenge 2 · Kollision in F finden',
            h('p', null, `Zeige, dass die Rundenfunktion F(k, ·) mit k = 0x${U.hex8(k)} nicht bijektiv ist: Finde x ≠ x′ mit F(k, x) = F(k, x′).`),
            h('div', { class: 'row' }, UI.button('Wertetabelle F(k, ·) ein/aus', () => {
              showTable = !showTable; UI.clear(tbl);
              if (showTable) tbl.append(UI.bytes(Array.from({ length: 256 }, (_, x) => TOY.roundF(k, x)), { cols: 16, title: (x, v) => `F(k, 0x${U.hex8(x)}) = 0x${U.hex8(v)}` }), h('p', { class: 'small muted' }, 'Zeile = oberes Nibble von x, Spalte = unteres Nibble. Fahre mit der Maus über einen Wert.'));
            }, { sm: true })), tbl,
            (() => {
              const a = UI.input({ placeholder: 'x (hex)', mono: true, w: 's' }), b = UI.input({ placeholder: 'x′ (hex)', mono: true, w: 's' });
              const r = h('span');
              return h('div', { class: 'row mt' }, a, b, UI.button('Prüfen', () => {
                const x = parseInt(a.value, 16), y = parseInt(b.value, 16);
                UI.clear(r);
                if (isNaN(x) || isNaN(y) || x === y || x > 255 || y > 255) { r.append(UI.status(false, 'zwei verschiedene Bytes angeben')); return; }
                const fx = TOY.roundF(k, x), fy = TOY.roundF(k, y);
                if (fx === fy) { r.append(UI.status(true, `F = 0x${U.hex8(fx)} für beide`)); ctx.solve('collision'); }
                else r.append(UI.status(false, `F(x) = ${U.hex8(fx)}, F(x′) = ${U.hex8(fy)}`));
              }, { sm: true }), r);
            })()));
        draw();
      } },
    ],
    quiz: [
      { q: 'Wie entschlüsselt man ein Feistel-Netzwerk?', a: ['Gleiche Struktur, Rundenschlüssel in umgekehrter Reihenfolge', 'Mit F⁻¹', 'Mit einer anderen Chiffre', 'Gar nicht ohne F⁻¹'], c: 0, e: 'F muss nicht invertierbar sein.' },
      { q: 'Wie viele Feistel-Runden braucht man nach Luby-Rackoff für eine (schwache) PRP?', a: ['3', '1', '2', '16'], c: 0, e: '3 Runden: PRP, 4 Runden: starke PRP.' },
      { q: 'Was gilt nach einer Feistel-Runde?', a: ['L₁ = R₀', 'R₁ = R₀', 'L₁ = L₀ ⊕ R₀', 'L₁ = F(L₀)'], c: 0, e: 'Genau das macht 1 Runde trivial unterscheidbar.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'simon', world: 'D', icon: '🔧', title: 'SIMON – Feistel in Hardware',
    short: 'NSA-Blockchiffre aus Rotationen, AND und XOR: Rundenfunktion und Key-Scheduler im Detail.',
    keywords: 'simon nsa leichtgewichtig feistel hardware key schedule rotation and',
    challenges: { f: { title: 'F(x) von Hand', xp: 40 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('SIMON (NSA, 2013)',
            h('p', null, 'Standard-Feistel mit extrem einfacher F-Funktion, optimiert für kleine und schnelle Hardware. 10 Varianten: Block 32–128 Bit, Schlüssel 64–256 Bit. Ein Block = 2 Wörter (L, R) à n Bit, Schlüssel = m ∈ {2, 3, 4} Wörter.'),
            UI.table(['Variante', 'n (Wortgröße)', 'm (Schlüsselwörter)', 'T (Runden)'], [['Simon 32/64 (hier)', 16, 4, 32], ['Simon 64/128', 32, 4, 44], ['Simon 128/128 (Skript)', 64, 2, 68]], { wrap: false })),
          UI.card('Rundenfunktion',
            UI.formula('L<sub>i+1</sub> = R<sub>i</sub> ⊕ F(L<sub>i</sub>) ⊕ k<sub>i</sub>,   R<sub>i+1</sub> = L<sub>i</sub>,   F(x) = ((x ⋘ 1) ∧ (x ⋘ 8)) ⊕ (x ⋘ 2)'),
            h('p', null, 'Nur 3 Rotationen, 1 AND, 3 XOR pro Runde. Das ', h('b', null, 'AND'), ' ist die einzige nichtlineare Operation (Konfusion), die Rotationen verteilen Bits (Diffusion), der Feistel-Tausch trägt alles in die andere Hälfte. F wirkt hier auf die linke Hälfte – reine Namenskonvention.')),
          UI.card('Key-Scheduler (Schieberegister)',
            UI.formula('m = 2:  k<sub>i+2</sub> = c ⊕ (z<sub>j</sub>)<sub>i</sub> ⊕ k<sub>i</sub> ⊕ (I ⊕ S<sup>−1</sup>)(S<sup>−3</sup> k<sub>i+1</sub>)'),
            UI.formula('m = 4:  k<sub>i+4</sub> = c ⊕ (z<sub>j</sub>)<sub>i</sub> ⊕ k<sub>i</sub> ⊕ (I ⊕ S<sup>−1</sup>)(S<sup>−3</sup> k<sub>i+3</sub> ⊕ k<sub>i+1</sub>)'),
            h('p', null, 'Die ersten m Rundenschlüssel sind die Schlüsselwörter selbst. S = Rotation um 1 Bit nach links, I = Identität: (I ⊕ S⁻¹)(t) = t ⊕ (t ⋙ 1). c = 2ⁿ − 4 und die Bitfolge zⱼ sind Konstanten – sie brechen die Selbstähnlichkeit der Runden (Schutz gegen Slide-Angriffe).'),
            UI.callout('info', 'Testvektor (Simon-Paper)', 'Simon 32/64: Schlüssel 1918 1110 0908 0100, Klartext 6565 6877 ⇒ Chiffrat c69b e9bb – das Labor rechnet genau diesen Fall nach.')));
      } },
      { title: '🧪 Labor', render(el) {
        const kIn = UI.input({ value: '1918 1110 0908 0100', mono: true, w: 'l' }), pIn = UI.input({ value: '6565 6877', mono: true, w: 'm' });
        const out = h('div');
        const bits16 = (v, cls) => UI.bitrow(U.bits(v, 16), { group: 8, cls: cls ? (i, b) => (b === '1' ? cls : '') : undefined });
        const run = () => {
          UI.clear(out);
          let key, x, y;
          try {
            const kw = kIn.value.trim().split(/\s+/).map((w) => parseInt(w, 16));
            const pw = pIn.value.trim().split(/\s+/).map((w) => parseInt(w, 16));
            if (kw.length !== 4 || pw.length !== 2 || kw.concat(pw).some((v) => isNaN(v) || v > 0xffff)) throw new Error('4 Schlüsselwörter und 2 Klartextwörter (je 4 Hex-Ziffern)');
            key = [kw[3], kw[2], kw[1], kw[0]]; [x, y] = pw;
          } catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); return; }
          const tr = SIM.encrypt(x, y, key, true);
          const ok = U.hex16(tr.x) + U.hex16(tr.y) === 'c69be9bb';
          out.append(h('p', null, 'Chiffrat: ', h('b', { class: 'mono' }, U.hex16(tr.x) + ' ' + U.hex16(tr.y)), ok ? h('span', null, ' ', UI.status(true, 'Testvektor bestätigt')) : null));
          out.append(UI.stepper(tr.rounds.length, (i, body) => {
            const r = tr.rounds[i], f = SIM.fTrace(r.x);
            body.append(UI.table(['Wert', 'Bits', 'Hex'], [
              ['L = x', bits16(r.x), U.hex16(r.x)], ['x ⋘ 1', bits16(f.r1), U.hex16(f.r1)], ['x ⋘ 8', bits16(f.r8), U.hex16(f.r8)],
              ['(x⋘1) ∧ (x⋘8)', bits16(f.and, 'diff'), U.hex16(f.and)], ['x ⋘ 2', bits16(f.r2), U.hex16(f.r2)], ['F(x)', bits16(f.out, 'one'), U.hex16(f.out)],
              ['R = y', bits16(r.y), U.hex16(r.y)], [`k${i}`, bits16(r.k), U.hex16(r.k)], ['neues L = y ⊕ F(x) ⊕ k', bits16(r.nx, 'one'), U.hex16(r.nx)], ['neues R = x', bits16(r.ny), U.hex16(r.ny)],
            ], { wrap: false }));
          }, { label: (i) => `Runde ${i + 1} / 32`, interval: 500 }));
          out.append(h('h4', null, 'Alle 32 Rundenschlüssel'), UI.bytes(tr.keys, { cols: 8, wide: true, fmt: (w) => U.hex16(w), cls: (i) => (i < 4 ? 'key' : '') }), h('p', { class: 'small muted' }, 'Lila: die vier Originalschlüsselwörter k₀…k₃, danach vom Schieberegister erzeugt.'));
        };
        el.append(UI.card('Simon 32/64', h('div', { class: 'row' }, UI.field('Schlüssel (k₃ k₂ k₁ k₀)', kIn), UI.field('Klartext (L R)', pIn), UI.button('Verschlüsseln', run, { kind: 'accent' })), out));
        run();
      } },
      { title: '⚔️ Challenge', render(el, ctx) {
        let n = 0; const area = h('div');
        const draw = () => {
          UI.clear(area);
          if (n >= 2) { area.append(UI.callout('success', 'Zweimal richtig', '')); ctx.solve('f'); return; }
          const x = U.randInt(1, 0xffff);
          area.append(h('p', null, `Aufgabe ${n + 1}/2: Berechne F(x) = ((x ⋘ 1) ∧ (x ⋘ 8)) ⊕ (x ⋘ 2) für x = 0x${U.hex16(x)}:`),
            UI.bitrow(U.bits(x, 16), { group: 4 }),
            T.answer('F(x) = 0x', (v) => { if (parseInt(v, 16) === SIM.f(x)) { n++; setTimeout(draw, 500); return true; } return 'nochmal: Rotation nach links, Bits wandern zyklisch'; }));
        };
        draw();
        el.append(UI.card('Die SIMON-F-Funktion von Hand', area));
      } },
    ],
    quiz: [
      { q: 'Welche Operation ist in SIMON nichtlinear?', a: ['AND', 'XOR', 'Rotation', 'Feistel-Tausch'], c: 0, e: '„Konfusion braucht UND-Gatter.“' },
      { q: 'Warum muss F in SIMON nicht invertierbar sein?', a: ['Wegen der Feistel-Struktur', 'Weil AND invertierbar ist', 'Weil der Key-Scheduler das ausgleicht', 'Muss es doch'], c: 0, e: 'Entschlüsselung = gleiche Struktur, Rundenschlüssel rückwärts.' },
      { q: 'Wozu dienen die Konstanten c und zⱼ im Key-Scheduler?', a: ['Sie brechen die Selbstähnlichkeit der Runden (gegen Slide-Angriffe)', 'Sie verlängern den Schlüssel', 'Sie sind der IV', 'Sie ersetzen die S-Box'], c: 0, e: 'Ohne sie wären alle Runden identisch aufgebaut.' },
    ],
  });

  // ======================================================================
  const OPS_DESC = {
    Input: 'Klartext spaltenweise in die 4×4-Matrix eingefüllt.',
    AddRoundKey: 'Zustand ⊕ Rundenschlüssel – der einzige Schritt, in dem der Schlüssel eingeht.',
    SubBytes: 'Jedes Byte durch die S-Box ersetzt: s′ = M · s⁻¹ ⊕ 0x63 (Inverses in 𝔽₂⁸ + affine Abbildung). Klicke ein Byte für den Rechenweg.',
    ShiftRows: 'Zeile r wird um r Positionen nach links rotiert. Die vier Bytes einer Spalte landen in vier verschiedenen Spalten.',
    MixColumns: 'Jede Spalte wird mit der Matrix [02 03 01 01; 01 02 03 01; 01 01 02 03; 03 01 01 02] über 𝔽₂⁸ multipliziert. Klicke ein Byte für den Rechenweg.',
  };

  KQ.module({
    id: 'aes', world: 'D', icon: '🧱', title: 'AES Schritt für Schritt',
    short: 'Echter AES-128 (FIPS 197): alle 41 Zwischenzustände, S-Box-Herleitung, MixColumns-Rechnung, Key-Expansion.',
    keywords: 'aes rijndael subbytes shiftrows mixcolumns addroundkey key expansion sbox fips 197',
    challenges: { shiftrows: { title: 'ShiftRows vorhersagen', xp: 30 }, mixcol: { title: 'MixColumns-Byte rechnen', xp: 50 }, order: { title: 'Rundenaufbau', xp: 30 } },
    tabs: [
      { title: '📖 Verstehen', render(el) {
        el.append(
          UI.card('Überblick',
            h('p', null, '128-Bit-Block, Schlüssel 128/192/256 Bit mit 10/12/14 Runden. NIST-Standard seit 2001 (FIPS 197), Nachfolger von DES/3DES. Substitutions-Permutations-Netzwerk (SPN) – kein Feistel.'),
            h('p', null, 'Zustand: 16 Bytes, ', h('b', null, 'spaltenweise'), ' in eine 4×4-Matrix gefüllt (b₀ b₁ b₂ b₃ bilden Spalte 0).')),
          UI.table(['Baustein', 'wirkt auf', 'Aufgabe'], [
            ['AddRoundKey', 'ganzer Zustand', 'XOR mit Rundenschlüssel; selbstinvers'],
            ['SubBytes', 'einzelne Bytes', 'Konfusion: Inverses in 𝔽₂[x]/(x⁸+x⁴+x³+x+1), dann affine Abbildung – einzige Nichtlinearität'],
            ['ShiftRows', 'Zeilen', 'Diffusion über die Spalten (Zeile r um r nach links)'],
            ['MixColumns', 'Spalten', 'Diffusion innerhalb der Spalte (Matrix mit 01, 02, 03 = 1, x, x+1)'],
          ], { wrap: false }),
          UI.card('Rundenstruktur',
            h('pre', { class: 'code' }, 'AddRoundKey(k₀)\nRunde 1 … n−1:  SubBytes → ShiftRows → MixColumns → AddRoundKey(kᵢ)\nRunde n:        SubBytes → ShiftRows → AddRoundKey(kₙ)      ← kein MixColumns!'),
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, 'n + 1 Rundenschlüssel: '), 'Ohne die erste Schlüsseladdition böte Runde 1 keinen Schutz (die anderen Schritte sind öffentlich und invertierbar); ohne die letzte genauso Runde n.'),
              h('li', null, h('b', null, 'Letzte Runde ohne MixColumns: '), 'macht Ver- und Entschlüsselung strukturähnlicher (Dunkelman et al.: erleichtert manche Angriffe minimal).'),
              h('li', null, h('b', null, 'Key-Expansion: '), 'RotWord, SubWord (S-Box) und Rundenkonstante Rcon erzeugen 44 Wörter = 11 Rundenschlüssel.'))),
          UI.card('Angriffe auf AES',
            h('ul', { class: 'tight' },
              h('li', null, h('b', null, 'Mathematisch: '), 'kein praktischer Angriff. Biclique: Faktor ≈ 4 besser als Brute Force (2¹²⁶·¹ für AES-128). Related-Key-Angriffe auf AES-192/256 praktisch irrelevant.'),
              h('li', null, h('b', null, 'Implementierung: '), 'Cache-Timing (Tabellen-Lookups!), Correlation Power Analysis, Differential Fault Injection in Runde 8 bricht AES-128 vollständig.'),
              h('li', null, h('b', null, 'Quantencomputer: '), 'Shor nicht anwendbar. Grover halbiert nur die effektive Schlüssellänge: AES-128 → 2⁶⁴, AES-256 → 2¹²⁸ ⇒ AES-256 gilt als quantensicher.'))));
      } },
      { title: '🧪 Runden-Explorer', render(el) {
        const kIn = UI.input({ value: '2b7e151628aed2a6abf7158809cf4f3c', mono: true, w: 'l' });
        const pIn = UI.input({ value: '3243f6a8885a308d313198a2e0370734', mono: true, w: 'l' });
        const out = h('div');
        const run = () => {
          UI.clear(out);
          let key, pt;
          try { key = U.fromHex(kIn.value); pt = U.fromHex(pIn.value); if (key.length !== 16 || pt.length !== 16) throw new Error('je 16 Byte (32 Hex-Zeichen)'); }
          catch (e) { out.append(UI.callout('danger', 'Eingabe', e.message)); return; }
          const tr = AES.encryptBlock(pt, key, true);
          const fips = U.hex(tr.output) === '3925841d02dc09fbdc118597196a0b32';
          out.append(h('p', null, 'Chiffrat: ', h('b', { class: 'mono' }, U.hex(tr.output, ' ')), fips ? h('span', null, ' ', UI.status(true, 'FIPS 197 Anhang B')) : null));
          out.append(UI.stepper(tr.steps.length, (i, body) => {
            const s = tr.steps[i], prev = i ? tr.steps[i - 1].state : s.state;
            const detail = h('div', { class: 'mt' });
            const showDetail = (idx) => {
              UI.clear(detail);
              if (s.op === 'SubBytes') {
                const t = AES.sboxTrace(prev[idx]);
                detail.append(UI.callout('info', `SubBytes für b${idx} = 0x${U.hex8(t.input)}`,
                  `1) Inverses in 𝔽₂⁸: 0x${U.hex8(t.input)}⁻¹ = 0x${U.hex8(t.inverse)} (Probe: 0x${U.hex8(GF.mul(t.input, t.inverse))})<br>` +
                  `2) affin: b ⊕ (b⋘1) ⊕ (b⋘2) ⊕ (b⋘3) ⊕ (b⋘4) ⊕ 0x63 = <b>0x${U.hex8(t.output)}</b> = S-Box[0x${U.hex8(t.input)}]`));
              } else if (s.op === 'MixColumns') {
                const c = idx >> 2, r = idx & 3;
                const col = [0, 1, 2, 3].map((k) => prev[4 * c + k]);
                const t = AES.mixColumnTrace(col, r);
                detail.append(UI.callout('info', `MixColumns: Zeile ${r}, Spalte ${c}`,
                  t.terms.map((x) => `0x${U.hex8(x.m)}·0x${U.hex8(x.b)} = 0x${U.hex8(x.prod)}`).join(' ⊕ ') + ` = <b>0x${U.hex8(t.result)}</b>`));
              } else if (s.op === 'ShiftRows') {
                const c = idx >> 2, r = idx & 3, src = r + 4 * ((c + r) % 4);
                detail.append(UI.callout('info', `ShiftRows`, `Neues b${idx} (Zeile ${r}, Spalte ${c}) kommt von altem b${src} (Spalte ${(c + r) % 4}).`));
              } else if (s.op === 'AddRoundKey') {
                detail.append(UI.callout('info', 'AddRoundKey', `0x${U.hex8(prev[idx])} ⊕ 0x${U.hex8(s.key[idx])} = 0x${U.hex8(s.state[idx])}`));
              }
            };
            body.append(h('h4', null, `Runde ${s.round} · ${s.op}`), h('p', { class: 'small muted' }, OPS_DESC[s.op]),
              h('div', { class: 'row top', style: { gap: '28px' } },
                i ? UI.matrix(prev, { label: 'vorher' }) : null,
                UI.matrix(s.state, { label: 'nachher', cls: (k) => (i && prev[k] !== s.state[k] ? 'hi' : ''), onclick: showDetail }),
                s.key ? UI.matrix(s.key, { label: `Rundenschlüssel k${s.round}`, cls: () => 'key' }) : null),
              detail);
          }, { label: (i) => `${i + 1}/${tr.steps.length}: R${tr.steps[i].round} ${tr.steps[i].op}`, interval: 800 }));
        };
        el.append(UI.card('Eingabe (Standard: FIPS 197 Anhang B)', h('div', { class: 'row' }, UI.field('Schlüssel', kIn), UI.field('Klartext', pIn), UI.button('Verschlüsseln', run, { kind: 'accent' }))), out);
        run();
      } },
      { title: '🧪 S-Box & Key-Expansion', render(el) {
        const det = h('div');
        const show = (b) => { UI.clear(det); const t = AES.sboxTrace(b); det.append(UI.kv([['Eingabe', '0x' + U.hex8(b) + ' = ' + GF.poly(b)], ['Inverses in 𝔽₂⁸', '0x' + U.hex8(t.inverse) + ' = ' + GF.poly(t.inverse)], ['affine Abbildung', `→ 0x${U.hex8(t.output)}`]])); };
        const key = U.fromHex('2b7e151628aed2a6abf7158809cf4f3c');
        const ex = AES.expandKey(key);
        el.append(UI.card('Die AES-S-Box (Zeile = oberes Nibble, Spalte = unteres)',
          UI.bytes(AES.SBOX, { cols: 16, onclick: (i) => show(i), title: (i, v) => `S(0x${U.hex8(i)}) = 0x${U.hex8(v)}` }), det,
          UI.callout('warning', 'Seitenkanal', 'Als 256-Byte-Tabelle hängt die Zugriffsadresse vom geheimen Byte ab → Cache-Timing-Angriffe. Konstante-Zeit-Alternative: Unterkörper-Arithmetik 𝔽₂²/𝔽₂⁴ oder Bitslicing.')),
          UI.card('Key-Expansion für 2b7e1516 28aed2a6 abf71588 09cf4f3c',
            UI.table(['i', 'w[i−1]', 'RotWord', 'SubWord', 'Rcon', '⊕ w[i−4]', '= w[i]'], ex.trace.map((t) => [t.i, U.hex(t.prev), t.rot ? U.hex(t.rot) : '', t.sub ? U.hex(t.sub) : '', t.rcon ? U.hex8(t.rcon) : '', U.hex(t.wMinus4), '<b>' + U.hex(t.result) + '</b>']), { mono: true, maxHeight: '380px' })));
        show(0x53);
      } },
      { title: '⚔️ Challenges', render(el, ctx) {
        // ShiftRows
        const st = U.randomBytes(16);
        const sr = AES.shiftRows(st);
        const asks = U.shuffle([1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]).slice(0, 3);
        let srDone = 0;
        const srArea = h('div');
        const srDraw = () => {
          UI.clear(srArea);
          if (srDone >= 3) { srArea.append(UI.status(true, 'alle drei richtig')); ctx.solve('shiftrows'); return; }
          const idx = asks[srDone];
          srArea.append(T.answer(`Welches Byte steht nach ShiftRows in Zeile ${idx & 3}, Spalte ${idx >> 2}?  0x`, (v) => { if (parseInt(v, 16) === sr[idx]) { srDone++; setTimeout(srDraw, 400); return true; } return 'Zeile r rotiert um r nach links'; }));
        };
        srDraw();
        // MixColumns
        const col = U.pick([[0xd4, 0xbf, 0x5d, 0x30], [0xdb, 0x13, 0x53, 0x45], Array.from(U.randomBytes(4))]);
        const row = U.randInt(0, 3);
        const t = AES.mixColumnTrace(col, row);
        el.append(
          UI.card('Challenge 1 · ShiftRows', UI.matrix(st, { label: 'Zustand vorher' }), h('div', { class: 'mt' }, srArea)),
          UI.card('Challenge 2 · Ein Byte MixColumns',
            h('p', null, 'Spalte: ', h('code', null, col.map(U.hex8).join(' ')), `. Berechne Ausgabebyte in Zeile ${row}: `, h('code', null, AES.MIX[row].map((m, k) => `${U.hex8(m)}·${U.hex8(col[k])}`).join(' ⊕ '))),
            T.answer('= 0x', (v) => { if (parseInt(v, 16) === t.result) { ctx.solve('mixcol'); return true; } return '02·b = xtime(b), 03·b = xtime(b) ⊕ b'; }),
            h('div', { class: 'grid c2 mt' }, T.xorCalc(), h('div', { class: 'card flat' }, h('h4', { style: { marginTop: 0 } }, 'xtime-Hilfe'), h('p', { class: 'small' }, 'xtime(b): b << 1, und falls das oberste Bit von b gesetzt war: ⊕ 0x1B. Ergebnis auf 8 Bit kürzen.')))),
          (() => {
            const steps = ['SubBytes', 'ShiftRows', 'MixColumns', 'AddRoundKey'];
            const sel = [null, null, null, null]; let last = null;
            const r = h('div');
            return UI.card('Challenge 3 · Rundenaufbau',
              h('p', null, 'Bringe eine normale AES-Runde in die richtige Reihenfolge und beantworte, was in der letzten Runde fehlt.'),
              h('div', { class: 'row' }, [0, 1, 2, 3].map((i) => UI.select([['', `Schritt ${i + 1}`]].concat(steps.map((s) => [s, s])), '', (v) => (sel[i] = v)))),
              h('div', { class: 'row mt' }, h('span', null, 'In der letzten Runde fehlt:'), UI.segmented(steps, null, (v) => (last = v))),
              h('div', { class: 'row mt' }, UI.button('Prüfen', () => {
                UI.clear(r);
                if (sel.join() === steps.join() && last === 'MixColumns') { r.append(UI.status(true, 'korrekt')); ctx.solve('order'); }
                else r.append(UI.status(false, 'nicht ganz'));
              }, { kind: 'accent' }), r));
          })());
      } },
    ],
    quiz: [
      { q: 'Wie viele Rundenschlüssel braucht AES-128?', a: ['11', '10', '16', '44'], c: 0, e: 'n + 1 = 11 (44 Wörter).' },
      { q: 'Wie wird der 16-Byte-Block in die AES-Matrix gefüllt?', a: ['Spaltenweise', 'Zeilenweise', 'Diagonal', 'Zufällig'], c: 0, e: 'b₀…b₃ bilden die erste Spalte.' },
      { q: 'Welche Aussage über AES-256 und Quantencomputer stimmt?', a: ['Grover reduziert auf ≈ 2¹²⁸ – gilt als quantensicher', 'Shor bricht AES-256 effizient', 'AES-256 wird auf 2⁶⁴ reduziert', 'Quantencomputer sind für AES irrelevant'], c: 0, e: 'Grover: Quadratwurzel-Vorteil.' },
      { q: 'Warum gibt es vor Runde 1 ein AddRoundKey?', a: ['Sonst wäre Runde 1 öffentlich invertierbar und böte keinen Schutz', 'Für das Padding', 'Damit MixColumns funktioniert', 'Aus historischen Gründen'], c: 0, e: 'SubBytes/ShiftRows/MixColumns sind ohne Schlüssel.' },
      { q: 'Was ist der praktisch gefährlichste Angriffsweg auf AES heute?', a: ['Seitenkanäle der Implementierung', 'Biclique-Kryptanalyse', 'Brute Force', 'Shors Algorithmus'], c: 0, e: 'Cache-Timing, Power Analysis, Fault Injection.' },
    ],
  });
})();
