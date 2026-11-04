/* Prüft die Lehr-Implementierungen gegen offizielle Testvektoren und gegen
 * Node.js' eigene Krypto-Bibliothek. Aufruf: npm test */
'use strict';
const assert = require('node:assert/strict');
const nodeCrypto = require('node:crypto');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'app', 'js', 'crypto');
['util', 'aes', 'sha256', 'chacha20', 'simon', 'numth', 'ec', 'toys'].forEach((f) =>
  require(path.join(dir, f + '.js'))
);
const { util: U, aes: AES, gf28: GF, sha256: SHA, chacha: CC, simon: SIM, nt: NT, ec: EC, toys: T } = globalThis.KQ;

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
};

console.log('GF(2^8) / AES');
test('GF: 0x57·0x83 = 0xC1 (FIPS 197, 4.2)', () => assert.equal(GF.mul(0x57, 0x83), 0xc1));
test('GF: 0x57·0x13 = 0xFE', () => assert.equal(GF.mul(0x57, 0x13), 0xfe));
test('GF: a·a⁻¹ = 1 für alle a ≠ 0', () => { for (let a = 1; a < 256; a++) assert.equal(GF.mul(a, GF.inv(a)), 1); });
test('GF: mulTrace = mul', () => { for (let i = 0; i < 500; i++) { const a = U.randInt(0, 255), b = U.randInt(0, 255); assert.equal(GF.mulTrace(a, b).result, GF.mul(a, b)); } });
test('S-Box: S(0x00)=0x63, S(0x53)=0xED', () => { assert.equal(AES.SBOX[0], 0x63); assert.equal(AES.SBOX[0x53], 0xed); });
test('AES-128 FIPS 197 Anhang C.1', () => {
  const ct = AES.encryptBlock(U.fromHex('00112233445566778899aabbccddeeff'), U.fromHex('000102030405060708090a0b0c0d0e0f'));
  assert.equal(U.hex(ct), '69c4e0d86a7b0430d8cdb78070b4c55a');
});
test('AES-128 FIPS 197 Anhang B + Trace', () => {
  const r = AES.encryptBlock(U.fromHex('3243f6a8885a308d313198a2e0370734'), U.fromHex('2b7e151628aed2a6abf7158809cf4f3c'), true);
  assert.equal(U.hex(r.output), '3925841d02dc09fbdc118597196a0b32');
  assert.equal(r.steps.filter((s) => s.op === 'MixColumns').length, 9);
  // Zustand nach Runde 1 SubBytes laut FIPS 197 Anhang B: d4 27 11 ae e0 bf 98 f1 b8 b4 5d e5 1e 41 52 30
  assert.equal(U.hex(r.steps.find((s) => s.round === 1 && s.op === 'SubBytes').state), 'd42711aee0bf98f1b8b45de51e415230');
});
test('AES Key-Expansion: letzter Rundenschlüssel (FIPS 197 A.1)', () => {
  const { roundKeys } = AES.expandKey(U.fromHex('2b7e151628aed2a6abf7158809cf4f3c'));
  assert.equal(U.hex(roundKeys[10]), 'd014f9a8c9ee2589e13f0cc8b6630ca6');
});
test('AES Entschlüsselung invers', () => {
  for (let i = 0; i < 50; i++) {
    const k = U.randomBytes(16), p = U.randomBytes(16);
    assert.equal(U.hex(AES.decryptBlock(AES.encryptBlock(p, k), k)), U.hex(p));
  }
});
test('ECB/CBC/CTR = Node crypto', () => {
  for (let i = 0; i < 20; i++) {
    const k = U.randomBytes(16), iv = U.randomBytes(16), m = U.randomBytes(U.randInt(0, 70));
    const n = (alg, ivv, pad) => { const c = nodeCrypto.createCipheriv(alg, k, ivv); c.setAutoPadding(pad); return U.hex(Buffer.concat([c.update(m), c.final()])); };
    assert.equal(U.hex(AES.ecbEncrypt(k, m)), n('aes-128-ecb', null, true));
    assert.equal(U.hex(AES.cbcEncrypt(k, iv, m)), n('aes-128-cbc', iv, true));
    const nonce = U.randomBytes(8);
    const ctrIv = U.concat(nonce, new Uint8Array(8));
    assert.equal(U.hex(AES.ctr(k, nonce, m)), n('aes-128-ctr', ctrIv, false));
    const d = AES.cbcDecrypt(k, iv, AES.cbcEncrypt(k, iv, m));
    assert.ok(d.ok); assert.equal(U.hex(d.plain), U.hex(m));
  }
});
test('PKCS#7: voller Block bekommt 16×0x10', () => {
  const p = AES.pad(new Uint8Array(16));
  assert.equal(p.length, 32); assert.ok(p.slice(16).every((x) => x === 16));
  assert.equal(AES.unpad(U.fromHex('41414141414141414141414141030303')).length, 13);
  assert.equal(AES.unpad(U.fromHex('41414141414141414141414141030302')), null);
});

console.log('SHA-256 / HMAC');
test('SHA-256("abc")', () => assert.equal(U.hex(SHA.hash(U.utf8('abc'))), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
test('SHA-256 = Node für Längen 0..200', () => {
  for (let len = 0; len <= 200; len++) {
    const m = U.randomBytes(len);
    assert.equal(U.hex(SHA.hash(m)), nodeCrypto.createHash('sha256').update(m).digest('hex'));
  }
});
test('Length-Extension: H(k||m||pad||ext) ohne k', () => {
  for (let kl = 1; kl < 70; kl += 7) {
    const key = U.randomBytes(kl), msg = U.utf8('user=bob&role=user'), ext = U.utf8('&role=admin');
    const orig = SHA.hash(U.concat(key, msg));
    const f = SHA.lengthExtend(orig, kl, msg, ext);
    assert.equal(U.hex(f.digest), U.hex(SHA.hash(U.concat(key, f.forgedMsg))));
  }
});
test('HMAC-SHA-256 = Node (auch lange Schlüssel)', () => {
  for (const kl of [0, 5, 32, 64, 65, 100]) {
    const k = U.randomBytes(kl), m = U.randomBytes(U.randInt(0, 150));
    assert.equal(U.hex(SHA.hmac(k, m)), nodeCrypto.createHmac('sha256', k).update(m).digest('hex'));
  }
});

console.log('ChaCha20');
test('Quarterround RFC 8439 2.1.1', () => {
  const r = CC.quarterRound(0x11111111, 0x01020304, 0x9b8d6f43, 0x01234567).out.map(U.hex32);
  assert.deepEqual(r, ['ea2a92f4', 'cb1cf8ce', '4581472e', '5881c4bb']);
});
test('Block RFC 8439 2.3.2', () => {
  const key = Uint8Array.from({ length: 32 }, (_, i) => i);
  const ks = CC.block(key, 1, U.fromHex('000000090000004a00000000'));
  assert.equal(U.hex(ks).slice(0, 32), '10f1e7e4d13b5915500fdd1fa32071c4');
});
test('ChaCha20 = Node crypto', () => {
  const key = U.randomBytes(32), nonce = U.randomBytes(12), m = U.randomBytes(200);
  const iv = U.concat(Uint8Array.from([1, 0, 0, 0]), nonce);
  const c = nodeCrypto.createCipheriv('chacha20', key, iv);
  assert.equal(U.hex(CC.encrypt(key, nonce, 1, m)), U.hex(Buffer.concat([c.update(m), c.final()])));
});

console.log('SIMON 32/64');
test('Testvektor (Simon-Paper)', () => {
  const key = [0x0100, 0x0908, 0x1110, 0x1918];
  const [x, y] = SIM.encrypt(0x6565, 0x6877, key);
  assert.equal(U.hex16(x) + U.hex16(y), 'c69be9bb');
  assert.deepEqual(SIM.decrypt(x, y, key), [0x6565, 0x6877]);
});

console.log('Zahlentheorie');
test('RSA-Beispiel p=37, q=17, e=5 ⇒ d=461', () => {
  assert.equal(NT.phi(629n), 576n);
  assert.equal(NT.modInv(5n, 576n), 461n);
  const m = 123n; assert.equal(NT.modPow(NT.modPow(m, 5n, 629n), 461n, 629n), m);
});
test('Probedivision 37137 = 3·12379; ggT(7493,7729)=59', () => {
  assert.deepEqual(NT.trialDivision(37137n).factors, [3n, 12379n]);
  assert.ok(NT.isPrime(12379n));
  assert.equal(NT.gcd(7493n, 7729n), 59n);
});
test('egcd: a·x + b·y = g', () => {
  for (let i = 0; i < 100; i++) {
    const x = NT.randBetween(1n, 10n ** 12n), y = NT.randBetween(1n, 10n ** 12n);
    const { g, a, b } = NT.egcd(x, y);
    assert.equal(a * x + b * y, g); assert.equal(g, NT.gcd(x, y));
  }
});
test('Erzeuger von Z*_23: 5 ja, 2 nein (2 erzeugt QR-Untergruppe der Ordnung 11)', () => {
  assert.ok(NT.generatorTest(5n, 23n).isGenerator);
  assert.ok(!NT.generatorTest(2n, 23n).isGenerator);
  assert.equal(NT.order(2n, 23n), 11n);
});
test('Pohlig-Hellman = Brute Force', () => {
  const p = 8101n, g = 6n; // 8100 = 2²·3⁴·5²
  for (let i = 0; i < 20; i++) {
    const x = NT.randBetween(0n, p - 2n);
    const h = NT.modPow(g, x, p);
    const r = NT.pohligHellman(g, h, p);
    assert.equal(NT.modPow(g, r.x, p), h);
  }
});
test('iroot, Miller-Rabin, sqmTrace', () => {
  assert.equal(NT.iroot(12345678901234567890n ** 3n, 3n), 12345678901234567890n);
  assert.equal(NT.iroot(26n, 3n), 2n);
  assert.ok(NT.isPrime(2n ** 127n - 1n)); assert.ok(!NT.isPrime(561n));
  assert.equal(NT.sqmTrace(7n, 560n, 561n).result, NT.modPow(7n, 560n, 561n));
});

console.log('Elliptische Kurven');
test('y² = x³ + 2x + 2 über F_17: #E = 19, (5,1) erzeugt', () => {
  const c = EC.curve(2, 2, 17);
  assert.equal(EC.points(c).length + 1, 19);
  const mult = EC.multiples(c, [5, 1]);
  assert.equal(mult.length, 19); assert.equal(mult[18], null);
  mult.slice(0, 18).forEach((P) => assert.ok(EC.onCurve(c, P)));
  assert.deepEqual(EC.mul(c, 2, [5, 1]), [6, 3]);
});

console.log('Spielzeug-Primitive');
test('Feistel invertierbar trotz nicht-bijektivem F', () => {
  const keys = [17, 99, 200, 3];
  for (let i = 0; i < 300; i++) {
    const L = U.randInt(0, 255), R = U.randInt(0, 255);
    const [a, b] = T.feistelEnc(L, R, keys);
    assert.deepEqual(T.feistelDec(a, b, keys), [L, R]);
  }
  const imgs = new Set(); for (let x = 0; x < 256; x++) imgs.add(T.roundF(42, x));
  assert.ok(imgs.size < 256, 'F soll nicht bijektiv sein');
});
test('Even-Mansour invertierbar', () => {
  const P = T.randomPerm(8, 7), E = T.evenMansour(P, 0x5a);
  for (let x = 0; x < 256; x++) assert.equal(E.dec(E.enc(x)), x);
});

console.log(`\n${passed} Tests bestanden.`);
