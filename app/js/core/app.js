/* KryptoQuest – App-Kern: Welten, Modul-Registry, Router, Navigation,
 * Startseite, Weltseiten, Modulseiten, Quiz-Engine, Erfolge, Einstellungen. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const UI = KQ.ui, h = UI.h, S = KQ.state;

  KQ.VERSION = '1.0.0';

  KQ.worlds = [
    { id: 'A', title: 'Algebra-Labor', icon: '🧮', desc: 'Gruppen, Ringe, Körper, Euklid, Fermat, GF(2⁸) – das Fundament für RSA, DH, AES und Poly1305.' },
    { id: 'B', title: 'Grundlagen & Geschichte', icon: '🏛️', desc: 'Caesar, Substitution, Frequenzanalyse, Schutzziele, Kerckhoffs’ Prinzip, Sicherheitsbegriffe.' },
    { id: 'C', title: 'Stromchiffren', icon: '🌊', desc: 'One-Time-Pad, perfekte Sicherheit, Schlüsselwiederverwendung, Zufallsgeneratoren, ChaCha20.' },
    { id: 'D', title: 'Blockchiffren', icon: '🧱', desc: 'Konfusion & Diffusion, Feistel-Netzwerke, SIMON und AES Schritt für Schritt.' },
    { id: 'E', title: 'Betriebsmodi', icon: '⛓️', desc: 'ECB, CBC, CTR, Padding – und wie man CBC manipuliert oder per Padding-Oracle entschlüsselt.' },
    { id: 'F', title: 'Beweisbare Sicherheit', icon: '🎲', desc: 'Vernachlässigbarkeit, Ununterscheidbarkeit, PRG/PRF/PRP, Geburtstagsschranke, Game Hopping.' },
    { id: 'G', title: 'CPA & CCA', icon: '🛡️', desc: 'IND-CPA, IND-CCA1/2 als Spiele – du bist der Angreifer.' },
    { id: 'H', title: 'Message Authentication', icon: '🏷️', desc: 'MAC-Spiel, CBC-MAC und Längenangriff, ECBC/FCBC, Encrypt-then-MAC, AEAD.' },
    { id: 'I', title: 'Hashfunktionen', icon: '🧬', desc: 'Kollisionsresistenz, Salt, Merkle-Damgård, Length-Extension auf SHA-256, HMAC.' },
    { id: 'J', title: 'UHF & ideale Modelle', icon: '🧽', desc: 'Universelle Hashfunktionen (Poly-UHF), Random Oracle, Ideal-Permutation, Even-Mansour, Sponge.' },
    { id: 'K', title: 'Asymmetrische Kryptografie', icon: '🔑', desc: 'Diffie-Hellman, DDH/CDH, elliptische Kurven, RSA, ElGamal, Fujisaki-Okamoto, KEM.' },
    { id: 'L', title: 'Signaturen & Schnorr', icon: '✍️', desc: 'EUF-CMA, Textbook-RSA-Fälschung, RSA-PSS, Hash-then-Sign, Schnorr-Protokoll & -Signatur.' },
    { id: 'N', title: 'Prüfungsarena', icon: '🏆', desc: 'Prüfungs-Sprint über alle Themen, Zuordnungsspiele und der interaktive Spickzettel.' },
  ];
  KQ.worldById = (id) => KQ.worlds.find((w) => w.id === id);

  KQ.modules = [];
  KQ.moduleById = {};
  /** Modul registrieren */
  KQ.module = (def) => {
    def.challenges = def.challenges || {};
    def.quiz = def.quiz || [];
    def.tabs = def.tabs || [];
    KQ.modules.push(def);
    KQ.moduleById[def.id] = def;
  };
  const orderedModules = () =>
    KQ.worlds.flatMap((w) => KQ.modules.filter((m) => m.world === w.id));

  // ------------------------------------------------------------------ Erfolge
  const solvedAll = (...keys) => keys.every((k) => S.get().solved[k]);
  KQ.badges = [
    { id: 'first', icon: '🥇', title: 'Erster Durchbruch', desc: 'Löse deine erste Challenge.', check: () => Object.keys(S.get().solved).length >= 1 },
    { id: 'freq', icon: '🔍', title: 'Frequenzdetektiv', desc: 'Knacke die Substitutions-Chiffre per Häufigkeitsanalyse.', check: () => solvedAll('substitution:crack') },
    { id: 'ttp', icon: '♻️', title: 'Two-Time-Pad-Brecher', desc: 'Breche ein mehrfach verwendetes One-Time-Pad.', check: () => solvedAll('otp:reuse') },
    { id: 'aes', icon: '🧱', title: 'AES-Architekt', desc: 'Meistere alle AES-Challenges.', check: () => { const m = KQ.moduleById.aes; return m && Object.keys(m.challenges).every((c) => S.isSolved('aes', c)); } },
    { id: 'bitflip', icon: '💸', title: 'Bitflipper', desc: 'Manipuliere eine CBC-Überweisung ohne Schlüssel.', check: () => solvedAll('bitflip:amount') },
    { id: 'lenext', icon: '📏', title: 'Längenverlängerer', desc: 'Fälsche einen SHA-256(k‖m)-MAC per Length-Extension.', check: () => solvedAll('lengthext:forge') },
    { id: 'proof', icon: '🧠', title: 'Beweis-Architekt', desc: 'Löse alle Game-Hopping-Puzzles.', check: () => { const m = KQ.moduleById.gamehopping; return m && Object.keys(m.challenges).every((c) => S.isSolved('gamehopping', c)); } },
    { id: 'factor', icon: '🪓', title: 'Faktorisierer', desc: 'Breche RSA per Probedivision und ggT-Angriff.', check: () => solvedAll('rsa:trial', 'rsa:gcd') },
    { id: 'mitm', icon: '🕵️', title: 'Mallory', desc: 'Führe einen Man-in-the-Middle-Angriff auf DH aus.', check: () => solvedAll('dh:mitm') },
    { id: 'forger', icon: '🖋️', title: 'Fälscher', desc: 'Fälsche eine Textbook-RSA-Signatur (EUF-CMA).', check: () => solvedAll('signaturen:forge') },
    { id: 'nonce', icon: '🎯', title: 'Nonce-Jäger', desc: 'Extrahiere einen Schnorr-Schlüssel aus wiederverwendetem k.', check: () => solvedAll('schnorr:nonce') },
    { id: 'quiz50', icon: '🧩', title: 'Quizmaster', desc: '50 Quizfragen richtig beantwortet.', check: () => Object.values(S.get().quiz).filter((v) => v === true).length >= 50 },
    { id: 'exam', icon: '🎓', title: 'Prüfungsreif', desc: 'Mindestens 80 % im Prüfungs-Sprint.', check: () => S.get().stats.examBest >= 80 },
    { id: 'half', icon: '🌗', title: 'Halbzeit', desc: '50 % des Gesamtfortschritts erreicht.', check: () => S.totalProgress() >= 0.5 },
    { id: 'all', icon: '👑', title: 'Krypto-Großmeister', desc: '100 % aller Challenges und Quizfragen.', check: () => S.totalProgress() >= 0.999 },
  ];

  const checkBadges = () => {
    KQ.badges.forEach((b) => {
      try {
        if (!S.get().badges[b.id] && b.check() && S.grantBadge(b.id)) UI.toast('Erfolg freigeschaltet: ' + b.title, b.desc, b.icon, 6000);
      } catch (e) { /* Modul evtl. nicht geladen */ }
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
      page.appendChild(UI.callout('danger', 'Fehler beim Anzeigen', UI.escape ? e.message : String(e)));
    }
    updateNav(r);
    document.title = 'KryptoQuest';
  };

  // ------------------------------------------------------------------ Navigation
  let navBuilt = false;
  const buildNav = () => {
    const nav = document.getElementById('nav');
    UI.clear(nav);
    const search = h('input', { placeholder: 'Verfahren suchen … (Strg+K)', id: 'nav-search', spellcheck: 'false' });
    nav.appendChild(h('div', { class: 'nav-search' }, search, h('span', null, '🔍')));
    nav.appendChild(navItem('🏠', 'Start', '#/home', 'home'));
    nav.appendChild(navItem('🏅', 'Erfolge', '#/badges', 'badges'));
    nav.appendChild(h('div', { class: 'nav-sep' }));
    nav.appendChild(h('div', { class: 'nav-caption' }, 'Welten'));
    KQ.worlds.forEach((w) => {
      const mods = KQ.modules.filter((m) => m.world === w.id);
      if (!mods.length) return;
      const g = h('div', { class: 'nav-group', 'data-world': w.id });
      const head = navItem(w.icon, w.id + ' · ' + w.title, null, 'w-' + w.id, true);
      head.addEventListener('click', (e) => {
        if (e.target.classList.contains('ni-chev')) { g.classList.toggle('open'); return; }
        g.classList.add('open');
        KQ.go('#/w/' + w.id);
      });
      g.appendChild(head);
      g.appendChild(h('div', { class: 'nav-children' }, mods.map((m) => {
        const it = navItem(m.icon, m.title, '#/m/' + m.id, 'm-' + m.id);
        it.dataset.search = (m.title + ' ' + (m.keywords || '') + ' ' + w.title).toLowerCase();
        it.insertBefore(h('span', { class: 'done-dot', 'data-dot': m.id }), it.querySelector('.ni-label').nextSibling);
        return it;
      })));
      nav.appendChild(g);
    });
    nav.appendChild(h('div', { class: 'nav-sep' }));
    nav.appendChild(navItem('⚙️', 'Einstellungen', '#/settings', 'settings'));

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      nav.querySelectorAll('.nav-group').forEach((g) => {
        let any = false;
        g.querySelectorAll('.nav-children .nav-item').forEach((it) => {
          const hit = !q || it.dataset.search.includes(q);
          it.classList.toggle('hidden', !hit);
          any = any || hit;
        });
        g.classList.toggle('hidden', !any);
        if (q) g.classList.toggle('open', any);
      });
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = nav.querySelector('.nav-children .nav-item:not(.hidden)');
        if (first) { KQ.go(first.getAttribute('data-href')); search.blur(); }
      }
    });
    navBuilt = true;
  };

  function navItem(icon, label, href, key, group) {
    const it = h('div', { class: 'nav-item', 'data-key': key, 'data-href': href, role: 'link', tabindex: 0 },
      h('span', { class: 'ni-icon' }, icon), h('span', { class: 'ni-label', title: label }, label),
      group ? h('span', { class: 'ni-chev' }, '▶') : null);
    if (href) {
      it.addEventListener('click', () => { KQ.go(href); if (innerWidth < 820) document.querySelector('.shell').classList.remove('nav-open'); });
      it.addEventListener('keydown', (e) => { if (e.key === 'Enter') KQ.go(href); });
    }
    return it;
  }

  const updateNav = (r) => {
    if (!navBuilt) buildNav();
    const nav = document.getElementById('nav');
    let key = r.page;
    if (r.page === 'm') key = 'm-' + r.a;
    if (r.page === 'w') key = 'w-' + r.a;
    nav.querySelectorAll('.nav-item').forEach((it) => it.classList.toggle('selected', it.dataset.key === key));
    const wid = r.page === 'm' ? KQ.moduleById[r.a]?.world : r.page === 'w' ? r.a : null;
    if (wid) nav.querySelector(`.nav-group[data-world="${wid}"]`)?.classList.add('open');
    nav.querySelector('.nav-item.selected')?.scrollIntoView({ block: 'nearest' });
    updateProgressUI();
  };

  const updateProgressUI = () => {
    document.querySelectorAll('[data-dot]').forEach((d) => {
      const m = KQ.moduleById[d.dataset.dot];
      const p = S.moduleProgress(m);
      d.className = 'done-dot' + (p.frac >= 0.999 ? ' full' : p.frac > 0 ? ' part' : '');
      d.title = `${Math.round(p.frac * 100)} % erledigt`;
    });
    const rk = S.rank();
    const tb = document.getElementById('tb-xp');
    if (tb) {
      UI.clear(tb);
      tb.appendChild(h('span', null, rk.icon + ' ' + rk.name));
      tb.appendChild(UI.xpbar(rk.frac));
      tb.appendChild(h('b', null, rk.xp + ' XP'));
      tb.title = rk.next ? `Noch ${rk.next.at - rk.xp} XP bis „${rk.next.name}“` : 'Höchster Rang erreicht';
    }
  };

  // ------------------------------------------------------------------ Seiten
  function renderHome(page) {
    const rk = S.rank();
    const total = S.totalProgress();
    const last = S.get().last && KQ.moduleById[S.get().last];
    const next = orderedModules().find((m) => S.moduleProgress(m).frac < 1);
    const cont = last && S.moduleProgress(last).frac < 1 ? last : next;
    page.appendChild(h('div', { class: 'hero' },
      h('div', { class: 'row between top' },
        h('div', null,
          h('div', { class: 'rank-badge' }, rk.icon + ' ' + rk.name),
          h('h1', { class: 'mt' }, 'Willkommen in der Krypto-Akademie'),
          h('p', { class: 'muted', style: { maxWidth: '640px' } },
            'Jedes Verfahren aus der Vorlesung als interaktive Station: erst ',
            h('b', null, 'verstehen'), ', dann im ', h('b', null, 'Labor'), ' selbst rechnen, in der ',
            h('b', null, 'Challenge'), ' angreifen oder bauen – und im ', h('b', null, 'Quiz'), ' festigen. ',
            'Alle Algorithmen sind echt implementiert (AES, SHA-256, ChaCha20, SIMON, RSA …) und gegen offizielle Testvektoren geprüft.'),
          h('div', { class: 'row mt' },
            cont ? UI.button('Weiter: ' + cont.icon + ' ' + cont.title, () => KQ.go('#/m/' + cont.id), { kind: 'accent' }) : null,
            UI.button('🏆 Prüfungs-Sprint', () => KQ.go('#/m/exam'))
          )),
        h('div', { class: 'col center', style: { alignItems: 'center', minWidth: '150px' } },
          (() => { const r = UI.ring(total, 96, 8); return r; })(),
          h('div', { style: { marginTop: '-62px', fontSize: '20px', fontWeight: 700 } }, Math.round(total * 100) + ' %'),
          h('div', { class: 'small muted', style: { marginTop: '34px' } }, 'Gesamtfortschritt'),
          h('div', { class: 'small' }, h('b', null, rk.xp + ' XP'), rk.next ? ` · ${rk.next.at - rk.xp} bis ${rk.next.name}` : '')))));

    page.appendChild(h('h2', null, 'Welten'));
    page.appendChild(h('div', { class: 'grid auto' }, KQ.worlds.map((w) => {
      const mods = KQ.modules.filter((m) => m.world === w.id);
      if (!mods.length) return null;
      const fr = mods.reduce((s, m) => s + S.moduleProgress(m).frac, 0) / mods.length;
      return h('div', { class: 'world-card', onclick: () => KQ.go('#/w/' + w.id), tabindex: 0 },
        h('div', { class: 'wc-icon' }, w.icon),
        h('div', { class: 'wc-body' },
          h('div', { class: 'wc-title' }, `${w.id} · ${w.title}`),
          h('div', { class: 'wc-sub' }, `${mods.length} Stationen · ${Math.round(fr * 100)} %`),
          h('div', { class: 'mt', style: { marginTop: '6px' } }, UI.xpbar(fr))));
    })));

    page.appendChild(h('h2', null, 'So lernst du hier'));
    page.appendChild(h('div', { class: 'grid c4' },
      [['📖', 'Verstehen', 'Definitionen, Sätze und Beweisideen kompakt – mit Klausur-Tipps und Hinweisen auf Folienfehler.'],
       ['🧪', 'Labor', 'Freies Experimentieren: eigene Eingaben, jeder Zwischenschritt sichtbar, Animation Schritt für Schritt.'],
       ['⚔️', 'Challenge', 'Konkrete Aufgaben – meist als Angreifer. Gelöst = XP, Rang und Erfolge.'],
       ['❓', 'Quiz', 'Prüfungsnahe Fragen mit Erklärung. Alle Fragen fließen in den Prüfungs-Sprint ein.']]
        .map(([i, t, d]) => h('div', { class: 'card', style: { margin: 0 } }, h('div', { style: { fontSize: '24px' } }, i), h('h3', { style: { marginTop: '6px' } }, t), h('p', { class: 'muted small' }, d)))));

    page.appendChild(UI.callout('info', 'Ehrlicher Hinweis',
      'Die App ersetzt nicht das Skript. Sie bildet die Inhalte aus den Kapiteln 1–18 (Prof. Jungk), den Board-Folien zur asymmetrischen Kryptografie (Prof. Henrich), der Gesamtzusammenfassung und dem Game-Hopping-Dokument ab. ' +
      'Wo die Unterlagen Tipp- oder Sachfehler enthalten, ist das in der jeweiligen Station mit 📝 markiert. Die Spielzeug-Parameter (kleine Primzahlen, 8-Bit-Blöcke) dienen dem Verständnis und sind natürlich nicht sicher.'));
  }

  function renderWorld(page, w) {
    const mods = KQ.modules.filter((m) => m.world === w.id);
    page.appendChild(h('div', { class: 'breadcrumb' }, h('a', { onclick: () => KQ.go('#/home') }, 'Start'), h('span', null, '›'), h('span', null, `Welt ${w.id}`)));
    page.appendChild(h('div', { class: 'row' }, h('div', { style: { fontSize: '34px' } }, w.icon), h('div', null, h('h1', { class: 'page-title' }, w.title), h('div', { class: 'page-sub' }, w.desc))));
    page.appendChild(h('div', { class: 'grid auto mt' }, mods.map((m) => {
      const p = S.moduleProgress(m);
      return h('div', { class: 'card module-card', style: { margin: 0 }, onclick: () => KQ.go('#/m/' + m.id), tabindex: 0 },
        h('div', { class: 'mc-head' }, h('span', { class: 'mc-icon' }, m.icon), h('span', { class: 'mc-title' }, m.title), UI.ring(p.frac, 28, 3)),
        h('div', { class: 'small muted' }, m.short || ''),
        h('div', { class: 'row small' },
          p.totalCh ? UI.chip(`⚔️ ${p.doneCh}/${p.totalCh}`, p.doneCh === p.totalCh ? 'ok' : '') : null,
          p.totalQ ? UI.chip(`❓ ${p.doneQ}/${p.totalQ}`, p.doneQ === p.totalQ ? 'ok' : '') : null));
    })));
  }

  function renderModule(page, m, tabIdx) {
    S.visit(m.id);
    const w = KQ.worldById(m.world);
    const tabs = m.tabs.slice();
    if (m.quiz.length) tabs.push({ id: 'quiz', title: '❓ Quiz', render: (el, ctx) => KQ.renderQuiz(el, m, ctx) });
    tabIdx = Math.max(0, Math.min(tabs.length - 1, tabIdx || 0));

    const chipsEl = h('div', { class: 'row' });
    const refreshChips = () => {
      UI.clear(chipsEl);
      const p = S.moduleProgress(m);
      if (p.totalCh) chipsEl.appendChild(UI.chip(`⚔️ Challenges ${p.doneCh}/${p.totalCh}`, p.doneCh === p.totalCh ? 'ok' : ''));
      if (p.totalQ) chipsEl.appendChild(UI.chip(`❓ Quiz ${p.doneQ}/${p.totalQ}`, p.doneQ === p.totalQ ? 'ok' : ''));
      Object.entries(m.challenges).forEach(([id, c]) => chipsEl.appendChild(UI.chip((S.isSolved(m.id, id) ? '✓ ' : '○ ') + c.title + ` · ${c.xp} XP`, S.isSolved(m.id, id) ? 'ok' : '')));
    };

    page.appendChild(h('div', { class: 'breadcrumb' },
      h('a', { onclick: () => KQ.go('#/home') }, 'Start'), '›',
      h('a', { onclick: () => KQ.go('#/w/' + w.id) }, `${w.icon} ${w.id} · ${w.title}`), h('span', null, '›'), h('span', null, m.title)));
    page.appendChild(h('div', { class: 'row' }, h('div', { style: { fontSize: '34px' } }, m.icon),
      h('div', { style: { flex: 1 } }, h('h1', { class: 'page-title' }, m.title), h('div', { class: 'page-sub' }, m.short || ''))));
    page.appendChild(h('div', { class: 'mt' }, chipsEl));

    const tabBar = h('div', { class: 'tabs', role: 'tablist' });
    const body = h('div', { class: 'tab-body' });
    const ctx = {
      mod: m,
      solve: (chId, note) => {
        const c = m.challenges[chId];
        if (!c) { console.warn('Unbekannte Challenge', chId); return 0; }
        const xp = S.solve(m.id, chId, c.xp);
        if (xp) {
          UI.toast('Challenge gelöst: ' + c.title, `+${xp} XP` + (note ? ' · ' + note : ''), '🏆');
          UI.confetti();
          refreshChips(); updateProgressUI(); checkBadges();
        }
        return xp;
      },
      solved: (chId) => S.isSolved(m.id, chId),
      goTab: (i) => KQ.go(`#/m/${m.id}/${i}`),
      refresh: () => { refreshChips(); updateProgressUI(); checkBadges(); },
    };
    tabs.forEach((t, i) => tabBar.appendChild(h('button', {
      class: 'tab' + (i === tabIdx ? ' on' : ''), role: 'tab', type: 'button',
      onclick: () => history.replaceState(null, '', `#/m/${m.id}/${i}`) || showTab(i),
    }, t.title)));
    const showTab = (i) => {
      UI.runLeave();
      tabIdx = i;
      [...tabBar.children].forEach((b, k) => b.classList.toggle('on', k === i));
      UI.clear(body);
      try { tabs[i].render(body, ctx); }
      catch (e) { console.error(e); body.appendChild(UI.callout('danger', 'Fehler in dieser Station', String(e && e.stack || e))); }
    };
    page.appendChild(tabBar);
    page.appendChild(body);
    refreshChips();
    showTab(tabIdx);

    // Vor/Zurück
    const all = orderedModules();
    const idx = all.indexOf(m);
    page.appendChild(h('div', { class: 'row between mt', style: { marginTop: '32px', borderTop: '1px solid var(--stroke)', paddingTop: '16px' } },
      idx > 0 ? UI.button('← ' + all[idx - 1].title, () => KQ.go('#/m/' + all[idx - 1].id), { kind: 'subtle' }) : h('span'),
      idx < all.length - 1 ? UI.button(all[idx + 1].title + ' →', () => KQ.go('#/m/' + all[idx + 1].id)) : h('span')));
  }

  /** Quiz eines Moduls. q: {q, a:[...], c: Index, e: Erklärung} */
  KQ.renderQuiz = (el, m, ctx, opts = {}) => {
    const qs = m.quiz;
    const box = h('div');
    el.appendChild(UI.callout('info', null, `${qs.length} Fragen · jede erste richtige Antwort bringt 10 XP. Antworten werden gemischt.`));
    el.appendChild(box);
    const renderAll = () => {
      UI.clear(box);
      qs.forEach((q, qi) => box.appendChild(KQ.quizCard(q, (ok) => { const xp = S.answer(m.id, qi, ok); if (xp) UI.toast('Richtig!', `+${xp} XP`, '✅', 1800); ctx && ctx.refresh(); }, S.quizState(m.id, qi), qi + 1)));
      box.appendChild(h('div', { class: 'row mt' }, UI.button('🔀 Neu mischen & zurücksetzen', renderAll)));
    };
    renderAll();
  };

  KQ.quizCard = (q, onAnswer, prev, num) => {
    const order = KQ.util.shuffle(q.a.map((_, i) => i));
    const wrap = h('div', { class: 'card quiz-q' });
    wrap.appendChild(h('div', { class: 'qtext', html: (num ? num + '. ' : '') + q.q + (prev === true ? ' <span class="chip ok">bereits gelöst</span>' : '') }));
    const opts = order.map((i) => h('button', { class: 'quiz-opt', type: 'button' }, h('span', { class: 'qo-mark' }), h('span', { html: q.a[i] })));
    const explain = h('div');
    opts.forEach((b, k) => b.addEventListener('click', () => {
      const chosen = order[k];
      const ok = chosen === q.c;
      opts.forEach((o, j) => {
        o.disabled = true;
        if (order[j] === q.c) { o.classList.add('right'); o.querySelector('.qo-mark').textContent = '✓'; }
      });
      if (!ok) { b.classList.add('wrong'); b.querySelector('.qo-mark').textContent = '✗'; }
      explain.appendChild(h('div', { class: 'quiz-explain', html: (ok ? '<b>Richtig.</b> ' : '<b>Falsch.</b> ') + (q.e || '') }));
      onAnswer && onAnswer(ok);
    }));
    opts.forEach((o) => wrap.appendChild(o));
    wrap.appendChild(explain);
    return wrap;
  };

  function renderBadges(page) {
    page.appendChild(h('h1', { class: 'page-title' }, '🏅 Erfolge & Rang'));
    const rk = S.rank();
    page.appendChild(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('div', { style: { fontSize: '36px' } }, rk.icon),
        h('div', { style: { flex: 1 } }, h('h3', { style: { margin: 0 } }, rk.name), h('div', { class: 'muted' }, `${rk.xp} XP` + (rk.next ? ` · nächster Rang „${rk.next.name}“ bei ${rk.next.at} XP` : ' · höchster Rang')), h('div', { class: 'mt' }, UI.xpbar(rk.frac))))));
    page.appendChild(h('h2', null, 'Ränge'));
    page.appendChild(h('div', { class: 'grid c3' }, S.RANKS.map(([xp, n, ic], i) =>
      h('div', { class: 'badge-tile' + (i > rk.index ? ' locked' : '') }, h('div', { class: 'bt-icon' }, ic), h('div', null, h('b', null, n), h('div', { class: 'small muted' }, `ab ${xp} XP`))))));
    page.appendChild(h('h2', null, 'Erfolge'));
    page.appendChild(h('div', { class: 'grid c3' }, KQ.badges.map((b) => {
      const got = S.get().badges[b.id];
      return h('div', { class: 'badge-tile' + (got ? '' : ' locked') }, h('div', { class: 'bt-icon' }, b.icon),
        h('div', null, h('b', null, b.title), h('div', { class: 'small muted' }, b.desc), got ? h('div', { class: 'small ok-text' }, '✓ ' + new Date(got).toLocaleDateString('de-DE')) : null));
    })));
    const st = S.get().stats;
    page.appendChild(h('h2', null, 'Statistik'));
    page.appendChild(UI.kv([
      ['Gelöste Challenges', Object.keys(S.get().solved).length + ' / ' + KQ.modules.reduce((s, m) => s + Object.keys(m.challenges).length, 0)],
      ['Quizfragen richtig (eindeutig)', Object.values(S.get().quiz).filter((v) => v === true).length + ' / ' + KQ.modules.reduce((s, m) => s + m.quiz.length, 0)],
      ['Quiz-Antworten gesamt', `${st.quizRight} richtig · ${st.quizWrong} falsch`],
      ['Prüfungs-Sprint', `${st.examRuns} Durchläufe · Bestwert ${st.examBest} %`],
    ]));
  }

  function renderSettings(page) {
    const st = S.settings();
    page.appendChild(h('h1', { class: 'page-title' }, '⚙️ Einstellungen'));
    page.appendChild(h('div', { class: 'card' }, h('h3', null, 'Darstellung'),
      h('div', { class: 'row' }, h('span', { style: { width: '160px' } }, 'Farbmodus'),
        UI.segmented([['system', 'Wie Windows'], ['light', 'Hell'], ['dark', 'Dunkel']], st.theme, (v) => { S.setSetting('theme', v); KQ.applyTheme(); })),
      h('div', { class: 'row mt' }, UI.toggle('Animationen reduzieren', st.reduceMotion, (v) => { S.setSetting('reduceMotion', v); KQ.applyTheme(); })),
      root.kqNative && root.kqNative.micaSupported
        ? h('div', { class: 'row mt' }, UI.toggle('Mica-Hintergrund (Windows 11)', st.mica, (v) => { S.setSetting('mica', v); KQ.applyTheme(); }))
        : null));
    const fileIn = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { S.import(await f.text()); UI.toast('Spielstand importiert', null, '📥'); KQ.go('#/home'); }
      catch (e) { UI.modal('Import fehlgeschlagen', String(e.message)); }
    });
    page.appendChild(h('div', { class: 'card' }, h('h3', null, 'Spielstand'),
      h('p', { class: 'muted' }, 'Der Fortschritt wird lokal gespeichert. Du kannst ihn sichern und auf einem anderen Rechner importieren.'),
      h('div', { class: 'row' },
        UI.button('📤 Exportieren', () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([S.export()], { type: 'application/json' })), download: 'kryptoquest-spielstand.json' });
          document.body.appendChild(a); a.click(); a.remove();
        }),
        UI.button('📥 Importieren', () => fileIn.click()), fileIn,
        UI.button('Fortschritt zurücksetzen', () => UI.modal('Wirklich zurücksetzen?', 'Alle XP, gelösten Challenges und Erfolge werden gelöscht.', [['Abbrechen'], ['Zurücksetzen', () => { S.reset(); KQ.go('#/home'); }, 'accent']]), { kind: 'danger' }))));
    page.appendChild(h('div', { class: 'card' }, h('h3', null, 'Über KryptoQuest'),
      UI.kv([['Version', KQ.VERSION], ['Stationen', String(KQ.modules.length)], ['Laufzeit', root.kqNative ? 'Windows-App (Electron ' + (root.kqNative.versions?.electron || '?') + ')' : 'Browser']]),
      h('p', { class: 'muted small mt' }, 'Lernspiel zur Vorlesung Kryptografie. Alle Verfahren sind zu Lernzwecken implementiert – nicht konstante Zeit, nicht für echte Geheimnisse verwenden.')));
  }

  // ------------------------------------------------------------------ Theme
  KQ.applyTheme = () => {
    const st = S.settings();
    const de = document.documentElement;
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
