/* Welt B – Grundlagen & Geschichte */
(function () {
  'use strict';
  const { ui: UI, util: U, tools: T } = KQ;
  const h = UI.h;
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /** Buchstabenhäufigkeiten im Deutschen (in %) */
  const DE_FREQ = { E: 17.4, N: 9.78, I: 7.55, S: 7.27, R: 7.0, A: 6.51, T: 6.15, D: 5.08, H: 4.76, U: 4.35, L: 3.44, C: 3.06, G: 3.01, M: 2.53, O: 2.51, B: 1.89, W: 1.89, F: 1.66, K: 1.21, Z: 1.13, P: 0.79, V: 0.67, J: 0.27, Y: 0.04, X: 0.03, Q: 0.02 };
  KQ.DE_FREQ = DE_FREQ;

  const normalize = (s) => s.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/[^A-Z ]/g, '');
  const caesar = (s, k) => s.replace(/[A-Z]/g, (c) => ABC[(c.charCodeAt(0) - 65 + k + 26) % 26]);
  const counts = (s) => { const c = {}; ABC.split('').forEach((x) => (c[x] = 0)); for (const ch of s) if (c[ch] !== undefined) c[ch]++; return c; };
  /** χ²-Abstand zur deutschen Verteilung – kleiner = deutscher */
  const chi2 = (s) => {
    const c = counts(s); const n = Object.values(c).reduce((a, b) => a + b, 0) || 1;
    return ABC.split('').reduce((sum, x) => { const exp = (DE_FREQ[x] / 100) * n; return sum + ((c[x] - exp) ** 2) / (exp || 0.01); }, 0);
  };

  const SENTENCES = [
    'TREFFEN WIR UNS MORGEN UM ACHT AM ALTEN RATHAUS',
    'DER SCHLUESSEL LIEGT UNTER DER BLAUEN FUSSMATTE',
    'KERCKHOFFS SAGT NUR DER SCHLUESSEL MUSS GEHEIM BLEIBEN',
    'DIE LEGION MARSCHIERT IM MORGENGRAUEN NACH NORDEN',
    'BRUTE FORCE IST BEI NUR FUENFUNDZWANZIG SCHLUESSELN TRIVIAL',
  ];

  // ======================================================================
  KQ.module({
    id: 'caesar', world: 'B', title: 'Caesar-Chiffre',
    short: 'Rotation um k Stellen, Brute Force über 25 Schlüssel und automatisches Erkennen deutscher Texte.',
    keywords: 'caesar verschiebung rotation brute force historisch',
    challenges: { crack: { title: 'Geheimbotschaft knacken', xp: 30 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Definition',
            h('p', null, 'Buchstaben werden auf 0 … 25 abgebildet (A = 0, …, Z = 25). Mit Schlüssel k:'),
            UI.formula('c ≡ m + k (mod 26)          m ≡ c − k (mod 26)'),
            h('p', null, 'Caesar selbst nutzte k = 3. ', h('b', null, 'Hauptnachteil:'), ' nur 25 sinnvolle Schlüssel – ein Brute-Force-Angriff probiert einfach alle durch.')),
          UI.card('Was die Caesar-Chiffre lehrt',
            h('ul', { class: 'tight' },
              h('li', null, 'Ein sicheres Verfahren braucht einen ', h('b', null, 'großen Schlüsselraum'), ' (heute ≥ 2¹²⁸).'),
              h('li', null, 'Ein großer Schlüsselraum reicht aber nicht (→ Substitution mit 26! ≈ 2⁸⁸ Schlüsseln ist trotzdem leicht zu brechen).'),
              h('li', null, 'Zum Erkennen des richtigen Schlüssels braucht der Angreifer ein Kriterium für „plausiblen Klartext“ – hier die Buchstabenverteilung (χ²-Test).'))));
      } },
      { title: 'Labor', render(el) {
        let k = 3, txt = 'VENI VIDI VICI';
        const wheel = h('div'), out = h('div', { class: 'msg', style: { fontSize: '15px' } }), bf = h('div');
        const draw = () => {
          const m = normalize(txt);
          UI.clear(wheel);
          wheel.append(UI.bytes(ABC.split('').map((c) => c.charCodeAt(0)), { cols: 26, fmt: (b) => String.fromCharCode(b), cls: () => 'const' }),
            h('div', { class: 'center muted small' }, `↓ +${k} mod 26`),
            UI.bytes(ABC.split('').map((_, i) => ABC.charCodeAt((i + k) % 26)), { cols: 26, fmt: (b) => String.fromCharCode(b), cls: () => 'hi' }));
          out.textContent = caesar(m, k) || '…';
          UI.clear(bf);
          const c = caesar(m, k);
          const rows = Array.from({ length: 26 }, (_, kk) => ({ kk, p: caesar(c, -kk), s: chi2(caesar(c, -kk).replace(/ /g, '')) }));
          const best = rows.reduce((a, b) => (b.s < a.s ? b : a));
          bf.append(UI.table(['Schlüssel', 'Entschlüsselung', 'χ² (kleiner = deutscher)'],
            rows.map((r) => ({ cells: [r.kk, r.kk === best.kk ? `<b>${r.p}</b>` : r.p, r.s.toFixed(1)], cls: null })), { mono: true, maxHeight: '320px' }),
            h('p', { class: 'small' }, 'Automatisch erkannt: ', h('b', null, `k = ${best.kk}`), m.replace(/ /g, '').length < 20 ? h('span', { class: 'muted' }, ' (bei sehr kurzen Texten unzuverlässig)') : null));
        };
        el.append(UI.card('Verschlüsseln',
          UI.textarea({ value: txt, oninput: (v) => { txt = v; draw(); }, rows: 2 }),
          h('div', { class: 'mt' }, UI.slider({ label: 'Schlüssel k =', min: 0, max: 25, value: k, oninput: (v) => { k = v; draw(); } })),
          h('div', { class: 'mt' }, wheel), h('h4', null, 'Chiffrat'), out),
          UI.card('Brute Force: alle 26 Schlüssel', bf));
        draw();
      } },
      { title: 'Challenge', render(el, ctx) {
        const m = U.pick(SENTENCES), k = U.randInt(1, 25);
        const c = caesar(m, k);
        el.append(UI.card('Abgefangene Nachricht',
          h('div', { class: 'msg', style: { fontSize: '15px' } }, c),
          h('p', null, 'Bestimme den Schlüssel ohne Brute-Force-Tabelle. Hinweis: Der häufigste Buchstabe im Deutschen ist E.'),
          (() => {
            const cnt = counts(c.replace(/ /g, ''));
            const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([x, n]) => `${x} (${n}×)`).join(', ');
            return h('p', { class: 'muted small' }, 'Häufigste Buchstaben im Chiffrat: ' + top);
          })(),
          T.answer('k =', (v) => { if (+v === k) { ctx.solve('crack', 'Klartext: ' + m); return true; } return 'Entschlüsselt: ' + caesar(c, -(+v || 0)).slice(0, 30) + '…'; })));
      } },
    ],
    quiz: [
      { q: 'Wie viele nutzbare Schlüssel hat die Caesar-Chiffre?', a: ['25', '26', '26!', '2²⁶'], c: 0, e: 'k = 0 ist die Identität.' },
      { q: 'Was ist „Brute Force“?', a: ['Alle Schlüssel durchprobieren', 'Häufigkeiten zählen', 'Den Algorithmus geheim halten', 'Den Schlüssel erraten'], c: 0, e: 'Ziel moderner Verfahren: kein Angriff wesentlich besser als Brute Force, und Brute Force ist unpraktikabel (2¹²⁸).' },
    ],
  });

  // ======================================================================
  const LONG_TEXTS = [
    'DIE KRYPTOGRAFIE IST DIE WISSENSCHAFT VON DER VERSCHLUESSELUNG VON INFORMATIONEN SCHON IM ALTEN ROM NUTZTE CAESAR EINE EINFACHE VERSCHIEBUNG DER BUCHSTABEN UM SEINE NACHRICHTEN AN DIE GENERAELE ZU SCHUETZEN SPAETER ERSETZTE MAN JEDEN BUCHSTABEN DURCH EINEN BELIEBIGEN ANDEREN UND GLAUBTE DIESE METHODE SEI SICHER DENN ES GIBT MEHR ALS VIER MAL ZEHN HOCH SECHSUNDZWANZIG MOEGLICHE SCHLUESSEL DOCH ARABISCHE GELEHRTE ENTDECKTEN DASS IN JEDER SPRACHE MANCHE BUCHSTABEN VIEL HAEUFIGER VORKOMMEN ALS ANDERE IM DEUTSCHEN IST DAS E MIT ABSTAND AM HAEUFIGSTEN GEFOLGT VON N I S R UND A WER DIE HAEUFIGKEITEN IM GEHEIMTEXT ZAEHLT KANN DIE ZUORDNUNG SCHRITT FUER SCHRITT REKONSTRUIEREN UND DEN TEXT LESEN OHNE DEN SCHLUESSEL JE GESEHEN ZU HABEN',
    'AUGUSTE KERCKHOFFS FORDERTE IM JAHR ACHTZEHNHUNDERTDREIUNDACHTZIG DASS EIN VERSCHLUESSELUNGSVERFAHREN NICHT GEHEIM SEIN MUSS UND OHNE SCHADEN IN DIE HAENDE DES FEINDES FALLEN DARF NUR DER SCHLUESSEL MUSS GEHEIM BLEIBEN DIESE IDEE IST HEUTE DIE GRUNDLAGE DER MODERNEN KRYPTOGRAFIE DENN OEFFENTLICHE VERFAHREN WERDEN VON VIELEN EXPERTEN UNTERSUCHT UND SCHWACHSTELLEN WERDEN FRUEH GEFUNDEN GEHEIME VERFAHREN WIE DIE CHIFFRE DES ALTEN MOBILFUNKS ODER EINIGE SCHLIESSSYSTEME FUER AUTOS WURDEN DAGEGEN GEBROCHEN SOBALD JEMAND DEN ALGORITHMUS RUECKWAERTS ENTWICKELT HATTE DESHALB VERTRAUT MAN HEUTE NUR VERFAHREN DIE VIELE JAHRE OEFFENTLICHER ANALYSE UEBERSTANDEN HABEN',
    'DER ADVANCED ENCRYPTION STANDARD WURDE IM JAHR ZWEITAUSENDEINS VON DER AMERIKANISCHEN STANDARDISIERUNGSBEHOERDE ALS NACHFOLGER DES DATA ENCRYPTION STANDARD VEROEFFENTLICHT ER VERSCHLUESSELT BLOECKE VON HUNDERTACHTUNDZWANZIG BIT IN ZEHN BIS VIERZEHN RUNDEN JEDE RUNDE BESTEHT AUS EINER NICHTLINEAREN SUBSTITUTION EINER VERSCHIEBUNG DER ZEILEN EINER MISCHUNG DER SPALTEN UND DER ADDITION EINES RUNDENSCHLUESSELS BIS HEUTE IST KEIN PRAKTISCHER ANGRIFF AUF DEN VOLLEN ALGORITHMUS BEKANNT DIE GEFAHR LIEGT VIELMEHR IN DER IMPLEMENTIERUNG DENN WER DEN STROMVERBRAUCH ODER DIE LAUFZEIT EINES CHIPS MISST KANN UNTER UMSTAENDEN DEN SCHLUESSEL ERMITTELN',
  ];

  KQ.module({
    id: 'substitution', world: 'B', title: 'Substitution & Frequenzanalyse',
    short: '26! ≈ 2⁸⁸ Schlüssel – und trotzdem knackbar. Werde zum Frequenzdetektiv.',
    keywords: 'substitution monoalphabetisch frequenzanalyse häufigkeit buchstaben',
    challenges: { crack: { title: 'Geheimtext entschlüsseln', xp: 70 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Monoalphabetische Substitution',
            h('p', null, 'Statt zu verschieben, wird jeder Buchstabe über eine beliebige Ersetzungstabelle (eine Permutation des Alphabets) ersetzt:'),
            h('pre', { class: 'code' }, 'A B C D E F …\nX B F Y A D …'),
            h('p', null, 'Schlüsselraum: 26! ≈ 4 · 10²⁶ ≈ 2⁸⁸ – Brute Force ist aussichtslos.')),
          UI.card('Warum es trotzdem gebrochen ist',
            h('p', null, 'Die Substitution erhält die ', h('b', null, 'Statistik'), ' der Sprache: Häufigkeiten einzelner Buchstaben, Bigramme (EN, ER, CH, EI), Wortlängen und häufige Wörter (DER, DIE, UND). Frequenzanalyse ist deutlich besser als Brute Force – damit gilt das Verfahren als gebrochen.'),
            h('div', { class: 'freq-bars' }, Object.entries(DE_FREQ).map(([c, f]) => h('div', { class: 'fb' }, h('div', { class: 'bar', style: { height: (f / 17.4) * 100 + '%' } }), c))),
            h('p', { class: 'small muted center' }, 'Buchstabenhäufigkeit im Deutschen')),
          UI.callout('exam', 'Merksatz', 'Alle historischen Verfahren wurden gebrochen. Ein Verfahren gilt erst als sicher, wenn es mehr als 5 Jahre öffentlicher Kryptanalyse standgehalten hat.'));
      } },
      { title: 'Challenge: Frequenzdetektiv', render(el, ctx) {
        const plain = U.pick(LONG_TEXTS);
        const perm = U.shuffle(ABC.split(''));
        const enc = {}; ABC.split('').forEach((c, i) => (enc[c] = perm[i]));
        const dec = {}; Object.entries(enc).forEach(([p, c]) => (dec[c] = p));
        const cipher = plain.replace(/[A-Z]/g, (c) => enc[c]);
        const guess = {};
        const cnt = counts(cipher.replace(/ /g, ''));
        const total = Object.values(cnt).reduce((a, b) => a + b, 0);
        const order = Object.entries(cnt).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c);
        const textEl = h('div', { class: 'mono', style: { lineHeight: '1.9', fontSize: '14px', wordBreak: 'break-word' } });
        const status = h('div', { class: 'mt' });
        const mapEl = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(66px, 1fr))', gap: '6px' } });
        const inputs = {};
        const draw = () => {
          UI.clear(textEl);
          for (const ch of cipher) {
            if (ch === ' ') { textEl.append(' '); continue; }
            const g = guess[ch];
            textEl.append(h('span', { style: g ? { color: 'var(--success)', fontWeight: 700 } : { color: 'var(--text-3)' } }, g ? g.toLowerCase() : ch));
          }
          let right = 0;
          for (const ch of cipher) if (ch !== ' ' && guess[ch] === dec[ch]) right++;
          const frac = right / total;
          UI.clear(status);
          status.append(h('div', { class: 'row' }, h('span', null, `Korrekt entschlüsselte Zeichen: `, h('b', null, Math.round(frac * 100) + ' %')), h('div', { style: { width: '200px' } }, UI.xpbar(frac)), h('span', { class: 'muted small' }, 'Ziel: ≥ 95 %')));
          if (frac >= 0.95) { status.append(UI.callout('success', 'Entschlüsselt', 'Ohne den Schlüssel zu kennen – nur mit Statistik. Klartext:<br><span class="mono small">' + plain + '</span>')); ctx.solve('crack'); }
          Object.entries(inputs).forEach(([c, inp]) => { if (document.activeElement !== inp) inp.value = guess[c] || ''; });
        };
        order.forEach((c) => {
          const inp = UI.input({ mono: true, maxlength: 1, placeholder: '?' });
          inp.style.width = '34px'; inp.style.textAlign = 'center'; inp.style.padding = '4px';
          inp.addEventListener('input', () => {
            const v = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
            inp.value = v;
            Object.keys(guess).forEach((k) => { if (guess[k] === v && k !== c) delete guess[k]; });
            if (v) guess[c] = v; else delete guess[c];
            draw();
          });
          inputs[c] = inp;
          mapEl.append(h('div', { class: 'col', style: { alignItems: 'center', gap: '2px', padding: '4px', border: '1px solid var(--stroke)', borderRadius: '6px', background: 'var(--card-2)' } },
            h('b', { class: 'mono' }, c), h('span', { class: 'small muted' }, (cnt[c] / total * 100).toFixed(1) + '%'), inp));
        });
        const deOrder = Object.keys(DE_FREQ);
        const maxF = Math.max(...Object.values(cnt)) / total * 100;
        el.append(
          UI.card('Häufigkeiten: Geheimtext (blau) vs. Deutsch (grau)',
            h('div', { class: 'freq-bars' }, order.map((c, i) => h('div', { class: 'fb', title: `${c}: ${cnt[c]}×` },
              h('div', { style: { display: 'flex', gap: '1px', alignItems: 'flex-end', width: '100%', height: '100%' } },
                h('div', { class: 'bar', style: { height: (cnt[c] / total * 100 / Math.max(maxF, 17.4)) * 100 + '%', flex: 1 } }),
                h('div', { class: 'bar ref', style: { height: ((DE_FREQ[deOrder[i]] || 0) / Math.max(maxF, 17.4)) * 100 + '%', flex: 1 } })),
              h('span', null, c + '|' + (deOrder[i] || ''))))),
            h('p', { class: 'small muted' }, 'Unter jedem Balkenpaar: Geheimtext-Buchstabe | deutscher Buchstabe gleichen Rangs. Häufige Wörter: DER DIE UND DAS IST EIN – häufige Bigramme: EN ER CH EI DE ND TE IE IN SC.')),
          UI.card('Zuordnung (Geheimtext-Buchstabe → Klartext)', mapEl,
            h('div', { class: 'row mt' },
              UI.button('Vorschlag nach Rang', () => { order.forEach((c, i) => (guess[c] = deOrder[i])); draw(); }, { title: 'Ordnet nach Häufigkeitsrang zu – nur ein Startpunkt.' }),
              UI.button('Hinweis (1 Buchstabe)', () => { const c = order.find((x) => guess[x] !== dec[x]); if (c) { Object.keys(guess).forEach((k) => { if (guess[k] === dec[c]) delete guess[k]; }); guess[c] = dec[c]; draw(); } }),
              UI.button('Zurücksetzen', () => { Object.keys(guess).forEach((k) => delete guess[k]); draw(); }, { kind: 'subtle' }))),
          UI.card('Geheimtext (grün = deine Zuordnung)', textEl, status));
        draw();
      } },
    ],
    quiz: [
      { q: 'Wie groß ist der Schlüsselraum der monoalphabetischen Substitution?', a: ['26! ≈ 2⁸⁸', '25', '26²', '2¹²⁸'], c: 0, e: 'Jede Permutation des Alphabets ist ein Schlüssel.' },
      { q: 'Warum ist die Substitution trotz 2⁸⁸ Schlüsseln unsicher?', a: ['Sie erhält Buchstabenhäufigkeiten', 'Weil der Algorithmus öffentlich ist', 'Weil 2⁸⁸ zu klein für Brute Force ist', 'Weil sie keinen IV nutzt'], c: 0, e: 'Frequenzanalyse ist viel besser als Brute Force.' },
      { q: 'Der häufigste Buchstabe in deutschen Texten ist', a: ['E', 'N', 'A', 'S'], c: 0, e: 'E ≈ 17 %, danach N, I, S, R, A.' },
    ],
  });

  // ======================================================================
  KQ.module({
    id: 'schutzziele', world: 'B', title: 'Schutzziele, Kerckhoffs & Sicherheitsbegriffe',
    short: 'CIA-Triade, erweiterte Ziele, Kerckhoffs’ Prinzip, informationstheoretische vs. berechenbare Sicherheit.',
    keywords: 'cia vertraulichkeit integrität verfügbarkeit authentizität nichtabstreitbarkeit kerckhoffs sicherheit',
    challenges: { ziele: { title: 'Szenarien zuordnen', xp: 40 } },
    tabs: [
      { title: 'Verstehen', render(el) {
        el.append(
          UI.card('Kryptologie im Überblick',
            h('div', { class: 'grid c2' },
              h('div', null, h('b', null, 'Kryptografie'), h('p', { class: 'muted' }, 'Verfahren entwerfen, um Daten abzusichern: symmetrisch, asymmetrisch, Hashverfahren.')),
              h('div', null, h('b', null, 'Kryptanalyse'), h('p', { class: 'muted' }, 'Verfahren brechen – ohne sie könnte man Sicherheit gar nicht einschätzen (Paar/Pelzl).'))),
            h('p', null, 'Kryptoverfahren werden immer in ', h('b', null, 'Protokollen'), ' eingesetzt (TLS, SSH, WPA3) – interaktiven Algorithmen mit mehreren Parteien.')),
          UI.card('Schutzziele (BSI IT-Grundschutz)',
            UI.table(['Ziel', 'Bedeutung', 'typischer Baustein'], [
              ['<b>Vertraulichkeit</b>', 'Informationen dürfen nicht unberechtigt zur Kenntnis genommen werden', 'Verschlüsselung'],
              ['<b>Integrität</b>', 'Korrektheit von Informationen und Systemfunktion', 'MAC, Signatur'],
              ['<b>Verfügbarkeit</b>', 'autorisierte Nutzer werden nicht am Zugriff gehindert', '(kaum Kryptografie)'],
              ['Authentizität', 'Herkunft ist nachweisbar echt', 'MAC, Signatur, PKI'],
              ['Nichtabstreitbarkeit', 'Urheber kann die Handlung nicht leugnen', 'nur Signatur (nicht MAC!)'],
              ['Berechtigung (Autorisierung)', 'nur Befugte dürfen handeln', 'Zugriffskontrolle'],
            ], { wrap: false }),
            h('p', { class: 'small muted' }, 'Nicht jedes Verfahren erfüllt alle Ziele – je Situation braucht es das passende Protokoll.')),
          UI.card('Kerckhoffs’ Prinzip (1883)',
            h('blockquote', { class: 'muted', style: { borderLeft: '3px solid var(--accent)', margin: '8px 0', paddingLeft: '12px' } }, '„Es darf nicht der Geheimhaltung bedürfen und soll ohne Schaden in Feindeshand fallen können.“'),
            h('p', null, '→ Das Verfahren ist öffentlich, nur der ', h('b', null, 'Schlüssel'), ' ist geheim. Gründe: Schwachstellen öffentlicher Verfahren werden früher gefunden; mehr Analysten schaffen mehr Vertrauen; Geheimhaltung ist bei Verbreitung ohnehin nicht haltbar.'),
            h('p', null, 'Gebrochene Geheimverfahren: ', h('b', null, 'A5/1'), ' (GSM), ', h('b', null, 'KeeLoq'), ' (Autoschlüssel), ', h('b', null, 'DECT Standard Cipher'), '.')),
          UI.card('Zwei Sicherheitsbegriffe',
            h('div', { class: 'grid c2' },
              h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, 'Informationstheoretisch (perfekt)'),
                h('p', { class: 'small' }, 'Nicht brechbar – auch mit unbegrenzter Rechenleistung. Formal: Pr[Enc(k,m) = c] = 1/|C| für jedes m. Einziges praktisches Beispiel: One-Time-Pad.')),
              h('div', { class: 'card flat', style: { margin: 0 } }, h('b', null, 'Berechenbarkeitstheoretisch'),
                h('p', { class: 'small' }, 'Sicher gegen Angreifer mit polynomieller Laufzeit; Erfolgswahrscheinlichkeit vernachlässigbar. Beruht auf unbewiesenen Annahmen (P ≠ NP, P ≠ BQP) – „Standardmodell“; dazu Random-Oracle- und Generic-Group-Modell.'))),
            UI.callout('exam', 'Merksatz', 'Info-theoretisch = Beweis gegen jeden Angreifer. Berechenbar = nur gegen realistische (Polynomialzeit-)Angreifer – das ist der relevante Fall für alles außer OTP.')));
      } },
      { title: 'Challenge', render(el, ctx) {
        const opts = ['Vertraulichkeit', 'Integrität', 'Verfügbarkeit', 'Authentizität', 'Nichtabstreitbarkeit', 'Berechtigung'];
        const sc = U.shuffle([
          ['Eve liest im Café-WLAN unverschlüsselte Chatnachrichten mit.', 'Vertraulichkeit'],
          ['Mallory ändert den Betrag einer Überweisung auf dem Weg zur Bank.', 'Integrität'],
          ['Ein DDoS-Angriff legt das Prüfungsportal am Klausurtag lahm.', 'Verfügbarkeit'],
          ['Eine Phishing-Seite gibt sich als Hochschul-Login aus.', 'Authentizität'],
          ['Ein Kunde bestreitet, einen digital signierten Vertrag unterschrieben zu haben – vergeblich.', 'Nichtabstreitbarkeit'],
          ['Ein Werkstudent öffnet Personalakten, für die er keine Rechte hat.', 'Berechtigung'],
          ['Ein Angreifer kippt Bits in einer CTR-verschlüsselten Nachricht, ohne sie lesen zu können.', 'Integrität'],
          ['Der Inhalt eines Backups auf einer gestohlenen Festplatte wird ausgelesen.', 'Vertraulichkeit'],
        ]).slice(0, 6);
        const ans = {};
        const res = h('div');
        el.append(UI.card('Welches Schutzziel ist betroffen?',
          h('div', { class: 'col' }, sc.map(([t], i) => h('div', { class: 'card flat', style: { margin: 0, padding: '10px 12px' } }, h('div', { style: { marginBottom: '6px' } }, t), UI.segmented(opts, null, (v) => (ans[i] = v))))),
          h('div', { class: 'row mt' }, UI.button('Auswerten', () => {
            UI.clear(res);
            const wrong = sc.filter(([, a], i) => ans[i] !== a);
            if (!wrong.length) { res.append(UI.callout('success', 'Alle korrekt', '')); ctx.solve('ziele'); }
            else res.append(UI.callout('danger', `${wrong.length} falsch`, wrong.map(([t, a]) => `${t} → <b>${a}</b>`).join('<br>')));
          }, { kind: 'accent' })), res));
      } },
    ],
    quiz: [
      { q: 'Was besagt Kerckhoffs’ Prinzip?', a: ['Die Sicherheit darf nur vom geheimen Schlüssel abhängen', 'Der Algorithmus muss geheim bleiben', 'Schlüssel müssen 128 Bit lang sein', 'Jede Nachricht braucht einen neuen Algorithmus'], c: 0, e: 'Verfahren öffentlich, Schlüssel geheim.' },
      { q: 'Welches Verfahren ist informationstheoretisch sicher?', a: ['One-Time-Pad', 'AES-256', 'RSA-4096', 'ChaCha20'], c: 0, e: 'Alle anderen sind „nur“ berechenbarkeitstheoretisch sicher.' },
      { q: 'Welches Schutzziel kann ein MAC NICHT liefern?', a: ['Nichtabstreitbarkeit', 'Integrität', 'Authentizität des Absenders gegenüber dem Empfänger', 'Erkennen von Manipulationen'], c: 0, e: 'Beide Seiten kennen denselben Schlüssel – jeder könnte den Tag erzeugt haben. Nur Signaturen liefern Nichtabstreitbarkeit.' },
      { q: 'Welches Geheimverfahren wurde NICHT als Beispiel für gebrochene Security-by-Obscurity genannt?', a: ['AES', 'A5/1', 'KeeLoq', 'DECT Standard Cipher'], c: 0, e: 'AES ist ein offener Standard aus einem öffentlichen Wettbewerb.' },
    ],
  });
})();
