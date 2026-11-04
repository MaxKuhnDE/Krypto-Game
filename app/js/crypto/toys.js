/* KryptoQuest – Spielzeug-Primitive für die Lernspiele: kleine Feistel-Chiffre,
 * kleine Permutationen, Sponge, Even-Mansour, LCG, Mini-Kompressionsfunktion.
 * Bewusst klein (8/16 Bit), damit man alles nachrechnen und angreifen kann. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const U = KQ.util;
  const T = (KQ.toys = {});

  // ---------- 8-Bit-Rundenfunktion (PRF-artig, nicht invertierbar) ----------
  const RF_TABLE = (() => {
    const r = U.seeded(0xc0ffee);
    return Array.from({ length: 256 }, () => Math.floor(r() * 256));
  })();
  /** F(k, x): 8 Bit -> 8 Bit, absichtlich NICHT bijektiv */
  T.roundF = (k, x) => RF_TABLE[(x ^ k) & 0xff] ^ U.rotl8(x & k, 3);

  /** Feistel mit 8-Bit-Hälften; keys = Array von Rundenschlüsseln */
  T.feistelEnc = (L, R, keys, F = T.roundF, trace = false) => {
    const rounds = [];
    for (let i = 0; i < keys.length; i++) {
      const f = F(keys[i], R);
      const nL = R, nR = L ^ f;
      if (trace) rounds.push({ i, L, R, k: keys[i], f, nL, nR });
      L = nL; R = nR;
    }
    return trace ? { L, R, rounds } : [L, R];
  };

  T.feistelDec = (L, R, keys, F = T.roundF, trace = false) => {
    const rounds = [];
    for (let i = keys.length - 1; i >= 0; i--) {
      // aus (L', R') = (R, L ⊕ F(k,R)) folgt R = L', L = R' ⊕ F(k, L')
      const f = F(keys[i], L);
      const pR = L, pL = R ^ f;
      if (trace) rounds.push({ i, L, R, k: keys[i], f, nL: pL, nR: pR });
      L = pL; R = pR;
    }
    return trace ? { L, R, rounds } : [L, R];
  };

  // ---------- Kleine Permutationen ----------
  T.randomPerm = (bits, seed) => {
    const n = 1 << bits;
    const p = U.permutation(n, seed !== undefined ? U.seeded(seed) : undefined);
    const inv = new Array(n);
    p.forEach((v, i) => (inv[v] = i));
    return { fwd: (x) => p[x], inv: (y) => inv[y], table: p };
  };

  // ---------- Even-Mansour (8 Bit) ----------
  T.evenMansour = (perm, K) => ({
    enc: (x) => perm.fwd((K ^ x) & 0xff) ^ K,
    dec: (y) => perm.inv((K ^ y) & 0xff) ^ K,
  });

  // ---------- Toy-Sponge: Zustand 16 Bit = rate (r Bit, oben) + capacity ----------
  T.sponge = (perm16, rateBits = 8) => {
    const capBits = 16 - rateBits;
    const rateMask = ((1 << rateBits) - 1) << capBits;
    return {
      rateBits, capBits,
      /** absorbiert Blöcke (je rateBits), quetscht outBlocks heraus; mit Trace */
      run(blocks, outBlocks) {
        let s = 0;
        const trace = [{ phase: 'start', state: s }];
        for (const m of blocks) {
          s ^= (m << capBits) & rateMask;
          trace.push({ phase: 'absorb-xor', m, state: s });
          s = perm16.fwd(s);
          trace.push({ phase: 'absorb-f', state: s });
        }
        const out = [];
        for (let i = 0; i < outBlocks; i++) {
          if (i > 0) { s = perm16.fwd(s); trace.push({ phase: 'squeeze-f', state: s }); }
          const z = (s & rateMask) >>> capBits;
          out.push(z);
          trace.push({ phase: 'squeeze-out', z, state: s });
        }
        return { out, trace };
      },
    };
  };

  // ---------- Linearer Kongruenzgenerator ----------
  T.lcg = (A, B, mod, seed) => {
    let s = seed;
    return () => (s = (A * s + B) % mod);
  };

  // ---------- Mini-Kompressionsfunktion: 16 Bit × 16 Bit -> 16 Bit ----------
  // h(y, x) = AES-artig gemischt; nur für Merkle-Damgård-Demos
  T.compress16 = (y, x) => {
    let v = ((y << 16) | x) >>> 0;
    for (let r = 0; r < 4; r++) {
      v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d) >>> 0;
      v = Math.imul(v ^ (v >>> 12), 0x297a2d39) >>> 0;
      v = (v ^ (v >>> 15)) >>> 0;
    }
    return (v ^ (v >>> 16)) & 0xffff;
  };

  /** Naive Verkettung ohne Längen-Padding: Y1 = X1, Yi+1 = h(Yi, Xi+1) */
  T.chainNoPad = (blocks) => {
    let y = blocks[0];
    const ys = [y];
    for (let i = 1; i < blocks.length; i++) { y = T.compress16(y, blocks[i]); ys.push(y); }
    return { hash: y, ys };
  };

  /** Merkle-Damgård mit Längenblock am Ende */
  T.chainMD = (blocks) => {
    const withLen = blocks.concat([blocks.length & 0xffff]);
    return T.chainNoPad(withLen);
  };
})(typeof window !== 'undefined' ? window : globalThis);
