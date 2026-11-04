/* KryptoQuest – Hilfsfunktionen für Bytes, Bits, Hex und Zufall.
 * Klassisches Script (kein ES-Modul), damit die App auch per Doppelklick
 * auf index.html (file://) und in Node-Tests läuft. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const U = (KQ.util = {});

  U.hex = (bytes, sep = '') =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(sep);

  U.fromHex = (str) => {
    const s = String(str).replace(/[^0-9a-fA-F]/g, '');
    if (s.length % 2) throw new Error('Hex-String hat ungerade Länge');
    const out = new Uint8Array(s.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  };

  U.isHex = (str) => /^[0-9a-fA-F\s]*$/.test(str) && str.replace(/\s/g, '').length % 2 === 0;

  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8', { fatal: false });
  U.utf8 = (s) => enc.encode(s);
  U.fromUtf8 = (b) => dec.decode(b);

  /** Bytes als druckbare Zeichen (nicht-druckbare als ·) */
  U.printable = (bytes) =>
    Array.from(bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·')).join('');

  U.xor = (a, b) => {
    const n = Math.min(a.length, b.length);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = a[i] ^ b[i];
    return out;
  };

  U.concat = (...arrs) => {
    const len = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  };

  U.equal = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  U.randomBytes = (n) => {
    const out = new Uint8Array(n);
    root.crypto.getRandomValues(out);
    return out;
  };

  U.randInt = (lo, hi) => {
    // gleichverteilt in [lo, hi]
    const range = hi - lo + 1;
    const buf = new Uint32Array(1);
    const lim = Math.floor(0x100000000 / range) * range;
    let x;
    do { root.crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
    return lo + (x % range);
  };

  U.pick = (arr) => arr[U.randInt(0, arr.length - 1)];

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = U.randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.bits = (byte, n = 8) => byte.toString(2).padStart(n, '0');

  U.bytesToBits = (bytes) => Array.from(bytes, (b) => U.bits(b)).join('');

  U.popcount = (x) => {
    let c = 0;
    while (x) { c += x & 1; x >>>= 1; }
    return c;
  };

  U.hamming = (a, b) => {
    let d = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) d += U.popcount(a[i] ^ b[i]);
    return d;
  };

  U.rotl32 = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  U.rotr32 = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
  U.rotl16 = (x, n) => ((x << n) | (x >>> (16 - n))) & 0xffff;
  U.rotr16 = (x, n) => ((x >>> n) | (x << (16 - n))) & 0xffff;
  U.rotl8 = (x, n) => ((x << n) | (x >>> (8 - n))) & 0xff;

  U.hex32 = (x) => (x >>> 0).toString(16).padStart(8, '0');
  U.hex16 = (x) => (x & 0xffff).toString(16).padStart(4, '0');
  U.hex8 = (x) => (x & 0xff).toString(16).padStart(2, '0');

  /** Deterministischer PRNG (mulberry32) – NUR für reproduzierbare Rätsel,
   *  ausdrücklich nicht kryptografisch sicher. */
  U.seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** Zufällige Permutation von 0..n-1 (optional mit Seed) */
  U.permutation = (n, rng) => {
    const r = rng || (() => U.randInt(0, 0x7fffffff) / 0x80000000);
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  };

  U.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.chunk = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  U.fmtBig = (x) => {
    const s = x.toString();
    return s.length > 40 ? s.slice(0, 18) + '…' + s.slice(-18) + ` (${s.length} Stellen)` : s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
