/* KryptoQuest – Elliptische Kurven in Weierstrass-Form y² = x³ + ax + b
 * über F_p (kleine p, Number-Arithmetik) und über ℝ (für die Geometrie). */
(function (root) {
  'use strict';
  const KQ = (root.KQ = root.KQ || {});
  const NT = KQ.nt;
  const EC = (KQ.ec = {});

  EC.O = null; // Punkt im Unendlichen

  EC.curve = (a, b, p) => ({ a, b, p });

  EC.discriminantOk = ({ a, b, p }) => NT.modN(4 * a * a * a + 27 * b * b, p) !== 0;

  EC.onCurve = ({ a, b, p }, P) =>
    P === null || NT.modN(P[1] * P[1] - (P[0] * P[0] * P[0] + a * P[0] + b), p) === 0;

  EC.points = (c) => {
    const pts = [];
    const sq = new Map();
    for (let y = 0; y < c.p; y++) {
      const v = (y * y) % c.p;
      if (!sq.has(v)) sq.set(v, []);
      sq.get(v).push(y);
    }
    for (let x = 0; x < c.p; x++) {
      const rhs = NT.modN(x * x * x + c.a * x + c.b, c.p);
      (sq.get(rhs) || []).forEach((y) => pts.push([x, y]));
    }
    return pts;
  };

  EC.neg = (c, P) => (P === null ? null : [P[0], NT.modN(-P[1], c.p)]);

  EC.eq = (P, Q) => (P === null || Q === null ? P === Q : P[0] === Q[0] && P[1] === Q[1]);

  /** Punktaddition mit Rechenweg (Steigung λ) */
  EC.addTrace = (c, P, Q) => {
    const { a, p } = c;
    if (P === null) return { R: Q, case: 'P = O ⇒ R = Q' };
    if (Q === null) return { R: P, case: 'Q = O ⇒ R = P' };
    if (P[0] === Q[0] && NT.modN(P[1] + Q[1], p) === 0)
      return { R: null, case: 'Q = −P ⇒ R = O (senkrechte Gerade)' };
    let lambda, kind;
    if (EC.eq(P, Q)) {
      const num = NT.modN(3 * P[0] * P[0] + a, p);
      const den = NT.modN(2 * P[1], p);
      lambda = NT.modN(num * NT.invN(den, p), p);
      kind = `Verdopplung: λ = (3x₁² + a)/(2y₁) = ${num}·${den}⁻¹ = ${lambda}`;
    } else {
      const num = NT.modN(Q[1] - P[1], p);
      const den = NT.modN(Q[0] - P[0], p);
      lambda = NT.modN(num * NT.invN(den, p), p);
      kind = `Sekante: λ = (y₂ − y₁)/(x₂ − x₁) = ${num}·${den}⁻¹ = ${lambda}`;
    }
    const x3 = NT.modN(lambda * lambda - P[0] - Q[0], p);
    const y3 = NT.modN(lambda * (P[0] - x3) - P[1], p);
    return { R: [x3, y3], lambda, case: kind };
  };

  EC.add = (c, P, Q) => EC.addTrace(c, P, Q).R;

  /** Skalarmultiplikation (Double-and-Add) mit Liste aller Vielfachen */
  EC.mul = (c, n, P) => {
    let R = null, A = P;
    while (n > 0) {
      if (n & 1) R = EC.add(c, R, A);
      A = EC.add(c, A, A);
      n >>= 1;
    }
    return R;
  };

  EC.multiples = (c, P, max = 1000) => {
    const out = [];
    let R = P;
    for (let k = 1; k <= max; k++) {
      out.push(R);
      if (R === null) break;
      R = EC.add(c, R, P);
    }
    return out; // out[k-1] = k·P, letzter Eintrag O
  };

  EC.fmt = (P) => (P === null ? 'O' : `(${P[0]}, ${P[1]})`);

  // ---------- reelle Geometrie ----------
  EC.real = {
    /** y-Werte (±) für gegebenes x, oder null */
    ys: (a, b, x) => {
      const v = x * x * x + a * x + b;
      if (v < 0) return null;
      const y = Math.sqrt(v);
      return [y, -y];
    },
    add: (a, P, Q) => {
      if (!P) return Q;
      if (!Q) return P;
      let l;
      if (Math.abs(P[0] - Q[0]) < 1e-9) {
        if (Math.abs(P[1] + Q[1]) < 1e-9) return null;
        l = (3 * P[0] * P[0] + a) / (2 * P[1]);
      } else l = (Q[1] - P[1]) / (Q[0] - P[0]);
      const x3 = l * l - P[0] - Q[0];
      const y3 = l * (P[0] - x3) - P[1];
      return [x3, y3];
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
