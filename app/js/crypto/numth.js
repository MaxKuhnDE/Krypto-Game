/* KryptoQuest – Zahlentheorie: modulare Arithmetik, (erweiterter) Euklid,
 * Square-and-Multiply, Primtests, Ordnung/Erzeuger, CRT, Legendre,
 * diskreter Logarithmus (Brute Force, Pohlig-Hellman), ganzzahlige Wurzeln.
 * Alle Funktionen arbeiten mit BigInt; Varianten mit Suffix N mit Number. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const NT = (KQ.nt = {});

  const B = (x) => (typeof x === 'bigint' ? x : BigInt(x));
  NT.B = B;

  NT.mod = (a, n) => { a = B(a); n = B(n); const r = a % n; return r < 0n ? r + n : r; };

  NT.gcd = (a, b) => { a = B(a); b = B(b); if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) [a, b] = [b, a % b]; return a; };

  /** Euklid mit allen Schritten (x = q·y + r) */
  NT.euclidSteps = (x, y) => {
    x = B(x); y = B(y);
    const steps = [];
    while (y > 0n) {
      const q = x / y, r = x % y;
      steps.push({ x, y, q, r });
      [x, y] = [y, r];
    }
    return { gcd: x, steps };
  };

  /** Erweiterter Euklid (iterativ, Tabellenform): liefert g, a, b mit a·x + b·y = g */
  NT.egcd = (x, y) => {
    x = B(x); y = B(y);
    let [r0, r1] = [x, y], [s0, s1] = [1n, 0n], [t0, t1] = [0n, 1n];
    const rows = [{ r: r0, s: s0, t: t0, q: null }, { r: r1, s: s1, t: t1, q: null }];
    while (r1 !== 0n) {
      const q = r0 / r1;
      [r0, r1] = [r1, r0 - q * r1];
      [s0, s1] = [s1, s0 - q * s1];
      [t0, t1] = [t1, t0 - q * t1];
      rows[rows.length - 1].q = q;
      rows.push({ r: r1, s: s1, t: t1, q: null });
    }
    return { g: r0, a: s0, b: t0, rows };
  };

  NT.modInv = (a, n) => {
    a = NT.mod(a, n); n = B(n);
    const { g, a: s } = NT.egcd(a, n);
    if (g !== 1n) return null;
    return NT.mod(s, n);
  };

  NT.modPow = (b, e, n) => {
    b = NT.mod(b, n); e = B(e); n = B(n);
    if (n === 1n) return 0n;
    if (e < 0n) { const inv = NT.modInv(b, n); if (inv === null) return null; b = inv; e = -e; }
    let r = 1n;
    while (e > 0n) {
      if (e & 1n) r = (r * b) % n;
      b = (b * b) % n;
      e >>= 1n;
    }
    return r;
  };

  /** Square-and-Multiply von links nach rechts mit Rechenweg */
  NT.sqmTrace = (b, e, n) => {
    b = NT.mod(b, n); e = B(e); n = B(n);
    const bits = e.toString(2);
    const steps = [];
    let r = 1n;
    for (let i = 0; i < bits.length; i++) {
      const sq = (r * r) % n;
      steps.push({ bit: bits[i], op: 'Q', before: r, after: sq });
      r = sq;
      if (bits[i] === '1') {
        const m = (r * b) % n;
        steps.push({ bit: bits[i], op: 'M', before: r, after: m });
        r = m;
      }
    }
    return { bits, steps, result: r };
  };

  NT.isPrime = (n) => {
    n = B(n);
    if (n < 2n) return false;
    const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
    for (const p of small) { if (n === p) return true; if (n % p === 0n) return false; }
    let d = n - 1n, s = 0;
    while ((d & 1n) === 0n) { d >>= 1n; s++; }
    outer: for (const a of small) {
      let x = NT.modPow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      for (let i = 1; i < s; i++) {
        x = (x * x) % n;
        if (x === n - 1n) continue outer;
      }
      return false;
    }
    return true; // deterministisch für n < 3.3·10^24
  };

  /** Probedivision mit Protokoll (für kleine n) */
  NT.trialDivision = (n, limit = 2000000) => {
    n = B(n);
    const factors = [];
    let tried = 0;
    let m = n;
    for (let p = 2n; p * p <= m; p += p === 2n ? 1n : 2n) {
      tried++;
      if (tried > limit) break;
      while (m % p === 0n) { factors.push(p); m /= p; }
    }
    if (m > 1n) factors.push(m);
    return { factors, tried };
  };

  NT.factorize = (n) => {
    const f = NT.trialDivision(n).factors;
    const map = new Map();
    f.forEach((p) => map.set(p, (map.get(p) || 0) + 1));
    return [...map.entries()].map(([p, e]) => ({ p, e }));
  };

  NT.phi = (n) => {
    n = B(n);
    let r = n;
    for (const { p } of NT.factorize(n)) r = (r / p) * (p - 1n);
    return r;
  };

  /** Ordnung von g in Z*_n */
  NT.order = (g, n) => {
    g = NT.mod(g, n); n = B(n);
    if (NT.gcd(g, n) !== 1n) return null;
    const ph = NT.phi(n);
    let ord = ph;
    for (const { p } of NT.factorize(ph)) {
      while (ord % p === 0n && NT.modPow(g, ord / p, n) === 1n) ord /= p;
    }
    return ord;
  };

  /** Erzeuger-Test für Z*_p: g^((p-1)/q) ≠ 1 für alle Primteiler q von p-1 */
  NT.generatorTest = (g, p) => {
    p = B(p);
    const n = p - 1n;
    const tests = NT.factorize(n).map(({ p: q }) => ({ q, exp: n / q, val: NT.modPow(g, n / q, p) }));
    return { tests, isGenerator: tests.every((t) => t.val !== 1n) };
  };

  NT.legendre = (a, p) => {
    const r = NT.modPow(a, (B(p) - 1n) / 2n, p);
    return r === 0n ? 0 : r === 1n ? 1 : -1;
  };

  /** Chinesischer Restsatz für Paare (r_i, m_i) mit paarweise teilerfremden m_i */
  NT.crt = (pairs) => {
    let x = 0n, M = 1n;
    for (const [, m] of pairs) M *= B(m);
    for (const [r, m] of pairs) {
      const Mi = M / B(m);
      x += B(r) * Mi * NT.modInv(Mi, m);
    }
    return NT.mod(x, M);
  };

  /** Diskreter Logarithmus per Brute Force: g^x = h mod p, x in [0, ord) */
  NT.dlogBrute = (g, h, p, ord) => {
    g = NT.mod(g, p); h = NT.mod(h, p); p = B(p);
    ord = ord ? B(ord) : p - 1n;
    let cur = 1n;
    for (let x = 0n; x < ord; x++) {
      if (cur === h) return { x, tries: Number(x) + 1 };
      cur = (cur * g) % p;
    }
    return { x: null, tries: Number(ord) };
  };

  /** Pohlig-Hellman: dlog in jeder Primpotenz-Untergruppe, dann CRT */
  NT.pohligHellman = (g, h, p) => {
    p = B(p);
    const n = p - 1n;
    const parts = [];
    for (const { p: q, e } of NT.factorize(n)) {
      const qe = q ** BigInt(e);
      const gi = NT.modPow(g, n / qe, p);
      const hi = NT.modPow(h, n / qe, p);
      const { x, tries } = NT.dlogBrute(gi, hi, p, qe);
      parts.push({ q, e, qe, gi, hi, x, tries });
    }
    const x = NT.crt(parts.map((t) => [t.x, t.qe]));
    return { x, parts };
  };

  /** Ganzzahlige k-te Wurzel (floor) per Newton */
  NT.iroot = (n, k) => {
    n = B(n); k = B(k);
    if (n < 2n) return n;
    let x = 1n << (BigInt(n.toString(2).length) / k + 1n);
    while (true) {
      const y = ((k - 1n) * x + n / x ** (k - 1n)) / k;
      if (y >= x) break;
      x = y;
    }
    while (x ** k > n) x--;
    while ((x + 1n) ** k <= n) x++;
    return x;
  };

  /** Zufälliges BigInt in [lo, hi] */
  NT.randBetween = (lo, hi) => {
    lo = B(lo); hi = B(hi);
    const range = hi - lo + 1n;
    const bytes = Math.ceil(range.toString(16).length / 2) + 8;
    const buf = new Uint8Array(bytes);
    root.crypto.getRandomValues(buf);
    let x = 0n;
    for (const b of buf) x = (x << 8n) | BigInt(b);
    return lo + (x % range);
  };

  NT.randomPrime = (bits) => {
    while (true) {
      let x = NT.randBetween(1n << BigInt(bits - 1), (1n << BigInt(bits)) - 1n) | 1n;
      if (NT.isPrime(x)) return x;
    }
  };

  /** Text <-> Zahl (Big-Endian-Bytes) */
  NT.textToInt = (s) => {
    let x = 0n;
    for (const b of KQ.util.utf8(s)) x = (x << 8n) | BigInt(b);
    return x;
  };
  NT.intToText = (x) => {
    x = B(x);
    const bytes = [];
    while (x > 0n) { bytes.unshift(Number(x & 0xffn)); x >>= 8n; }
    return KQ.util.fromUtf8(Uint8Array.from(bytes));
  };

  // ---------- Number-Varianten für kleine Zahlen (UI) ----------
  NT.modN = (a, n) => ((a % n) + n) % n;
  NT.powN = (b, e, n) => Number(NT.modPow(b, e, n));
  NT.gcdN = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  NT.invN = (a, n) => { const r = NT.modInv(a, n); return r === null ? null : Number(r); };
  NT.isPrimeN = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  NT.phiN = (n) => { let c = 0; for (let a = 1; a <= n; a++) if (NT.gcdN(a, n) === 1) c++; return c; };
  NT.orderN = (g, n) => {
    if (NT.gcdN(g, n) !== 1) return null;
    let x = NT.modN(g, n), k = 1;
    while (x !== 1) { x = (x * g) % n; k++; if (k > n) return null; }
    return k;
  };
  NT.primesUpTo = (n) => {
    const s = new Uint8Array(n + 1), out = [];
    for (let i = 2; i <= n; i++) {
      if (!s[i]) { out.push(i); for (let j = i * i; j <= n; j += i) s[j] = 1; }
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
