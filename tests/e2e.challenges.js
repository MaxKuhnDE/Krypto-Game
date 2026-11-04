/* End-to-End-Test: rendert alle Stationen und löst eine Auswahl an Challenges
 * über die Oberfläche, wie ein Spieler es tun würde.
 * Voraussetzung: Playwright mit Chromium (npm i -D playwright && npx playwright install chromium).
 * Aufruf: node tests/e2e.challenges.js */
'use strict';
const path = require('node:path');
const { chromium } = require('playwright');

const APP = 'file://' + path.join(__dirname, '..', 'app', 'index.html');
let failed = 0;
const ok = (name, cond, extra = '') => { console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' – ' + extra : ''}`); if (!cond) failed++; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', (d) => d.dismiss());
  await page.goto(APP);
  await page.evaluate(() => { localStorage.clear(); KQ.state.reset(); });

  const go = async (id, tab) => { await page.evaluate(([i, t]) => { location.hash = `#/m/${i}/${t}`; }, [id, tab]); await page.waitForTimeout(150); };
  const solved = (m, c) => page.evaluate(([a, b]) => KQ.state.isSolved(a, b), [m, c]);
  // Antwortfeld finden, dessen Beschriftung `label` enthält, ausfüllen und prüfen
  const answer = (label, value) => page.evaluate(([l, v]) => {
    const row = [...document.querySelectorAll('.tab-body .row')].find((r) => r.firstElementChild && r.firstElementChild.tagName === 'SPAN' && r.firstElementChild.innerHTML.includes(l) && r.querySelector('input'));
    if (!row) throw new Error('Antwortfeld nicht gefunden: ' + l);
    row.querySelector('input').value = v;
    [...row.querySelectorAll('button')].find((b) => b.textContent.includes('Prüfen')).click();
  }, [label, String(value)]);
  // Schlüssel-Wert-Paare; bei mehrfach vorkommenden Schlüsseln gewinnt das erste Vorkommen
  const kv = () => page.evaluate(() => { const o = {}; document.querySelectorAll('.tab-body .kv').forEach((k) => { const c = [...k.children]; for (let i = 0; i + 1 < c.length; i += 2) { const key = c[i].textContent.trim(); if (!(key in o)) o[key] = c[i + 1].textContent.trim(); } }); return o; });
  const click = (txt) => page.evaluate((t) => { const b = [...document.querySelectorAll('.tab-body button')].find((x) => x.textContent.includes(t)); if (!b) throw new Error('Button fehlt: ' + t); b.click(); }, txt);

  console.log('Alle Stationen rendern');
  const mods = await page.evaluate(() => KQ.modules.map((m) => [m.id, m.tabs.length + (m.quiz.length ? 1 : 0)]));
  let renderErr = 0;
  for (const [id, n] of mods) for (let t = 0; t < n; t++) {
    await go(id, t);
    const bad = await page.evaluate(() => [...document.querySelectorAll('.tab-body .callout.danger .co-title')].some((c) => c.textContent.includes('Fehler in dieser Station')));
    const stray = await page.evaluate(() => { const w = document.createTreeWalker(document.querySelector('.page'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/^(null|undefined|NaN)+$/.test(n.nodeValue.trim())) return true; return false; });
    if (bad || stray) { renderErr++; console.log('    Problem in', id, t, stray ? '(Text null/undefined/NaN sichtbar)' : ''); }
  }
  ok(`${mods.length} Stationen, alle Tabs ohne Fehler`, renderErr === 0);

  console.log('Challenges lösen');
  // Euklid: d = e^-1 mod phi
  await go('euklid', 2);
  {
    const [e, phi] = await page.evaluate(() => { const m = /Gegeben e = (\d+) und φ\(n\) = (\d+)/.exec(document.querySelector('.tab-body').innerText); return [m[1], m[2]]; });
    const d = await page.evaluate(([a, b]) => KQ.nt.modInv(BigInt(a), BigInt(b)).toString(), [e, phi]);
    await answer('d =', d);
    ok('Euklid: RSA-d', await solved('euklid', 'inverse'));
  }
  // RSA Probedivision + ggT
  await go('rsa', 2);
  {
    const v = await kv();
    const m1 = await page.evaluate(([n, e, c]) => { const NT = KQ.nt; const [p, q] = NT.trialDivision(BigInt(n)).factors; const d = NT.modInv(BigInt(e), (p - 1n) * (q - 1n)); return NT.modPow(BigInt(c), d, BigInt(n)).toString(); }, [v['n'], v['e'], v['c']]);
    await answer('m =', m1);
    ok('RSA: Probedivision', await solved('rsa', 'trial'));
    const m2 = await page.evaluate(([n1, n2, e, c]) => { const NT = KQ.nt; const p = NT.gcd(BigInt(n1), BigInt(n2)); const q = BigInt(n1) / p; const d = NT.modInv(BigInt(e), (p - 1n) * (q - 1n)); return NT.modPow(BigInt(c), d, BigInt(n1)).toString(); }, [v['n₁'], v['n₂'], v['e (beide)'], v['c (an n₁)']]);
    await page.evaluate((val) => { const rows = [...document.querySelectorAll('.tab-body .row')].filter((r) => r.firstElementChild && r.firstElementChild.innerHTML === 'm =' && r.querySelector('input')); rows[1].querySelector('input').value = val; [...rows[1].querySelectorAll('button')].find((b) => b.textContent.includes('Prüfen')).click(); }, m2);
    ok('RSA: ggT-Angriff', await solved('rsa', 'gcd'));
    await page.waitForTimeout(1500);
    const c3 = await page.evaluate(() => { const k = [...document.querySelectorAll('.tab-body .kv')].find((x) => x.textContent.includes('n (512 Bit)')); const c = [...k.children]; return c[c.length - 1].textContent.trim(); });
    const word = await page.evaluate((c) => KQ.nt.intToText(KQ.nt.iroot(BigInt(c), 3n)), c3);
    await answer('Wort =', word);
    ok('RSA: Kubikwurzel', await solved('rsa', 'cube'), word);
  }
  // CBC-Bitflip
  await go('bitflip', 1);
  await page.evaluate(() => {
    const ins = [...document.querySelectorAll('.tab-body .bytes input')];
    const P = KQ.util.utf8('BETRAG:00010 EUR'), P2 = KQ.util.utf8('BETRAG:99999 EUR');
    ins.forEach((inp, i) => { inp.value = KQ.util.hex8(parseInt(inp.value, 16) ^ P[i] ^ P2[i]); inp.dispatchEvent(new Event('change')); });
  });
  await click('An die Bank senden');
  ok('CBC-Bitflip: 99999 EUR', await solved('bitflip', 'amount'));
  // CBC-MAC-Fälschung
  await go('mac', 2);
  {
    const v = await kv();
    const hexOf = (s) => s.split(/\s/)[0];
    const forged = await page.evaluate(([m1, t1, m2]) => { const U = KQ.util; return U.hex(U.concat(U.fromHex(m1), U.xor(U.fromHex(m2), U.fromHex(t1)))); }, [hexOf(v['m₁']), v['t₁'], hexOf(v['m₂'])]);
    await page.evaluate(([m, t]) => { document.querySelector('.tab-body textarea').value = m; document.querySelector('.tab-body input[placeholder="Tag (Hex)"]').value = t; }, [forged, v['t₂']]);
    await click('Bestellung einreichen');
    ok('CBC-MAC: Längenangriff', await solved('mac', 'forge'));
  }
  // Length-Extension: Schlüssellängen durchprobieren
  await go('lengthext', 1);
  for (let k = 8; k <= 20 && !(await solved('lengthext', 'forge')); k++) {
    await page.evaluate((kk) => { const r = document.querySelector('.tab-body input[type=range]'); r.value = kk; r.dispatchEvent(new Event('input')); }, k);
    await click('An den Server senden');
  }
  ok('SHA-256 Length-Extension', await solved('lengthext', 'forge'));
  // Merkle-Damgård ohne Padding
  await go('merkle', 2);
  await page.evaluate(() => {
    const X = /Nachricht (\S+) ‖ (\S+) ‖ (\S+) ‖ (\S+) mit/.exec(document.querySelector('.tab-body').innerText.replace(/\n/g, ' ')).slice(1).map((x) => parseInt(x, 16));
    const y2 = KQ.toys.compress16(X[0], X[1]);
    const ins = [...document.querySelectorAll('.tab-body .field input')];
    [y2, X[2], X[3]].forEach((v, i) => (ins[i].value = KQ.util.hex16(v)));
  });
  await click('Prüfen');
  ok('Merkle-Damgård: Kollision ohne Längenblock', await solved('merkle', 'nopad'));
  // Schnorr: Extraktor + Nonce-Reuse
  await go('schnorr', 3);
  {
    const v = await kv();
    const q = 1019n;
    const x1 = await page.evaluate(([a, b]) => { const NT = KQ.nt, q = 1019n; const [r1, s1] = a.replace(/[()]/g, '').split(',').map((t) => BigInt(t.trim())); const [r2, s2] = b.replace(/[()]/g, '').split(',').map((t) => BigInt(t.trim())); return NT.mod((s1 - s2) * NT.modInv(NT.mod(r1 - r2, q), q), q).toString(); }, [v['(r₁, s₁)'], v['(r₂, s₂)']]);
    await answer('x =', x1);
    ok('Schnorr: Extraktor', await solved('schnorr', 'extract'));
    const keys = Object.keys(v).filter((k) => k.startsWith('Signatur für'));
    const x2 = await page.evaluate(([sa, sb, rr]) => { const NT = KQ.nt, q = 1019n; const s1 = BigInt(/s = (\d+)/.exec(sa)[1]), s2 = BigInt(/s = (\d+)/.exec(sb)[1]); const [r1, r2] = rr.split('bzw.').map((t) => BigInt(t.trim())); return NT.mod((s1 - s2) * NT.modInv(NT.mod(r1 - r2, q), q), q).toString(); }, [v[keys[0]], v[keys[1]], v['r = H(I, m) mod q']]);
    await page.evaluate((val) => { const rows = [...document.querySelectorAll('.tab-body .row')].filter((r) => r.firstElementChild && r.firstElementChild.innerHTML === 'x =' && r.querySelector('input')); rows[1].querySelector('input').value = val; [...rows[1].querySelectorAll('button')].find((b) => b.textContent.includes('Prüfen')).click(); }, x2);
    ok('Schnorr: Nonce-Reuse', await solved('schnorr', 'nonce'));
    void q;
  }
  // ElGamal: r wiederverwendet
  await go('elgamal', 2);
  {
    const v = await kv();
    const m2 = await page.evaluate(([a, b, m1]) => { const NT = KQ.nt, p = 1019n; const e1 = BigInt(a.replace(/[()]/g, '').split(',')[1]), e2 = BigInt(b.replace(/[()]/g, '').split(',')[1]); return NT.mod(e2 * NT.modInv(e1, p) * BigInt(m1), p).toString(); }, [v['(c₁, c₂) für m₁'], v["(c₁′, c₂′) für m₂"], v['m₁ (bekannt)']]);
    await page.evaluate((val) => { const row = [...document.querySelectorAll('.tab-body .row')].find((r) => r.firstElementChild && r.firstElementChild.innerHTML === 'm₂ =' && r.querySelector('input')); row.querySelector('input').value = val; [...row.querySelectorAll('button')].find((b) => b.textContent.includes('Prüfen')).click(); }, m2);
    ok('ElGamal: r-Wiederverwendung', await solved('elgamal', 'reuse'));
  }
  // Poly-UHF: Nullstelle des linearen Differenzpolynoms
  await go('polyuhf', 2);
  {
    const K = await page.evaluate(() => { const m = /Δ\(K\) = (\d+)·K \+ (\d+)/.exec(document.querySelector('.tab-body').innerText); const NT = KQ.nt; return NT.modN(-(+m[2]) * NT.invN(+m[1], 101), 101); });
    await answer('K =', K);
    ok('Poly-UHF: Kollisionsschlüssel', await solved('polyuhf', 'root'));
  }
  // Textbook-RSA-Signatur fälschen
  await go('signaturen', 1);
  {
    const target = await page.evaluate(() => /m\* = (\d+)\./.exec(document.querySelector('.tab-body').innerText)[1]);
    const t = +target; let a = 2; while (t % a) a++; const b = t / a;
    for (const m of [a, b]) { await page.evaluate((mm) => { document.querySelector('.tab-body input[placeholder="m (Zahl)"]').value = mm; }, String(m)); await click('Sign-Orakel'); }
    const sig = await page.evaluate(() => { const lines = [...document.querySelectorAll('.tab-body .mono.small div')].map((d) => d.textContent); const s = lines.map((l) => BigInt(/s = (\d+)/.exec(l)[1])); const n = BigInt([...document.querySelectorAll('.tab-body .kv div')][3].textContent); return KQ.nt.mod(s[0] * s[1], n).toString(); });
    await page.evaluate(([m, s]) => { document.querySelector('.tab-body input[placeholder="m"]').value = m; document.querySelector('.tab-body input[placeholder="s"]').value = s; }, [target, sig]);
    await click('Verify');
    ok('RSA-Signatur: Homomorphie-Fälschung', await solved('signaturen', 'forge'));
  }
  // Arena Level 1: PRG s‖s – 10 Runden spielen
  await go('arena', 1);
  for (let r = 0; r < 10; r++) {
    await click('PRG.SAMPLE()'); await click('PRG.SAMPLE()');
    const real = await page.evaluate(() => [...document.querySelectorAll('.tab-body .mono.small b')].every((b) => { const [x, y] = b.textContent.split(' '); return x === y; }));
    await page.evaluate((isReal) => { const bs = [...document.querySelectorAll('.tab-body .btn.accent')]; bs.find((b) => b.textContent === (isReal ? 'Real' : 'Zufall')).click(); }, real);
    if (r < 9) await click('Nächste Runde');
  }
  ok('Arena: PRG-Unterscheider gewinnt', await solved('arena', 'prg'));
  // IND-CPA gegen ECB
  await go('indcpa', 1);
  for (let r = 0; r < 10; r++) {
    await click('Enc-Orakel');
    const real = await page.evaluate(() => { const t = [...document.querySelectorAll('.tab-body .mono.small div')].pop().textContent; const blocks = t.split('→ ')[1].trim().split(' '); return blocks[0] === blocks[1]; });
    await page.evaluate((isReal) => { [...document.querySelectorAll('.tab-body .btn.accent')].find((b) => b.textContent === (isReal ? 'Real' : 'Zufall')).click(); }, real);
    if (r < 9) await click('Nächste Runde');
  }
  ok('IND-CPA: ECB gebrochen', await solved('indcpa', 'ecb'));
  // Game Hopping: CBC-Beweis (sortieren + begründen)
  await go('gamehopping', 1);
  {
    const want = ['Zwischenwert benennen', 'PRF durch Dictionary ersetzen', 'bad-Flag instrumentieren', 'immer frisch ziehen'];
    for (let guard = 0; guard < 30; guard++) {
      const names = await page.evaluate(() => [...document.querySelectorAll('.tab-body .hop-item .lib-head')].map((x) => x.textContent));
      const mid = names.slice(1, -1);
      const i = mid.findIndex((n, k) => n !== want[k]);
      if (i < 0) break;
      const pos = mid.indexOf(want[i]) + 1; // Position im Gesamtarray
      await page.evaluate((p) => { const items = document.querySelectorAll('.tab-body .hop-item'); [...items[p].querySelectorAll('button')].find((b) => b.textContent === '↑').click(); }, pos);
    }
    await page.evaluate(() => {
      const links = [['≡', 'syn'], ['≈', 'prf'], ['≡', 'syn'], ['≈', 'bday'], ['≡', 'syn']];
      const segs = document.querySelectorAll('.tab-body .segmented'), sels = document.querySelectorAll('.tab-body select');
      links.forEach(([r, w], i) => { [...segs[i].querySelectorAll('button')].find((b) => b.textContent === r).click(); sels[i].value = w; sels[i].dispatchEvent(new Event('change')); });
    });
    await click('Beweis prüfen');
    ok('Game Hopping: CBC-CPA-Beweis', await solved('gamehopping', 'cbc'));
  }
  // XP/Rang/Erfolge
  const st = await page.evaluate(() => ({ xp: KQ.state.get().xp, badges: Object.keys(KQ.state.get().badges), rank: KQ.state.rank().name }));
  ok('XP, Rang und Erfolge werden vergeben', st.xp > 500 && st.badges.includes('first'), `${st.xp} XP, Rang ${st.rank}, Erfolge: ${st.badges.join(', ')}`);
  ok('keine JS-Fehler in der Konsole', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.evaluate(() => { KQ.state.reset(); });
  await browser.close();
  console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : '\nAlle E2E-Prüfungen bestanden.');
  process.exitCode = failed ? 1 : 0;
})();
