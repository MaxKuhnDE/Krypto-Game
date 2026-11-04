/* KryptoQuest – wiederverwendbare Werkzeuge für Challenges:
 * Modularer Taschenrechner, XOR-Rechner, Unterscheidungsspiel-Konsole. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const UI = KQ.ui, h = UI.h, NT = KQ.nt, U = KQ.util;
  const T = (KQ.tools = {});

  const parseBig = (s) => {
    s = String(s).trim().replace(/\s|_/g, '');
    if (!s) throw new Error('leer');
    if (/^-?0x[0-9a-f]+$/i.test(s)) return s.startsWith('-') ? -BigInt(s.slice(1)) : BigInt(s);
    if (!/^-?\d+$/.test(s)) throw new Error(`„${s}“ ist keine ganze Zahl`);
    return BigInt(s);
  };
  T.parseBig = parseBig;

  /** Modularer Taschenrechner (wie im Open-Book-Klausur-Setting erlaubt) */
  T.calculator = (title = 'Modularer Taschenrechner') => {
    const ops = [
      ['pow', 'aᵇ mod n', 3], ['inv', 'a⁻¹ mod n', 2], ['mul', 'a · b mod n', 3], ['add', 'a + b mod n', 3],
      ['sub', 'a − b mod n', 3], ['gcd', 'ggT(a, b)', 2], ['div', 'a / b (ganzzahlig) und Rest', 2],
      ['root', 'ᵇ√a (ganzzahlig)', 2], ['t2i', 'Text → Zahl', 1], ['i2t', 'Zahl → Text', 1],
    ];
    let op = 'pow';
    const A = UI.input({ placeholder: 'a', mono: true, w: 'l' });
    const Bv = UI.input({ placeholder: 'b', mono: true, w: 'l' });
    const N = UI.input({ placeholder: 'n', mono: true, w: 'l' });
    const out = h('div', { class: 'mono break mt', style: { minHeight: '22px' } });
    const fields = h('div', { class: 'col' });
    const layout = () => {
      UI.clear(fields);
      const o = ops.find((x) => x[0] === op);
      if (op === 't2i') { A.placeholder = 'Text'; fields.append(UI.field('Text', A)); return; }
      A.placeholder = 'a';
      fields.append(UI.field('a', A));
      if (o[2] >= 2) {
        if (op === 'inv') fields.append(UI.field('n', N));
        else fields.append(UI.field(op === 'root' ? 'b (Wurzelexponent)' : 'b', Bv));
      }
      if (o[2] >= 3) fields.append(UI.field('n', N));
    };
    const calc = () => {
      try {
        let r;
        if (op === 't2i') r = NT.textToInt(A.value);
        else {
          const a = parseBig(A.value);
          if (op === 'i2t') r = '„' + NT.intToText(a) + '“';
          else if (op === 'inv') { r = NT.modInv(a, parseBig(N.value)); if (r === null) r = 'existiert nicht (ggT ≠ 1)'; }
          else if (op === 'gcd') r = NT.gcd(a, parseBig(Bv.value));
          else if (op === 'div') { const b = parseBig(Bv.value); r = `${a / b} Rest ${a % b}`; }
          else if (op === 'root') { const b = parseBig(Bv.value); const x = NT.iroot(a, b); r = x + (x ** b === a ? ' (exakt)' : ' (nicht exakt, abgerundet)'); }
          else {
            const b = parseBig(Bv.value), n = parseBig(N.value);
            if (op === 'pow') r = NT.modPow(a, b, n);
            else if (op === 'mul') r = NT.mod(a * b, n);
            else if (op === 'add') r = NT.mod(a + b, n);
            else if (op === 'sub') r = NT.mod(a - b, n);
            if (r === null) r = 'nicht definiert';
          }
        }
        out.textContent = '= ' + r;
      } catch (e) { out.textContent = 'Fehler: ' + e.message; }
    };
    [A, Bv, N].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && calc()));
    layout();
    return h('div', { class: 'card flat' },
      h('h4', { style: { marginTop: 0 } }, title),
      h('div', { class: 'row mb' }, UI.select(ops.map((o) => [o[0], o[1]]), op, (v) => { op = v; layout(); out.textContent = ''; })),
      fields,
      h('div', { class: 'row mt' }, UI.button('Berechnen', calc, { kind: 'accent', sm: true }), h('span', { class: 'kbd-hint' }, 'Enter rechnet · Hex mit 0x… möglich')),
      out);
  };

  /** XOR-Rechner für Hex- oder Text-Eingaben */
  T.xorCalc = (title = '⊕ XOR-Rechner') => {
    const mk = (ph) => UI.input({ placeholder: ph, mono: true, w: 'full' });
    const a = mk('Hex (z.B. 4f6b) oder "Text in Anführungszeichen"'), b = mk('Hex oder "Text"'), c = mk('optional: drittes Argument');
    const out = h('div', { class: 'mono break mt' });
    const parse = (s) => {
      s = s.trim();
      if (!s) return null;
      if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return U.utf8(s.slice(1, -1));
      if (!U.isHex(s)) throw new Error('kein gültiges Hex: ' + s);
      return U.fromHex(s);
    };
    const run = () => {
      try {
        const xs = [a, b, c].map((x) => parse(x.value)).filter(Boolean);
        if (xs.length < 2) { out.textContent = 'Mindestens zwei Werte eingeben.'; return; }
        const len = Math.min(...xs.map((x) => x.length));
        let r = xs[0].slice(0, len);
        xs.slice(1).forEach((x) => (r = U.xor(r, x)));
        UI.clear(out);
        out.append(h('div', null, 'Hex:  ' + U.hex(r)), h('div', null, 'Text: ' + U.printable(r)));
        if (xs.some((x) => x.length !== len)) out.append(h('div', { class: 'small muted' }, `Hinweis: auf die kürzeste Länge (${len} Byte) gekürzt.`));
      } catch (e) { out.textContent = 'Fehler: ' + e.message; }
    };
    [a, b, c].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && run()));
    return h('div', { class: 'card flat' }, h('h4', { style: { marginTop: 0 } }, title), h('div', { class: 'col' }, a, b, c),
      h('div', { class: 'row mt' }, UI.button('XOR berechnen', run, { kind: 'accent', sm: true })), out);
  };

  /**
   * Unterscheidungsspiel: In jeder Runde wird verdeckt Welt 0 (z.B. „Real“) oder Welt 1 („Zufall“) gewählt.
   * opts: { rounds, need, labels:[l0,l1], setup(b) -> world, render(area, world, log), onWin(), title }
   * log(text) schreibt ins Anfrageprotokoll.
   */
  T.distGame = (el, opts) => {
    const rounds = opts.rounds || 10, need = opts.need || 9;
    const labels = opts.labels || ['Real', 'Zufall'];
    let round = 0, correct = 0, world = null, b = 0;
    const stats = { g0b0: 0, g0b1: 0, n0: 0, n1: 0 };
    const head = h('div', { class: 'row between' });
    const area = h('div', { class: 'mt' });
    const logEl = h('div', { class: 'mono small', style: { maxHeight: '220px', overflow: 'auto', background: 'var(--code-bg)', border: '1px solid var(--stroke)', borderRadius: '6px', padding: '8px', marginTop: '8px' } });
    const guessRow = h('div', { class: 'row mt' });
    const feedback = h('div');
    const log = (t) => { logEl.appendChild(h('div', { html: t })); logEl.scrollTop = 1e9; };
    const advText = () => {
      const p0 = stats.n0 ? stats.g0b0 / stats.n0 : 0, p1 = stats.n1 ? stats.g0b1 / stats.n1 : 0;
      return `Empirischer Vorteil |Pr[„${labels[0]}“ | ${labels[0]}] − Pr[„${labels[0]}“ | ${labels[1]}]| = |${p0.toFixed(2)} − ${p1.toFixed(2)}| = <b>${Math.abs(p0 - p1).toFixed(2)}</b>`;
    };
    const updateHead = () => {
      UI.clear(head);
      head.append(h('div', null, h('b', null, `Runde ${Math.min(round + 1, rounds)} / ${rounds}`), ` · richtig: ${correct}`, h('span', { class: 'muted' }, ` · Ziel: ≥ ${need} richtig`)),
        h('div', { class: 'small muted', html: advText() }));
    };
    const newRound = () => {
      b = U.randInt(0, 1);
      world = opts.setup(b);
      UI.clear(area); UI.clear(logEl); UI.clear(feedback);
      opts.render(area, world, log);
      UI.clear(guessRow);
      guessRow.append(h('span', { class: 'muted' }, 'Deine Entscheidung:'),
        UI.button(labels[0], () => guess(0), { kind: 'accent' }), UI.button(labels[1], () => guess(1), { kind: 'accent' }));
      updateHead();
    };
    const guess = (g) => {
      const ok = g === b;
      if (b === 0) { stats.n0++; if (g === 0) stats.g0b0++; } else { stats.n1++; if (g === 0) stats.g0b1++; }
      if (ok) correct++;
      round++;
      UI.clear(guessRow);
      feedback.appendChild(UI.callout(ok ? 'success' : 'danger', ok ? 'Richtig erkannt' : 'Daneben', `Es war <b>${labels[b]}</b>.` + (opts.explain ? ' ' + opts.explain(world, b) : '')));
      if (round >= rounds) {
        updateHead();
        const won = correct >= need;
        feedback.appendChild(UI.callout(won ? 'success' : 'warning', won ? `Gewonnen: ${correct}/${rounds}` : `${correct}/${rounds} – nicht genug`,
          (won ? 'Du hast einen effizienten Unterscheider gebaut – Vorteil deutlich größer als vernachlässigbar.' : 'Zufälliges Raten liefert im Mittel 50 %. Überlege, welche Struktur die reale Welt verrät.') + '<br>' + advText()));
        if (won && opts.onWin) opts.onWin(correct);
        if (opts.onEnd) opts.onEnd(correct);
        feedback.appendChild(h('div', { class: 'row mt' }, UI.button('Neues Spiel', () => { round = 0; correct = 0; Object.keys(stats).forEach((k) => (stats[k] = 0)); newRound(); })));
      } else {
        feedback.appendChild(h('div', { class: 'row mt' }, UI.button('Nächste Runde →', newRound, { kind: 'accent' })));
      }
      updateHead();
    };
    el.append(h('div', { class: 'card' }, opts.title ? h('h3', null, opts.title) : null, head, area, h('div', { class: 'small muted mt' }, 'Anfrageprotokoll:'), logEl, guessRow, feedback));
    newRound();
  };

  /** Eingabe + Prüfknopf in einer Zeile. check(value) -> true/false/String(Fehlertext) */
  T.answer = (label, check, opts = {}) => {
    const inp = UI.input({ placeholder: opts.placeholder || 'Antwort', mono: opts.mono !== false, w: opts.w || 'm' });
    const res = h('span');
    const run = () => {
      let r;
      try { r = check(inp.value.trim()); } catch (e) { r = e.message; }
      UI.clear(res);
      if (r === true) { res.append(UI.status(true, opts.okText || 'korrekt')); inp.classList.add('good'); inp.classList.remove('bad'); }
      else { res.append(UI.status(false, typeof r === 'string' ? r : 'leider falsch')); inp.classList.add('bad'); inp.classList.remove('good'); }
    };
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && run());
    return h('div', { class: 'row' }, h('span', { html: label }), inp, UI.button('Prüfen', run, { sm: true }), res);
  };
})(typeof window !== 'undefined' ? window : globalThis);
