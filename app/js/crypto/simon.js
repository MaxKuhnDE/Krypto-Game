/* KryptoQuest – SIMON 32/64 (NSA 2013): Feistel-Blockchiffre mit
 * Wortgröße n = 16, m = 4 Schlüsselwörtern, T = 32 Runden, Konstante z0. */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const U = KQ.util;
  const S = (KQ.simon = {});

  S.N = 16; S.M = 4; S.T = 32;
  S.Z0 = '11111010001001010110000111001101111101000100101011000011100110';
  S.C = 0xfffc; // 2^n - 4

  /** F(x) = ((x ⋘ 1) ∧ (x ⋘ 8)) ⊕ (x ⋘ 2) */
  S.f = (x) => (U.rotl16(x, 1) & U.rotl16(x, 8)) ^ U.rotl16(x, 2);

  S.fTrace = (x) => {
    const r1 = U.rotl16(x, 1), r8 = U.rotl16(x, 8), r2 = U.rotl16(x, 2);
    const and = r1 & r8;
    return { x, r1, r8, r2, and, out: and ^ r2 };
  };

  /** Key-Schedule: key = [k0, k1, k2, k3] (k0 = niederwertigstes Wort) */
  S.expandKey = (key) => {
    const k = key.slice();
    const trace = [];
    for (let i = 0; i < S.T - S.M; i++) {
      let tmp = U.rotr16(k[i + 3], 3);
      const t3 = tmp;
      tmp ^= k[i + 1];
      const tx = tmp;
      tmp ^= U.rotr16(tmp, 1);
      const z = Number(S.Z0[i % 62]);
      const nk = (S.C ^ z ^ k[i] ^ tmp) & 0xffff;
      trace.push({ i: i + 4, rot3: t3, xor1: tx, it: tmp, z, result: nk });
      k.push(nk);
    }
    return { keys: k, trace };
  };

  /** Verschlüsselung (x = linkes Wort, y = rechtes Wort) */
  S.encrypt = (x, y, key, trace = false) => {
    const { keys } = S.expandKey(key);
    const rounds = [];
    for (let i = 0; i < S.T; i++) {
      const fx = S.f(x);
      const nx = (y ^ fx ^ keys[i]) & 0xffff;
      if (trace) rounds.push({ i, x, y, fx, k: keys[i], nx, ny: x });
      y = x; x = nx;
    }
    return trace ? { x, y, rounds, keys } : [x, y];
  };

  /** Entschlüsselung: gleiche Struktur, Rundenschlüssel rückwärts */
  S.decrypt = (x, y, key) => {
    const { keys } = S.expandKey(key);
    for (let i = S.T - 1; i >= 0; i--) {
      const ny = (x ^ S.f(y) ^ keys[i]) & 0xffff;
      x = y; y = ny;
    }
    return [x, y];
  };
})(typeof window !== 'undefined' ? window : globalThis);
