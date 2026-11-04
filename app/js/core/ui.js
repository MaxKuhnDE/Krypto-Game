/* KryptoQuest – UI-Bausteine (DOM-Builder + Fluent-Komponenten). */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const UI = (KQ.ui = {});

  // Element.append() würde null/undefined als Text „null“ einfügen – optionale Kinder hier herausfiltern
  if (root.Element && !root.Element.prototype.__kqAppend) {
    const orig = root.Element.prototype.append;
    root.Element.prototype.append = function (...nodes) { return orig.apply(this, nodes.filter((n) => n !== null && n !== undefined && n !== false)); };
    root.Element.prototype.__kqAppend = true;
  }

  /** h('div', {class, style, onclick, html, ...attrs}, ...children) */
  const h = (UI.h = (tag, props, ...children) => {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    UI.append(el, children);
    return el;
  });

  UI.append = (el, children) => {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  UI.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /** Aufräum-Funktionen (Timer usw.), die beim Seiten-/Tabwechsel laufen */
  const leaveFns = [];
  UI.onLeave = (fn) => leaveFns.push(fn);
  UI.runLeave = () => { while (leaveFns.length) { try { leaveFns.pop()(); } catch (e) { console.error(e); } } };

  /** Intervall, das beim Verlassen automatisch gestoppt wird */
  UI.interval = (fn, ms) => { const t = setInterval(fn, ms); UI.onLeave(() => clearInterval(t)); return t; };

  /** HTML-String in Fragment */
  UI.html = (str) => {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content;
  };

  UI.card = (title, ...children) =>
    h('div', { class: 'card' }, title ? h('h3', null, title) : null, ...children);

  UI.flat = (...children) => h('div', { class: 'card flat' }, ...children);

  const CO_LABELS = { info: 'Hinweis', success: 'Ergebnis', warning: 'Hinweis', danger: 'Achtung', exam: 'Klausur', errata: 'Erratum', tip: 'Tipp' };
  UI.callout = (kind, title, body) =>
    h('div', { class: 'callout ' + kind },
      h('div', { class: 'co-label' }, CO_LABELS[kind] || 'Hinweis'),
      title ? h('div', { class: 'co-title' }, title) : null,
      typeof body === 'string' ? (body ? h('div', { html: body }) : null) : body);

  UI.formula = (txt) => h('div', { class: 'formula', html: txt });

  UI.button = (label, onclick, opts = {}) =>
    h('button', {
      class: 'btn ' + (opts.kind || '') + (opts.sm ? ' sm' : ''),
      onclick, title: opts.title, disabled: opts.disabled, type: 'button',
    }, opts.icon ? h('span', null, opts.icon) : null, label);

  UI.input = (opts = {}) => {
    const el = h('input', {
      class: 'input ' + (opts.mono ? 'mono ' : '') + (opts.w ? 'w-' + opts.w : ''),
      type: opts.type || 'text', value: opts.value ?? '', placeholder: opts.placeholder,
      min: opts.min, max: opts.max, step: opts.step, spellcheck: 'false', maxlength: opts.maxlength,
    });
    if (opts.oninput) el.addEventListener('input', () => opts.oninput(el.value, el));
    if (opts.onenter) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') opts.onenter(el.value, el); });
    return el;
  };

  UI.textarea = (opts = {}) => {
    const el = h('textarea', { class: 'input ' + (opts.mono ? 'mono' : ''), rows: opts.rows || 3, spellcheck: 'false', placeholder: opts.placeholder });
    el.value = opts.value ?? '';
    if (opts.oninput) el.addEventListener('input', () => opts.oninput(el.value, el));
    return el;
  };

  UI.field = (label, control, hint) =>
    h('div', { class: 'field' }, h('label', null, label), control, hint ? h('div', { class: 'hint', html: hint }) : null);

  UI.select = (options, value, onchange) => {
    const el = h('select', { class: 'input' },
      options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return h('option', { value: v, selected: String(v) === String(value) ? true : null }, l);
      }));
    el.addEventListener('change', () => onchange && onchange(el.value));
    return el;
  };

  UI.slider = (opts) => {
    const out = h('span', { class: 'mono', style: { minWidth: '3ch', display: 'inline-block' } }, String(opts.value));
    const el = h('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value });
    el.addEventListener('input', () => { out.textContent = opts.format ? opts.format(+el.value) : el.value; opts.oninput && opts.oninput(+el.value); });
    if (opts.format) out.textContent = opts.format(+opts.value);
    const wrap = h('span', { class: 'row', style: { gap: '8px' } }, opts.label ? h('span', { class: 'muted' }, opts.label) : null, el, out);
    wrap.input = el;
    wrap.set = (v) => { el.value = v; out.textContent = opts.format ? opts.format(+v) : v; };
    return wrap;
  };

  UI.segmented = (options, value, onchange) => {
    const wrap = h('div', { class: 'segmented', role: 'tablist' });
    const render = () => {
      UI.clear(wrap);
      options.forEach((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        wrap.appendChild(h('button', { class: v === value ? 'on' : '', type: 'button', onclick: () => { value = v; render(); onchange && onchange(v); } }, l));
      });
    };
    render();
    wrap.setValue = (v) => { value = v; render(); };
    return wrap;
  };

  UI.toggle = (label, checked, onchange) => {
    const el = h('span', { class: 'toggle' + (checked ? ' on' : ''), role: 'switch', tabindex: 0 },
      h('span', { class: 'sw' }), h('span', null, label));
    const flip = () => { checked = !checked; el.classList.toggle('on', checked); onchange && onchange(checked); };
    el.addEventListener('click', flip);
    el.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    return el;
  };

  UI.status = (ok, text) => h('span', { class: 'status ' + (ok === null ? 'neutral' : ok === 'warn' ? 'warn' : ok ? 'ok' : 'bad') }, (ok === true ? '✓ ' : ok === false ? '✗ ' : '') + text);

  UI.chip = (text, kind = '') => h('span', { class: 'chip ' + kind }, text);

  UI.table = (headers, rows, opts = {}) => {
    const t = h('table', { class: 'tbl' + (opts.mono ? ' mono' : '') },
      h('thead', null, h('tr', null, headers.map((x) => h('th', { class: opts.numCols && opts.numCols.includes(x) ? 'num' : '' }, x)))),
      h('tbody', null, rows.map((r) => h('tr', { class: r.cls || null }, (r.cells || r).map((c) => (c instanceof Node ? h('td', null, c) : h('td', { html: String(c) })))))));
    return opts.wrap === false ? t : h('div', { class: 'tbl-wrap', style: opts.maxHeight ? { maxHeight: opts.maxHeight } : null }, t);
  };

  /** Bytes als Raster. opts: cols, cls(i, b) -> Klassenname, onclick(i), fmt */
  UI.bytes = (bytes, opts = {}) => {
    const cols = opts.cols || 16;
    const grid = h('div', { class: 'bytes', style: { gridTemplateColumns: `repeat(${cols}, auto)` } });
    Array.from(bytes).forEach((b, i) => {
      const cls = opts.cls ? opts.cls(i, b) : '';
      grid.appendChild(h('div', {
        class: 'byte ' + (cls || '') + (opts.onclick ? ' click' : '') + (opts.wide ? ' wide' : ''),
        title: opts.title ? opts.title(i, b) : `Byte ${i}: 0x${(b & 0xff).toString(16).padStart(2, '0')} = ${b}`,
        onclick: opts.onclick ? () => opts.onclick(i, b) : null,
      }, opts.fmt ? opts.fmt(b, i) : (b & 0xff).toString(16).padStart(2, '0')));
    });
    return grid;
  };

  /** AES-Zustand (16 Byte, spaltenweise) als 4×4-Matrix */
  UI.matrix = (state, opts = {}) => {
    const order = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) order.push(r + 4 * c);
    const vals = order.map((i) => state[i]);
    return h('div', null,
      opts.label ? h('div', { class: 'matrix-label' }, opts.label) : null,
      UI.bytes(vals, {
        cols: 4,
        cls: (k) => (opts.cls ? opts.cls(order[k], state[order[k]]) : ''),
        onclick: opts.onclick ? (k) => opts.onclick(order[k]) : null,
        title: (k) => `b${order[k]} (Zeile ${Math.floor(k / 4)}, Spalte ${k % 4})`,
      }));
  };

  /** Bitfolge (String aus 0/1) */
  UI.bitrow = (bits, opts = {}) => {
    const row = h('div', { class: 'bitrow' });
    [...bits].forEach((b, i) => {
      const cls = opts.cls ? opts.cls(i, b) : b === '1' ? 'one' : '';
      row.appendChild(h('span', {
        class: 'bit ' + cls + (opts.group && i && i % opts.group === 0 ? ' gap' : '') + (opts.onclick ? ' click' : ''),
        onclick: opts.onclick ? () => opts.onclick(i) : null,
      }, b));
    });
    return row;
  };

  /** Schritt-für-Schritt-Steuerung. render(i, el) zeichnet Schritt i. */
  UI.stepper = (count, render, opts = {}) => {
    let i = opts.start || 0;
    let timer = null;
    const label = h('span', { class: 'stepper-label' });
    const range = h('input', { type: 'range', min: 0, max: Math.max(0, count - 1), value: i });
    const body = h('div', { class: 'mt' });
    const playBtn = UI.button('Abspielen', () => (timer ? stop() : play()), { sm: true });
    const go = (k) => {
      i = Math.max(0, Math.min(count - 1, k));
      range.value = i;
      label.textContent = opts.label ? opts.label(i) : `Schritt ${i + 1} / ${count}`;
      UI.clear(body);
      render(i, body);
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = 'Abspielen'; };
    const play = () => {
      if (i >= count - 1) go(0);
      timer = setInterval(() => { if (i >= count - 1) stop(); else go(i + 1); }, opts.interval || 700);
      playBtn.textContent = 'Pause';
    };
    range.addEventListener('input', () => { stop(); go(+range.value); });
    const bar = h('div', { class: 'stepper-bar' },
      UI.button('«', () => { stop(); go(0); }, { sm: true, title: 'Anfang' }),
      UI.button('‹ zurück', () => { stop(); go(i - 1); }, { sm: true, title: 'Zurück' }),
      UI.button('weiter ›', () => { stop(); go(i + 1); }, { sm: true, title: 'Weiter' }),
      UI.button('»', () => { stop(); go(count - 1); }, { sm: true, title: 'Ende' }),
      playBtn, range, label);
    const wrap = h('div', null, bar, body);
    wrap.go = go;
    wrap.stop = stop;
    // Timer beim Verlassen der Seite / des Tabs stoppen
    UI.onLeave(stop);
    go(i);
    return wrap;
  };

  /** Pseudocode-Bibliothek. lines: Array von Strings oder {t, cls} */
  UI.lib = (title, lines) =>
    h('div', { class: 'lib' },
      title ? h('div', { class: 'lib-head', html: title }) : null,
      h('div', { class: 'lib-body' }, lines.map((l) => {
        const o = typeof l === 'string' ? { t: l } : l;
        return h('span', { class: 'ln ' + (o.cls || ''), html: o.t || '&nbsp;' });
      })));

  UI.kv = (pairs) => h('div', { class: 'kv' }, pairs.flatMap(([k, v]) => [h('div', null, k), h('div', null, v instanceof Node ? v : String(v))]));

  // ---------- Toast / Modal / Konfetti ----------
  UI.toast = (title, body, _unused, ms = 4200) => {
    let host = document.querySelector('.toasts');
    if (!host) { host = h('div', { class: 'toasts' }); document.body.appendChild(host); }
    const t = h('div', { class: 'toast', role: 'status' }, h('div', { class: 't-title' }, title), body ? h('div', { class: 't-body', html: body }) : null);
    host.appendChild(t);
    setTimeout(() => t.remove(), ms);
  };

  UI.modal = (title, body, buttons = [['OK', null, 'accent']]) => {
    const back = h('div', { class: 'modal-back' });
    const close = () => back.remove();
    back.appendChild(h('div', { class: 'modal', role: 'dialog' },
      h('div', { class: 'm-body' }, h('h2', { style: { marginTop: 0 } }, title), typeof body === 'string' ? h('div', { html: body }) : body),
      h('div', { class: 'm-foot' }, buttons.map(([l, fn, kind]) => UI.button(l, () => { close(); fn && fn(); }, { kind })))));
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.body.appendChild(back);
    return close;
  };

  UI.confetti = () => {}; // bewusst ohne Effekt

  /** Fortschrittsring als SVG */
  UI.ring = (frac, size = 44, stroke = 4) => {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const svg = `<svg class="ring${frac >= 1 ? ' full' : ''}" width="${size}" height="${size}">
      <circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, frac))}"/></svg>`;
    return UI.html(svg).firstChild;
  };

  UI.xpbar = (frac) => h('div', { class: 'xpbar' }, h('div', { style: { width: Math.round(Math.min(1, frac) * 100) + '%' } }));

  /** CSS-Variable lesen (für Canvas-Farben) */
  UI.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /** Einfaches Liniendiagramm auf Canvas. series: [{points:[[x,y]], color, label, dash}] */
  UI.chart = (opts) => {
    const W = opts.width || 640, H = opts.height || 260;
    const cv = h('canvas', { class: 'viz', width: W * 2, height: H * 2, style: { maxWidth: W + 'px', height: 'auto', aspectRatio: `${W}/${H}` } });
    const draw = () => {
      const ctx = cv.getContext('2d');
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const pad = { l: 52, r: 14, t: 14, b: 34 };
      const xs = opts.series.flatMap((s) => s.points.map((p) => p[0]));
      const ys = opts.series.flatMap((s) => s.points.map((p) => p[1]));
      const x0 = opts.xmin ?? Math.min(...xs), x1 = opts.xmax ?? Math.max(...xs);
      const y0 = opts.ymin ?? Math.min(0, ...ys), y1 = opts.ymax ?? Math.max(...ys);
      const sx = (x) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
      const sy = (y) => H - pad.b - ((y - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b);
      ctx.strokeStyle = UI.css('--stroke'); ctx.fillStyle = UI.css('--text-2'); ctx.lineWidth = 1;
      ctx.font = '11px ' + UI.css('--font');
      for (let k = 0; k <= 4; k++) {
        const yv = y0 + ((y1 - y0) * k) / 4, yy = sy(yv);
        ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
        ctx.fillText(opts.yfmt ? opts.yfmt(yv) : +yv.toPrecision(3), 4, yy + 4);
      }
      for (let k = 0; k <= 5; k++) {
        const xv = x0 + ((x1 - x0) * k) / 5;
        ctx.fillText(opts.xfmt ? opts.xfmt(xv) : +xv.toPrecision(3), sx(xv) - 8, H - pad.b + 16);
      }
      if (opts.xlabel) ctx.fillText(opts.xlabel, W - pad.r - ctx.measureText(opts.xlabel).width, H - 4);
      opts.series.forEach((s) => {
        ctx.strokeStyle = s.color || UI.css('--accent'); ctx.lineWidth = s.width || 2;
        ctx.setLineDash(s.dash || []);
        ctx.beginPath();
        s.points.forEach((p, i) => { const X = sx(p[0]), Y = sy(Math.max(y0, Math.min(y1, p[1]))); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke();
        ctx.setLineDash([]);
        if (s.dots) s.points.forEach((p) => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), 3, 0, 7); ctx.fill(); });
      });
      let lx = pad.l + 8;
      opts.series.forEach((s) => {
        if (!s.label) return;
        ctx.fillStyle = s.color || UI.css('--accent'); ctx.fillRect(lx, pad.t, 14, 3);
        ctx.fillStyle = UI.css('--text'); ctx.fillText(s.label, lx + 18, pad.t + 5);
        lx += 26 + ctx.measureText(s.label).width;
      });
    };
    requestAnimationFrame(draw);
    cv.redraw = draw;
    return cv;
  };

  /** Nimmt ein Prüf-Ergebnis-Element und setzt Status */
  UI.resultBox = () => {
    const el = h('div', { class: 'mt' });
    el.set = (ok, text) => { UI.clear(el); if (text) el.appendChild(ok === null ? h('div', { class: 'muted', html: text }) : UI.callout(ok ? 'success' : 'danger', ok ? 'Richtig' : 'Noch nicht', text)); };
    return el;
  };
})(typeof window !== 'undefined' ? window : globalThis);
