/* KryptoQuest – SHA-256 (FIPS 180-4) mit offengelegtem internen Zustand,
 * damit der Length-Extension-Angriff auf H(k||m) (Praktikum 3.2) und die
 * Merkle-Damgård-Struktur gezeigt werden können. Dazu HMAC-SHA-256 (RFC 2104). */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const S = (KQ.sha256 = {});

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  S.IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  /** Kompressionsfunktion: state (8 Wörter) × Block (64 Byte) -> neuer state */
  S.compress = (state, block, off = 0) => {
    const W = new Uint32Array(64);
    for (let i = 0; i < 16; i++) {
      const j = off + 4 * i;
      W[i] = (block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    return [
      (state[0] + a) >>> 0, (state[1] + b) >>> 0, (state[2] + c) >>> 0, (state[3] + d) >>> 0,
      (state[4] + e) >>> 0, (state[5] + f) >>> 0, (state[6] + g) >>> 0, (state[7] + h) >>> 0,
    ];
  };

  /** Merkle-Damgård-Padding für eine Nachricht der Länge len (Bytes):
   *  0x80 || 0x00… || Länge in Bit (64 Bit, big endian) */
  S.padding = (len) => {
    const padLen = ((55 - len) % 64 + 64) % 64 + 1; // 1..64 Byte inkl. 0x80
    const out = new Uint8Array(padLen + 8);
    out[0] = 0x80;
    const bits = BigInt(len) * 8n;
    for (let i = 0; i < 8; i++) out[padLen + 7 - i] = Number((bits >> BigInt(8 * i)) & 0xffn);
    return out;
  };

  S.stateToBytes = (st) => {
    const out = new Uint8Array(32);
    st.forEach((w, i) => {
      out[4 * i] = w >>> 24; out[4 * i + 1] = (w >>> 16) & 0xff;
      out[4 * i + 2] = (w >>> 8) & 0xff; out[4 * i + 3] = w & 0xff;
    });
    return out;
  };

  S.bytesToState = (b) => {
    const st = [];
    for (let i = 0; i < 8; i++) st.push(((b[4 * i] << 24) | (b[4 * i + 1] << 16) | (b[4 * i + 2] << 8) | b[4 * i + 3]) >>> 0);
    return st;
  };

  /** Hash mit frei wählbarem Startzustand und "bereits verarbeiteten" Bytes.
   *  Genau das braucht der Length-Extension-Angriff. */
  S.hashFrom = (initState, data, alreadyProcessed = 0, trace = false) => {
    const total = alreadyProcessed + data.length;
    const pad = S.padding(total);
    const msg = new Uint8Array(data.length + pad.length);
    msg.set(data); msg.set(pad, data.length);
    let st = initState.slice();
    const states = [st.slice()];
    for (let i = 0; i < msg.length; i += 64) {
      st = S.compress(st, msg, i);
      if (trace) states.push(st.slice());
    }
    const digest = S.stateToBytes(st);
    return trace ? { digest, states, padded: msg } : digest;
  };

  S.hash = (data) => S.hashFrom(S.IV, data, 0);

  /** Trace für die Merkle-Damgård-Visualisierung */
  S.trace = (data) => S.hashFrom(S.IV, data, 0, true);

  /** Length-Extension: aus H(secret||msg) und |secret| ein gültiges
   *  H(secret||msg||pad||ext) berechnen – ohne secret zu kennen. */
  S.lengthExtend = (origDigest, secretLen, msg, ext) => {
    const origLen = secretLen + msg.length;
    const glue = S.padding(origLen);
    const st = S.bytesToState(origDigest);
    const newDigest = S.hashFrom(st, ext, origLen + glue.length);
    const forgedMsg = new Uint8Array(msg.length + glue.length + ext.length);
    forgedMsg.set(msg); forgedMsg.set(glue, msg.length); forgedMsg.set(ext, msg.length + glue.length);
    return { digest: newDigest, forgedMsg, glue };
  };

  /** HMAC-SHA-256 mit Zwischenergebnissen */
  S.hmac = (key, msg, trace = false) => {
    let k = key.length > 64 ? S.hash(key) : key;
    const k0 = new Uint8Array(64); k0.set(k);
    const ipad = k0.map((x) => x ^ 0x36);
    const opad = k0.map((x) => x ^ 0x5c);
    const inner = new Uint8Array(64 + msg.length); inner.set(ipad); inner.set(msg, 64);
    const innerHash = S.hash(inner);
    const outer = new Uint8Array(96); outer.set(opad); outer.set(innerHash, 64);
    const tag = S.hash(outer);
    return trace ? { tag, k0, ipad, opad, innerHash } : tag;
  };
})(typeof window !== 'undefined' ? window : globalThis);
