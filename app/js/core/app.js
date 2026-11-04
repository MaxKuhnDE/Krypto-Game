/* KryptoQuest – App-Kern: Welten, Modul-Registry, Router, Navigation,
 * Startseite, Weltseiten, Modulseiten, Quiz-Engine, Erfolge, Einstellungen. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const UI = KQ.ui, h = UI.h, S = KQ.state;

  KQ.VERSION = '1.0.0';

  KQ.worlds = [
    { id: 'A', title: 'Algebra-Labor', desc: 'Gruppen, Ringe, Körper, Euklid, Fermat, GF(2⁸) – das Fundament für RSA, DH, AES und Poly1305.' },
    { id: 'B', title: 'Grundlagen & Geschichte', desc: 'Caesar, Substitution, Frequenzanalyse, Schutzziele, Kerckhoffs’ Prinzip, Sicherheitsbegriffe.' },
    { id: 'C', title: 'Stromchiffren', desc: 'One-Time-Pad, perfekte Sicherheit, Schlüsselwiederverwendung, Zufallsgeneratoren, ChaCha20.' },
    { id: 'D', title: 'Blockchiffren', desc: 'Konfusion & Diffusion, Feistel-Netzwerke, SIMON und AES Schritt für Schritt.' },
    { id: 'E', title: 'Betriebsmodi', desc: 'ECB, CBC, CTR, Padding – Manipulierbarkeit von CBC/CTR und die Gefahr von Padding-Fehlermeldungen.' },
    { id: 'F', title: 'Beweisbare Sicherheit', desc: 'Vernachlässigbarkeit, Ununterscheidbarkeit, PRG/PRF/PRP, Geburtstagsschranke, Game Hopping.' },
    { id: 'G', title: 'CPA & CCA', desc: 'IND-CPA und IND-CCA1/2 als Spiele, in denen man selbst die Rolle des Angreifers übernimmt.' },
    { id: 'H', title: 'Message Authentication', desc: 'MAC-Spiel, CBC-MAC und Längenangriff, ECBC/FCBC, Encrypt-then-MAC, AEAD.' },
    { id: 'I', title: 'Hashfunktionen', desc: 'Kollisionsresistenz, Salt, Merkle-Damgård, Length-Extension auf SHA-256, HMAC.' },
    { id: 'J', title: 'UHF & ideale Modelle', desc: 'Universelle Hashfunktionen (Poly-UHF), Random Oracle, Ideal-Permutation, Even-Mansour, Sponge.' },
    { id: 'K', title: 'Asymmetrische Kryptografie', desc: 'Diffie-Hellman, DDH/CDH, elliptische Kurven, RSA, ElGamal, Fujisaki-Okamoto, KEM.' },
    { id: 'L', title: 'Signaturen & Schnorr', desc: 'EUF-CMA, Textbook-RSA-Fälschung, RSA-PSS, Hash-then-Sign, Schnorr-Protokoll & -Signatur.' },
    { id: 'N', title: 'Prüfungsarena', desc: 'Prüfungs-Sprint über alle Themen, Zuordnungsspiele und der interaktive Spickzettel.' },
  ];
  KQ.worldById = (id) => KQ.worlds.find((w) => w.id === id);

  KQ.modules = [];
  KQ.moduleById = {};
  const perWorld = {};
  /** Modul registrieren; vergibt Abschnittsnummern wie „A.3“ */
  KQ.module = (def) => {
    def.challenges = def.challenges || {};
    def.quiz = def.quiz || [];
    def.tabs = def.tabs || [];
    perWorld[def.world] = (perWorld[def.world] || 0) + 1;
    def.no = `${def.world}.${perWorld[def.world]}`;
    KQ.modules.push(def);
    KQ.moduleById[def.id] = def;
  };
  const orderedModules = () => KQ.worlds.flatMap((w) => KQ.modules.filter((m) => m.world === w.id));
  const pct = (f) => Math.round(f * 100) + ' %';
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const today = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const rankLabel = (rk) => `Stufe ${ROMAN[rk.index]}: ${rk.name}`;

  // ------------------------------------------------------------------ Erfolge
  const solvedAll = (...keys) => keys.every((k) => S.get().solved[k]);
  const allOf = (id) => () => { const m = KQ.moduleById[id]; return !!m && Object.keys(m.challenges).every((c) => S.isSolved(id, c)); };
  KQ.badges = [
    { id: 'first', title: 'Erste Challenge', desc: 'Eine beliebige Challenge gelöst.', check: () => Object.keys(S.get().solved).length >= 1 },
    { id: 'freq', title: 'Frequenzanalyse', desc: 'Substitutions-Chiffre per Häufigkeitsanalyse gebrochen.', check: () => solvedAll('substitution:crack') },
    { id: 'ttp', title: 'Two-Time-Pad', desc: 'Mehrfach verwendetes One-Time-Pad gebrochen.', check: () => solvedAll('otp:reuse') },
    { id: 'aes', title: 'AES', desc: 'Alle Challenges der AES-Station gelöst.', check: allOf('aes') },
    { id: 'bitflip', title: 'Malleability', desc: 'CBC-Überweisung ohne Schlüssel manipuliert.', check: () => solvedAll('bitflip:amount') },
    { id: 'lenext', title: 'Length-Extension', desc: 'SHA-256(k‖m)-MAC verlängert.', check: () => solvedAll('lengthext:forge') },
    { id: 'proof', title: 'Game Hopping', desc: 'Alle fünf Beweis-Puzzles gelöst.', check: allOf('gamehopping') },
    { id: 'factor', title: 'Faktorisierung', desc: 'RSA per Probedivision und ggT-Angriff gebrochen.', check: () => solvedAll('rsa:trial', 'rsa:gcd') },
    { id: 'mitm', title: 'Man-in-the-Middle', desc: 'Unauthentisierten DH-Austausch übernommen.', check: () => solvedAll('dh:mitm') },
    { id: 'forger', title: 'EUF-CMA', desc: 'Textbook-RSA-Signatur gefälscht.', check: () => solvedAll('signaturen:forge') },
    { id: 'nonce', title: 'Nonce-Reuse', desc: 'Schnorr-Schlüssel aus wiederverwendetem k extrahiert.', check: () => solvedAll('schnorr:nonce') },
    { id: 'quiz50', title: '50 Quizfragen', desc: '50 verschiedene Quizfragen richtig beantwortet.', check: () => Object.values(S.get().quiz).filter((v) => v === true).length >= 50 },
    { id: 'exam', title: 'Prüfungs-Sprint', desc: 'Mindestens 80 % bei mindestens 20 Fragen.', check: () => S.get().stats.examBest >= 80 },
    { id: 'half', title: 'Hälfte', desc: '50 % des Gesamtumfangs bearbeitet.', check: () => S.totalProgress() >= 0.5 },
    { id: 'all', title: 'Vollständig', desc: 'Alle Challenges und Quizfragen gelöst.', check: () => S.totalProgress() >= 0.999 },
  ];
  const checkBadges = () => {
    KQ.badges.forEach((b) => {
      try { if (!S.get().badges[b.id] && b.check() && S.grantBadge(b.id)) UI.toast('Erfolg: ' + b.title, b.desc, null, 6000); }
      catch (e) { /* Modul evtl. nicht geladen */ }
    });
  };

  // ------------------------------------------------------------------ Router
  const contentEl = () => document.getElementById('content');
  const parseHash = () => {
    const parts = (location.hash || '#/home').slice(2).split('/');
    return { page: parts[0] || 'home', a: parts[1], b: parts[2] };
  };
  KQ.go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  const render = () => {
    UI.runLeave();
    const r = parseHash();
    const el = UI.clear(contentEl());
    el.scrollTop = 0;
    const page = h('div', { class: 'page' });
    el.appendChild(page);
    try {
      if (r.page === 'm' && KQ.moduleById[r.a]) renderModule(page, KQ.moduleById[r.a], +(r.b || 0));
      else if (r.page === 'w' && KQ.worldById(r.a)) renderWorld(page, KQ.worldById(r.a));
      else if (r.page === 'badges') renderBadges(page);
      else if (r.page === 'settings') renderSettings(page);
      else renderHome(page);
    } catch (e) {
      console.error(e);
      page.appendChild(UI.callout('danger', 'Fehler beim Anzeigen', String(e && e.message || e)));
    }
    updateNav(r);
    document.title = 'KryptoQuest';
  };

  // ------------------------------------------------------------------ Navigation
  let navBuilt = false;
  function navItem(no, label, href, key, group) {
    const it = h('div', { class: 'nav-item', 'data-key': key, 'data-href': href, role: 'link', tabindex: 0 },
      no !== null ? h('span', { class: 'ni-no' }, no) : null, h('span', { class: 'ni-label', title: label }, label),
      group ? h('span', { class: 'ni-chev' }, '+') : null);
    if (href) {
      it.addEventListener('click', () => { KQ.go(href); if (innerWidth < 820) document.querySelector('.shell').classList.remove('nav-open'); });
      it.addEventListener('keydown', (e) => { if (e.key === 'Enter') KQ.go(href); });
    }
    return it;
  }
  const buildNav = () => {
    const nav = document.getElementById('nav');
    UI.clear(nav);
    const search = h('input', { placeholder: 'Suchen (Strg+K)', id: 'nav-search', spellcheck: 'false' });
    nav.appendChild(h('div', { class: 'nav-search' }, search));
    nav.appendChild(navItem(null, 'Titelseite und Inhalt', '#/home', 'home'));
    nav.appendChild(navItem(null, 'Fortschritt und Erfolge', '#/badges', 'badges'));
    nav.appendChild(navItem(null, 'Einstellungen', '#/settings', 'settings'));
    nav.appendChild(h('div', { class: 'nav-sep' }));
    nav.appendChild(h('div', { class: 'nav-caption' }, 'Inhalt'));
    KQ.worlds.forEach((w) => {
      const mods = KQ.modules.filter((m) => m.world === w.id);
      if (!mods.length) return;
      const g = h('div', { class: 'nav-group', 'data-world': w.id });
      const head = navItem(w.id + '.', w.title, null, 'w-' + w.id, true);
      head.addEventListener('click', (e) => {
        if (e.target.classList.contains('ni-chev')) { g.classList.toggle('open'); return; }
        g.classList.add('open');
        KQ.go('#/w/' + w.id);
      });
      g.appendChild(head);
      g.appendChild(h('div', { class: 'nav-children' }, mods.map((m) => {
        const it = navItem(m.no, m.title, '#/m/' + m.id, 'm-' + m.id);
        it.dataset.search = (m.no + ' ' + m.title + ' ' + (m.keywords || '') + ' ' + w.title).toLowerCase();
        it.appendChild(h('span', { class: 'done-dot', 'data-dot': m.id }));
        return it;
      })));
      nav.appendChild(g);
    });
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      nav.querySelectorAll('.nav-group').forEach((g) => {
        let any = false;
        g.querySelectorAll('.nav-children .nav-item').forEach((it) => { const hit = !q || it.dataset.search.includes(q); it.classList.toggle('hidden', !hit); any = any || hit; });
        g.classList.toggle('hidden', !any);
        if (q) g.classList.toggle('open', any);
      });
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = nav.querySelector('.nav-children .nav-item:not(.hidden)'); if (first) { KQ.go(first.getAttribute('data-href')); search.blur(); } }
    });
    navBuilt = true;
  };

  const updateNav = (r) => {
    if (!navBuilt) buildNav();
    const nav = document.getElementById('nav');
    let key = r.page;
    if (r.page === 'm') key = 'm-' + r.a;
    if (r.page === 'w') key = 'w-' + r.a;
    nav.querySelectorAll('.nav-item').forEach((it) => it.classList.toggle('selected', it.dataset.key === key));
    const wid = r.page === 'm' ? KQ.moduleById[r.a]?.world : r.page === 'w' ? r.a : null;
    if (wid) nav.querySelector(`.nav-group[data-world="${wid}"]`)?.classList.add('open');
    nav.querySelectorAll('.nav-group').forEach((g) => { const c = g.querySelector(':scope > .nav-item .ni-chev'); if (c) c.textContent = g.classList.contains('open') ? '−' : '+'; });
    nav.querySelector('.nav-item.selected')?.scrollIntoView({ block: 'nearest' });
    updateProgressUI();
  };

  const updateProgressUI = () => {
    document.querySelectorAll('[data-dot]').forEach((d) => {
      const p = S.moduleProgress(KQ.moduleById[d.dataset.dot]);
      d.className = 'done-dot' + (p.frac >= 0.999 ? ' full' : p.frac > 0 ? ' part' : '');
      d.title = `${pct(p.frac)} bearbeitet`;
    });
    const rk = S.rank();
    const tb = document.getElementById('tb-xp');
    if (tb) {
      UI.clear(tb);
      tb.appendChild(h('span', null, rankLabel(rk)));
      tb.appendChild(UI.xpbar(rk.frac));
      tb.appendChild(h('span', null, rk.xp + ' XP'));
      tb.title = rk.next ? `Noch ${rk.next.at - rk.xp} XP bis „${rk.next.name}“` : 'Höchste Stufe erreicht';
    }
  };

  // ------------------------------------------------------------------ Bausteine
  const front = (left, right) => h('div', { class: 'front' },
    h('div', null, left.map((l) => h('div', null, l))),
    h('div', { class: 'fr' }, right.map((l) => h('div', null, l))));
  const tocRow = (lvl, no, label, val, done, onclick) => h('div', { class: 'toc-row lvl' + lvl, onclick, role: 'link', tabindex: 0 },
    h('span', { class: 'toc-no' }, no), h('span', { class: 'toc-label' }, label), h('span', { class: 'toc-leader' }), h('span', { class: 'toc-val' + (done ? ' done' : '') }, val));
  const worldFrac = (w) => { const ms = KQ.modules.filter((m) => m.world === w.id); return ms.length ? ms.reduce((s, m) => s + S.moduleProgress(m).frac, 0) / ms.length : 0; };

  // ------------------------------------------------------------------ Seiten
  function renderHome(page) {
    const rk = S.rank();
    const total = S.totalProgress();
    const last = S.get().last && KQ.moduleById[S.get().last];
    const next = orderedModules().find((m) => S.moduleProgress(m).frac < 1);
    const cont = last && S.moduleProgress(last).frac < 1 ? last : next;
    const nCh = KQ.modules.reduce((s, m) => s + Object.keys(m.challenges).length, 0);
    const nQ = KQ.modules.reduce((s, m) => s + m.quiz.length, 0);
    page.append(
      front(['KryptoQuest', 'Kategorie: Lehrmaterial', 'Grundlage: Vorlesung Kryptografie', 'Kapitel 1–18, Asymmetrische Kryptografie'],
        [today(), rankLabel(rk), `${rk.xp} XP`, `${pct(total)} bearbeitet`]),
      h('h1', { class: 'doc-title' }, 'KryptoQuest: Kryptografische Verfahren zum Ausprobieren'),
      h('div', { class: 'doc-sub' }, `${KQ.modules.length} Stationen · ${nCh} Challenges · ${nQ} Quizfragen`),
      h('h2', null, 'Zusammenfassung'),
      h('p', null, 'Dieses Programm begleitet die Vorlesung Kryptografie. Jedes Verfahren aus den Unterlagen ist eine Station mit vier Teilen: ',
        h('i', null, 'Verstehen'), ' (Definitionen, Sätze, Beweisideen), ', h('i', null, 'Labor'), ' (eigene Eingaben, alle Zwischenschritte), ',
        h('i', null, 'Challenges'), ' (Aufgaben, meist aus Sicht eines Angreifers) und ', h('i', null, 'Quiz'), '. ',
        'Die Algorithmen sind eigenständig implementiert und gegen offizielle Testvektoren geprüft (FIPS 197, RFC 8439, Simon-Spezifikation).'),
      h('div', { class: 'row' },
        cont ? UI.button(`Fortsetzen: ${cont.no} ${cont.title}`, () => KQ.go('#/m/' + cont.id), { kind: 'accent' }) : null,
        UI.button('Prüfungs-Sprint', () => KQ.go('#/m/exam'))),
      h('h2', null, 'Inhaltsverzeichnis'),
      h('div', { class: 'toc' }, KQ.worlds.flatMap((w) => {
        const mods = KQ.modules.filter((m) => m.world === w.id);
        if (!mods.length) return [];
        const wf = worldFrac(w);
        return [tocRow(1, w.id + '.', w.title, pct(wf), wf >= 0.999, () => KQ.go('#/w/' + w.id))]
          .concat(mods.map((m) => { const p = S.moduleProgress(m); return tocRow(2, m.no + '.', m.title, p.totalCh + p.totalQ ? `${p.doneCh + p.doneQ}/${p.totalCh + p.totalQ}` : (p.frac ? 'gelesen' : '–'), p.frac >= 0.999, () => KQ.go('#/m/' + m.id)); }));
      })),
      h('h2', null, 'Hinweise zum Umfang'),
      h('p', null, 'Das Programm ersetzt nicht das Skript. Inhaltliche Grundlage sind die Kapitel 1–18 (Prof. Jungk), die Board-Folien zur asymmetrischen Kryptografie (Prof. Henrich), die Gesamtzusammenfassung und das Dokument zu Game-Hopping-Beweisen. ',
        'Stellen, an denen die Unterlagen Fehler enthalten, sind in den Stationen als „Erratum“ markiert. Spielzeug-Parameter (kleine Primzahlen, 8-Bit-Blöcke) dienen dem Nachrechnen und bieten keine Sicherheit.'));
  }

  function renderWorld(page, w) {
    const mods = KQ.modules.filter((m) => m.world === w.id);
    page.append(
      h('div', { class: 'breadcrumb' }, h('a', { onclick: () => KQ.go('#/home') }, 'Inhalt'), h('span', null, '/'), h('span', null, `Abschnitt ${w.id}`)),
      front([`Abschnitt ${w.id}`, `${mods.length} Stationen`], [`${pct(worldFrac(w))} bearbeitet`]),
      h('h1', { class: 'doc-title' }, `${w.id}. ${w.title}`),
      h('p', { class: 'center muted' }, w.desc),
      h('div', { class: 'toc', style: { marginTop: '18px' } }, mods.map((m) => {
        const p = S.moduleProgress(m);
        return h('div', { style: { marginBottom: '10px' } },
          tocRow(1, m.no + '.', m.title, p.totalCh + p.totalQ ? `${p.doneCh}/${p.totalCh} · ${p.doneQ}/${p.totalQ}` : '–', p.frac >= 0.999, () => KQ.go('#/m/' + m.id)),
          h('div', { class: 'muted', style: { fontFamily: 'var(--font)', fontSize: '13.5px', paddingLeft: '50px' } }, m.short || ''));
      })),
      h('p', { class: 'small muted' }, 'Spalte rechts: gelöste Challenges · richtig beantwortete Quizfragen.'));
  }

  function renderModule(page, m, tabIdx) {
    S.visit(m.id);
    const w = KQ.worldById(m.world);
    const tabs = m.tabs.slice();
    if (m.quiz.length) tabs.push({ id: 'quiz', title: 'Quiz', render: (el, ctx) => KQ.renderQuiz(el, m, ctx) });
    tabIdx = Math.max(0, Math.min(tabs.length - 1, tabIdx || 0));
    const all = orderedModules();
    const idx = all.indexOf(m);

    const frontEl = h('div');
    const refreshFront = () => {
      UI.clear(frontEl);
      const p = S.moduleProgress(m);
      frontEl.append(front(
        ['KryptoQuest', `Abschnitt ${w.id}: ${w.title}`, `Station ${m.no}`],
        [p.totalCh ? `Challenges: ${p.doneCh}/${p.totalCh}` : 'Challenges: –', p.totalQ ? `Quiz: ${p.doneQ}/${p.totalQ}` : 'Quiz: –', `${pct(p.frac)} bearbeitet`]));
    };
    const tasksEl = h('div');
    const refreshTasks = () => {
      UI.clear(tasksEl);
      const ch = Object.entries(m.challenges);
      if (!ch.length) return;
      tasksEl.append(h('div', { class: 'mono small', style: { margin: '8px 0 0', color: 'var(--text-2)' } },
        ch.map(([id, c]) => h('div', null, (S.isSolved(m.id, id) ? '[x] ' : '[ ] ') + c.title + ` (${c.xp} XP)`))));
    };
    page.append(
      h('div', { class: 'breadcrumb' }, h('a', { onclick: () => KQ.go('#/home') }, 'Inhalt'), h('span', null, '/'),
        h('a', { onclick: () => KQ.go('#/w/' + w.id) }, `${w.id}. ${w.title}`), h('span', null, '/'), h('span', null, m.no)),
      frontEl,
      h('h1', { class: 'doc-title' }, m.title),
      m.short ? h('p', { class: 'center muted', style: { maxWidth: '720px', margin: '6px auto 0' } }, m.short) : null,
      tasksEl);

    const tabBar = h('div', { class: 'tabs', role: 'tablist' });
    const body = h('div', { class: 'tab-body' });
    const ctx = {
      mod: m,
      solve: (chId, note) => {
        const c = m.challenges[chId];
        if (!c) { console.warn('Unbekannte Challenge', chId); return 0; }
        const xp = S.solve(m.id, chId, c.xp);
        if (xp) {
          UI.toast('Gelöst: ' + c.title, `+${xp} XP` + (note ? ' · ' + note : ''));
          refreshFront(); refreshTasks(); updateProgressUI(); checkBadges();
        }
        return xp;
      },
      solved: (chId) => S.isSolved(m.id, chId),
      goTab: (i) => KQ.go(`#/m/${m.id}/${i}`),
      refresh: () => { refreshFront(); refreshTasks(); updateProgressUI(); checkBadges(); },
    };
    const showTab = (i) => {
      UI.runLeave();
      tabIdx = i;
      [...tabBar.children].forEach((b, k) => b.classList.toggle('on', k === i));
      UI.clear(body);
      try { tabs[i].render(body, ctx); }
      catch (e) { console.error(e); body.appendChild(UI.callout('danger', 'Fehler in dieser Station', String(e && e.stack || e))); }
    };
    tabs.forEach((t, i) => tabBar.appendChild(h('button', {
      class: 'tab' + (i === tabIdx ? ' on' : ''), role: 'tab', type: 'button',
      onclick: () => { history.replaceState(null, '', `#/m/${m.id}/${i}`); showTab(i); },
    }, h('span', { class: 'tab-no' }, `${i + 1}`), t.title)));
    page.append(tabBar, body);
    refreshFront(); refreshTasks();
    showTab(tabIdx);

    page.appendChild(h('div', { class: 'row between', style: { marginTop: '36px', borderTop: '1px solid var(--rule)', paddingTop: '12px' } },
      idx > 0 ? h('a', { class: 'link mono small', onclick: () => KQ.go('#/m/' + all[idx - 1].id) }, `‹ ${all[idx - 1].no} ${all[idx - 1].title}`) : h('span'),
      idx < all.length - 1 ? h('a', { class: 'link mono small', onclick: () => KQ.go('#/m/' + all[idx + 1].id) }, `${all[idx + 1].no} ${all[idx + 1].title} ›`) : h('span')));
  }

  /** Quiz eines Moduls. q: {q, a:[...], c: Index, e: Erklärung} */
  KQ.renderQuiz = (el, m, ctx) => {
    const qs = m.quiz;
    const box = h('div');
    el.appendChild(h('p', { class: 'muted small' }, `${qs.length} Fragen. Jede erste richtige Antwort ergibt 10 XP; die Antworten werden gemischt.`));
    el.appendChild(box);
    const renderAll = () => {
      UI.clear(box);
      qs.forEach((q, qi) => box.appendChild(KQ.quizCard(q, (ok) => { const xp = S.answer(m.id, qi, ok); if (xp) UI.toast('Richtig beantwortet', `+${xp} XP`, null, 1800); ctx && ctx.refresh(); }, S.quizState(m.id, qi), qi + 1)));
      box.appendChild(h('div', { class: 'row mt' }, UI.button('Neu mischen', renderAll)));
    };
    renderAll();
  };

  KQ.quizCard = (q, onAnswer, prev, num) => {
    const order = KQ.util.shuffle(q.a.map((_, i) => i));
    const wrap = h('div', { class: 'card quiz-q' });
    wrap.appendChild(h('div', { class: 'qtext', html: (num ? `<span class="sec-no">${num}.</span>` : '') + q.q + (prev === true ? ' <span class="chip ok">bereits richtig</span>' : '') }));
    const opts = order.map((i, k) => h('button', { class: 'quiz-opt', type: 'button' }, h('span', { class: 'qo-mark' }, String.fromCharCode(97 + k) + ')'), h('span', { html: q.a[i] })));
    const explain = h('div');
    opts.forEach((b, k) => b.addEventListener('click', () => {
      const ok = order[k] === q.c;
      opts.forEach((o, j) => {
        o.disabled = true;
        if (order[j] === q.c) { o.classList.add('right'); o.querySelector('.qo-mark').textContent = '✓ ' + String.fromCharCode(97 + j) + ')'; }
      });
      if (!ok) { b.classList.add('wrong'); b.querySelector('.qo-mark').textContent = '✗ ' + String.fromCharCode(97 + k) + ')'; }
      explain.appendChild(h('div', { class: 'quiz-explain', html: (ok ? '<b>Richtig.</b> ' : '<b>Falsch.</b> ') + (q.e || '') }));
      onAnswer && onAnswer(ok);
    }));
    opts.forEach((o) => wrap.appendChild(o));
    wrap.appendChild(explain);
    return wrap;
  };

  function renderBadges(page) {
    const rk = S.rank();
    const st = S.get().stats;
    page.append(
      front(['KryptoQuest', 'Fortschritt und Erfolge'], [rankLabel(rk), `${rk.xp} XP`]),
      h('h1', { class: 'doc-title' }, 'Fortschritt und Erfolge'),
      h('h2', null, h('span', { class: 'sec-no' }, '1.'), 'Stufen'),
      h('p', null, rk.next ? `Nächste Stufe „${rk.next.name}“ bei ${rk.next.at} XP (noch ${rk.next.at - rk.xp} XP).` : 'Höchste Stufe erreicht.'),
      UI.table(['Stufe', 'Bezeichnung', 'ab XP', ''], S.RANKS.map(([xp, n], i) => [ROMAN[i], n, String(xp), i === rk.index ? '<b>aktuell</b>' : i < rk.index ? 'erreicht' : '']), { wrap: false }),
      h('h2', null, h('span', { class: 'sec-no' }, '2.'), 'Erfolge'),
      UI.table(['Erfolg', 'Bedingung', 'Status'], KQ.badges.map((b) => { const got = S.get().badges[b.id]; return [got ? `<b>${b.title}</b>` : b.title, b.desc, got ? `<span class="ok-text">erreicht ${new Date(got).toLocaleDateString('de-DE')}</span>` : 'offen']; }), { wrap: false }),
      h('h2', null, h('span', { class: 'sec-no' }, '3.'), 'Statistik'),
      UI.kv([
        ['Gelöste Challenges', Object.keys(S.get().solved).length + ' / ' + KQ.modules.reduce((s, m) => s + Object.keys(m.challenges).length, 0)],
        ['Quizfragen richtig (verschiedene)', Object.values(S.get().quiz).filter((v) => v === true).length + ' / ' + KQ.modules.reduce((s, m) => s + m.quiz.length, 0)],
        ['Quiz-Antworten gesamt', `${st.quizRight} richtig, ${st.quizWrong} falsch`],
        ['Prüfungs-Sprint', `${st.examRuns} Durchläufe, bester Wert ${st.examBest} %`],
      ]));
  }

  function renderSettings(page) {
    const st = S.settings();
    const fileIn = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { S.import(await f.text()); UI.toast('Spielstand importiert'); KQ.go('#/home'); }
      catch (e) { UI.modal('Import fehlgeschlagen', String(e.message)); }
    });
    page.append(
      front(['KryptoQuest', 'Einstellungen'], [`Version ${KQ.VERSION}`]),
      h('h1', { class: 'doc-title' }, 'Einstellungen'),
      h('h2', null, h('span', { class: 'sec-no' }, '1.'), 'Darstellung'),
      h('div', { class: 'row' }, h('span', { style: { width: '160px' } }, 'Farbschema'),
        UI.segmented([['system', 'wie Windows'], ['light', 'hell'], ['dark', 'dunkel']], st.theme, (v) => { S.setSetting('theme', v); KQ.applyTheme(); })),
      h('div', { class: 'row mt' }, UI.toggle('Animationen reduzieren', st.reduceMotion, (v) => { S.setSetting('reduceMotion', v); KQ.applyTheme(); })),
      root.kqNative && root.kqNative.micaSupported ? h('div', { class: 'row mt' }, UI.toggle('Mica-Hintergrund (Windows 11 22H2+)', st.mica, (v) => { S.setSetting('mica', v); KQ.applyTheme(); })) : null,
      h('h2', null, h('span', { class: 'sec-no' }, '2.'), 'Spielstand'),
      h('p', { class: 'muted' }, 'Der Fortschritt wird lokal gespeichert und kann als JSON-Datei gesichert und auf einem anderen Rechner wieder eingelesen werden.'),
      h('div', { class: 'row' },
        UI.button('Exportieren', () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([S.export()], { type: 'application/json' })), download: 'kryptoquest-spielstand.json' });
          document.body.appendChild(a); a.click(); a.remove();
        }),
        UI.button('Importieren', () => fileIn.click()), fileIn,
        UI.button('Fortschritt zurücksetzen', () => UI.modal('Fortschritt zurücksetzen?', 'Alle XP, gelösten Challenges und Erfolge werden gelöscht.', [['Abbrechen'], ['Zurücksetzen', () => { S.reset(); KQ.go('#/home'); }, 'accent']]), { kind: 'danger' })),
      h('h2', null, h('span', { class: 'sec-no' }, '3.'), 'Über'),
      UI.kv([['Version', KQ.VERSION], ['Stationen', String(KQ.modules.length)], ['Laufzeit', root.kqNative ? 'Windows-App (Electron ' + (root.kqNative.versions?.electron || '?') + ')' : 'Browser']]),
      h('p', { class: 'muted small mt' }, 'Alle Verfahren sind zu Lernzwecken implementiert: nicht in konstanter Zeit, teils mit Spielzeug-Parametern. Nicht für echte Geheimnisse verwenden.'));
  }

  // ------------------------------------------------------------------ Darstellung
  const THEME_LABEL = { system: 'System', light: 'Hell', dark: 'Dunkel' };
  KQ.applyTheme = () => {
    const st = S.settings();
    const de = document.documentElement;
    const tbtn = document.getElementById('btn-theme');
    if (tbtn) tbtn.textContent = 'Schema: ' + (THEME_LABEL[st.theme] || 'System');
    if (st.theme === 'system') de.removeAttribute('data-theme'); else de.setAttribute('data-theme', st.theme);
    de.classList.toggle('reduce-motion', !!st.reduceMotion);
    const mica = !!(root.kqNative && root.kqNative.micaSupported && st.mica);
    de.classList.toggle('mica', mica);
    if (root.kqNative && root.kqNative.setAppearance) {
      const dark = st.theme === 'dark' || (st.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      root.kqNative.setAppearance({ theme: st.theme, dark, mica });
    }
  };

  // ------------------------------------------------------------------ Start
  KQ.boot = () => {
    S.load();
    if (root.kqNative) document.documentElement.classList.add('electron');
    KQ.applyTheme();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', KQ.applyTheme);
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      const order = ['system', 'light', 'dark'];
      const cur = order.indexOf(S.settings().theme);
      S.setSetting('theme', order[(cur + 1) % order.length]);
      KQ.applyTheme();
      if (parseHash().page === 'settings') render(); // Auswahl in den Einstellungen nachziehen
    });
    document.getElementById('btn-nav').addEventListener('click', () => {
      const sh = document.querySelector('.shell');
      if (innerWidth < 820) sh.classList.toggle('nav-open'); else sh.classList.toggle('nav-collapsed');
    });
    addEventListener('hashchange', render);
    addEventListener('kq:progress', updateProgressUI);
    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('nav-search')?.focus(); }
    });
    buildNav();
    render();
    checkBadges();
  };
})(typeof window !== 'undefined' ? window : globalThis);
