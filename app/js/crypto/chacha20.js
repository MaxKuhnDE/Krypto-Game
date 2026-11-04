/* KryptoQuest – ChaCha20 (RFC 8439) mit Trace für Quarterround,
 * Spalten-/Diagonalrunden und finale Addition. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const U = KQ.util;
  const C = (KQ.chacha = {});

  C.CONST = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]; // "expand 32-byte k"
  C.COLUMN_QR = [[0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15]];
  C.DIAG_QR = [[0, 5, 10, 15], [1, 6, 11, 12], [2, 7, 8, 13], [3, 4, 9, 14]];

  const le32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  /** Quarterround auf 4 Wörtern; liefert neue Werte und die 12 Teilschritte */
  C.quarterRound = (a, b, c, d) => {
    const steps = [];
    const rec = (label, reg, val) => steps.push({ label, reg, val: val >>> 0 });
    a = (a + b) >>> 0; rec('a ← a + b', 'a', a);
    d = (d ^ a) >>> 0; rec('d ← d ⊕ a', 'd', d);
    d = U.rotl32(d, 16); rec('d ← d ⋘ 16', 'd', d);
    c = (c + d) >>> 0; rec('c ← c + d', 'c', c);
    b = (b ^ c) >>> 0; rec('b ← b ⊕ c', 'b', b);
    b = U.rotl32(b, 12); rec('b ← b ⋘ 12', 'b', b);
    a = (a + b) >>> 0; rec('a ← a + b', 'a', a);
    d = (d ^ a) >>> 0; rec('d ← d ⊕ a', 'd', d);
    d = U.rotl32(d, 8); rec('d ← d ⋘ 8', 'd', d);
    c = (c + d) >>> 0; rec('c ← c + d', 'c', c);
    b = (b ^ c) >>> 0; rec('b ← b ⊕ c', 'b', b);
    b = U.rotl32(b, 7); rec('b ← b ⋘ 7', 'b', b);
    return { out: [a, b, c, d], steps };
  };

  /** Anfangszustand: Konstanten | Schlüssel (8 Wörter) | Zähler | Nonce (3 Wörter) */
  C.initState = (key, counter, nonce) => {
    const s = C.CONST.slice();
    for (let i = 0; i < 8; i++) s.push(le32(key, 4 * i));
    s.push(counter >>> 0);
    for (let i = 0; i < 3; i++) s.push(le32(nonce, 4 * i));
    return s;
  };

  /** Block-Funktion. trace=true liefert den Zustand nach jeder Halbrunde. */
  C.block = (key, counter, nonce, trace = false) => {
    const init = C.initState(key, counter, nonce);
    const s = init.slice();
    const rounds = [];
    const applyQR = (idx) => {
      const r = C.quarterRound(s[idx[0]], s[idx[1]], s[idx[2]], s[idx[3]]);
      idx.forEach((k, j) => (s[k] = r.out[j]));
    };
    for (let i = 0; i < 10; i++) {
      C.COLUMN_QR.forEach(applyQR);
      if (trace) rounds.push({ kind: 'Spaltenrunde', n: 2 * i + 1, state: s.slice() });
      C.DIAG_QR.forEach(applyQR);
      if (trace) rounds.push({ kind: 'Diagonalrunde', n: 2 * i + 2, state: s.slice() });
    }
    const fin = s.map((x, i) => (x + init[i]) >>> 0);
    const out = new Uint8Array(64);
    fin.forEach((w, i) => {
      out[4 * i] = w & 0xff; out[4 * i + 1] = (w >>> 8) & 0xff;
      out[4 * i + 2] = (w >>> 16) & 0xff; out[4 * i + 3] = w >>> 24;
    });
    return trace ? { init, rounds, beforeAdd: s.slice(), final: fin, keystream: out } : out;
  };

  C.encrypt = (key, nonce, counter, data) => {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 64) {
      const ks = C.block(key, counter + i / 64, nonce);
      for (let j = 0; j < 64 && i + j < data.length; j++) out[i + j] = data[i + j] ^ ks[j];
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
