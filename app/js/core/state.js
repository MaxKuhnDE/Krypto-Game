/* KryptoQuest – Spielstand: XP, gelöste Challenges, Quiz, Erfolge, Einstellungen.
 * Gespeichert in localStorage (in der Windows-App im Benutzerprofil). */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const KEY = 'kryptoquest-state-v1';
  const QUIZ_XP = 10;

  const fresh = () => ({
    version: 1, xp: 0, solved: {}, quiz: {}, visited: {}, badges: {},
    settings: { theme: 'system', reduceMotion: false, mica: false },
    stats: { examBest: 0, examRuns: 0, quizRight: 0, quizWrong: 0 },
    last: null,
  });

  let data = fresh();
  const S = (KQ.state = {});

  S.load = () => {
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        data = Object.assign(fresh(), d);
        data.settings = Object.assign(fresh().settings, d.settings || {});
        data.stats = Object.assign(fresh().stats, d.stats || {});
      }
    } catch (e) { console.warn('Spielstand konnte nicht geladen werden', e); }
    return data;
  };

  S.save = () => {
    try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { /* privater Modus o.ä. – Spiel läuft ohne Speicherung weiter */ }
  };

  S.get = () => data;
  S.settings = () => data.settings;
  S.setSetting = (k, v) => { data.settings[k] = v; S.save(); };

  const emit = () => root.dispatchEvent && root.dispatchEvent(new CustomEvent('kq:progress'));

  S.isSolved = (mod, ch) => !!data.solved[mod + ':' + ch];

  /** Markiert eine Challenge als gelöst. Gibt die vergebenen XP zurück (0, falls schon gelöst). */
  S.solve = (mod, ch, xp) => {
    const key = mod + ':' + ch;
    if (data.solved[key]) return 0;
    data.solved[key] = { xp, at: Date.now() };
    data.xp += xp;
    S.save();
    emit();
    return xp;
  };

  S.quizState = (mod, idx) => data.quiz[mod + ':' + idx];

  /** Quizantwort speichern; XP nur beim ersten richtigen Mal */
  S.answer = (mod, idx, correct) => {
    const key = mod + ':' + idx;
    let xp = 0;
    if (correct) data.stats.quizRight++; else data.stats.quizWrong++;
    if (correct && data.quiz[key] !== true) { data.xp += QUIZ_XP; xp = QUIZ_XP; data.quiz[key] = true; }
    else if (!correct && data.quiz[key] === undefined) data.quiz[key] = false;
    S.save();
    emit();
    return xp;
  };

  S.visit = (mod) => { data.visited[mod] = Date.now(); data.last = mod; S.save(); };

  S.moduleProgress = (m) => {
    const chs = Object.keys(m.challenges || {});
    const nq = (m.quiz || []).length;
    const doneCh = chs.filter((c) => S.isSolved(m.id, c)).length;
    let doneQ = 0;
    for (let i = 0; i < nq; i++) if (data.quiz[m.id + ':' + i] === true) doneQ++;
    const total = chs.length + nq;
    // Stationen ohne Challenges/Quiz (z.B. Spickzettel) gelten nach dem Besuch als erledigt
    const frac = total ? (doneCh + doneQ) / total : data.visited[m.id] ? 1 : 0;
    return { doneCh, totalCh: chs.length, doneQ, totalQ: nq, frac };
  };

  S.totalProgress = () => {
    const ms = KQ.modules || [];
    if (!ms.length) return 0;
    let done = 0, total = 0;
    ms.forEach((m) => {
      const p = S.moduleProgress(m);
      done += p.doneCh + p.doneQ; total += p.totalCh + p.totalQ;
    });
    return total ? done / total : 0;
  };

  S.RANKS = [
    [0, 'Klartext-Lehrling', '🐣'],
    [150, 'Caesar-Kadett', '🏛️'],
    [400, 'XOR-Adept', '⊕'],
    [800, 'Feistel-Ritter', '🛡️'],
    [1300, 'AES-Architekt', '🧱'],
    [2000, 'Hash-Hüter', '🧬'],
    [2800, 'Beweis-Magier', '🎲'],
    [3800, 'Public-Key-Paladin', '🔑'],
    [5000, 'Krypto-Großmeister', '👑'],
  ];

  S.rank = () => {
    let i = 0;
    while (i + 1 < S.RANKS.length && data.xp >= S.RANKS[i + 1][0]) i++;
    const cur = S.RANKS[i], next = S.RANKS[i + 1];
    return {
      index: i, name: cur[1], icon: cur[2], xp: data.xp,
      next: next ? { name: next[1], at: next[0] } : null,
      frac: next ? (data.xp - cur[0]) / (next[0] - cur[0]) : 1,
    };
  };

  S.grantBadge = (id) => {
    if (data.badges[id]) return false;
    data.badges[id] = Date.now();
    S.save();
    return true;
  };

  S.recordExam = (score) => {
    data.stats.examRuns++;
    data.stats.examBest = Math.max(data.stats.examBest, score);
    S.save();
  };

  S.reset = () => { data = fresh(); S.save(); emit(); };

  S.export = () => JSON.stringify(data, null, 2);
  S.import = (json) => {
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object' || !d.solved) throw new Error('Keine gültige KryptoQuest-Spielstand-Datei');
    data = Object.assign(fresh(), d);
    S.save(); emit();
  };
})(typeof window !== 'undefined' ? window : globalThis);
