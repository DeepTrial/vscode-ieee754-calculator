// IEEE 754 Engine Tests
// Simple test runner - no external framework needed.

import { IEEE, compute, addThem, subtractThem, multiplyThem, divideThem, binStrToHex } from "../ieee754";

let passed = 0;
let failed = 0;
let currentSuite = "";

function suite(name: string) {
  currentSuite = name;
  console.log(`\n=== ${name} ===`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message} (expected ${expected}, got ${actual})`);
  }
}

function assertClose(actual: number, expected: number, message: string, epsilon = 1e-10) {
  if (Math.abs(actual - expected) < epsilon) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message} (expected ~${expected}, got ${actual})`);
  }
}

// ============================================================
// Parsing Tests
// ============================================================

suite("IEEE.parse - decimal numbers");

(() => {
  // Normal positive number
  const ieee = IEEE.parse("42");
  assert(!ieee.nan, "parse('42') is not NaN");
  assert(!ieee.inf, "parse('42') is not Inf");
  assert(!ieee.minus, "parse('42') is not negative");
  assert(!ieee.isZero(), "parse('42') is not zero");

  // Negative number
  const neg = IEEE.parse("-3.14");
  assert(!neg.nan, "parse('-3.14') is not NaN");
  assert(!neg.inf, "parse('-3.14') is not Inf");
  assert(neg.minus, "parse('-3.14') is negative");
  assert(!neg.isZero(), "parse('-3.14') is not zero");

  // Simple fraction
  const half = IEEE.parse("0.5");
  assert(!half.nan, "parse('0.5') is not NaN");
  assert(!half.inf, "parse('0.5') is not Inf");
  assert(!half.minus, "parse('0.5') is not negative");
})();

suite("IEEE.parse - special values");

(() => {
  // NaN
  const nan = IEEE.parse("NaN");
  assert(nan.nan, "parse('NaN') has nan flag");
  assert(!nan.inf, "parse('NaN') is not Inf");

  // Inf
  const inf = IEEE.parse("Inf");
  assert(!inf.nan, "parse('Inf') is not NaN");
  assert(inf.inf, "parse('Inf') has inf flag");
  assert(!inf.minus, "parse('Inf') is positive");

  // -Inf
  const negInf = IEEE.parse("-Inf");
  assert(!negInf.nan, "parse('-Inf') is not NaN");
  assert(negInf.inf, "parse('-Inf') has inf flag");
  assert(negInf.minus, "parse('-Inf') is negative");

  // Zero
  const zero = IEEE.parse("0.0");
  assert(!zero.nan, "parse('0.0') is not NaN");
  assert(!zero.inf, "parse('0.0') is not Inf");
  assert(zero.isZero(), "parse('0.0') is zero");
  assert(!zero.minus, "parse('0.0') is not negative");

  // Negative zero
  const negZero = IEEE.parse("-0.0");
  assert(!negZero.nan, "parse('-0.0') is not NaN");
  assert(!negZero.inf, "parse('-0.0') is not Inf");
  assert(negZero.isZero(), "parse('-0.0') is zero");
  assert(negZero.minus, "parse('-0.0') is negative");
})();

suite("IEEE.parse - hex");

(() => {
  // 0x40490FDB = 3.1415927410125732 in float32
  IEEE.switchBitSize(32);
  const hex = IEEE.parse("0x40490FDB");
  assert(!hex.nan, "parse('0x40490FDB') is not NaN");
  assert(!hex.inf, "parse('0x40490FDB') is not Inf");
  assert(!hex.minus, "parse('0x40490FDB') is not negative");
  assert(!hex.isZero(), "parse('0x40490FDB') is not zero");

  // Verify it rounds to approximately pi in float32
  const dec = hex.decimalOutput();
  assert(dec.startsWith("3.14"), "parse('0x40490FDB') decimal starts with 3.14");
  IEEE.switchBitSize(64); // restore default
})();

suite("IEEE.parse - binary");

(() => {
  IEEE.switchBitSize(32);
  const bin = IEEE.parse("0b01000000010010010000111111011011");
  assert(!bin.nan, "parse binary is not NaN");
  assert(!bin.inf, "parse binary is not Inf");
  assert(!bin.minus, "parse binary is not negative");
  assert(!bin.isZero(), "parse binary is not zero");
  const dec = bin.decimalOutput();
  assert(dec.startsWith("3.14"), "parse binary decimal starts with 3.14");
  IEEE.switchBitSize(64); // restore default
})();

suite("IEEE.parse - fraction");

(() => {
  const third = IEEE.parse("1/3");
  assert(!third.nan, "parse('1/3') is not NaN");
  assert(!third.inf, "parse('1/3') is not Inf");
  assert(!third.minus, "parse('1/3') is not negative");
  assert(!third.isZero(), "parse('1/3') is not zero");

  // Fraction with zero denominator
  const divByZero = IEEE.parse("1/0");
  assert(divByZero.inf, "parse('1/0') is Inf");
})();

// ============================================================
// Format Switching Tests
// ============================================================

suite("IEEE.switchBitSize - binary16");

(() => {
  IEEE.switchBitSize(16);
  assertEqual(IEEE.mantissaLen, 10, "binary16 mantissaLen is 10");
  assertEqual(IEEE.NaNExp, 16, "binary16 NaNExp is 16");
  assertEqual(IEEE.numberOfBits, 16, "binary16 numberOfBits is 16");

  const val = IEEE.parse("1.5");
  assert(!val.nan, "binary16 parse('1.5') is not NaN");
  assert(!val.inf, "binary16 parse('1.5') is not Inf");
  assert(!val.minus, "binary16 parse('1.5') is not negative");
  const dec = val.decimalOutput();
  assertEqual(dec, "1.5", "binary16 parse('1.5') decimalOutput is '1.5'");

  IEEE.switchBitSize(64); // restore
})();

suite("IEEE.switchBitSize - binary32");

(() => {
  IEEE.switchBitSize(32);
  assertEqual(IEEE.mantissaLen, 23, "binary32 mantissaLen is 23");
  assertEqual(IEEE.NaNExp, 128, "binary32 NaNExp is 128");
  assertEqual(IEEE.numberOfBits, 32, "binary32 numberOfBits is 32");

  const val = IEEE.parse("3.14");
  assert(!val.nan, "binary32 parse('3.14') is not NaN");

  IEEE.switchBitSize(64); // restore
})();

suite("IEEE.switchBitSize - binary64 (default)");

(() => {
  IEEE.switchBitSize(64);
  assertEqual(IEEE.mantissaLen, 52, "binary64 mantissaLen is 52");
  assertEqual(IEEE.NaNExp, 1024, "binary64 NaNExp is 1024");
  assertEqual(IEEE.numberOfBits, 64, "binary64 numberOfBits is 64");
})();

suite("IEEE.switchBitSize - binary128");

(() => {
  IEEE.switchBitSize(128);
  assertEqual(IEEE.mantissaLen, 112, "binary128 mantissaLen is 112");
  assertEqual(IEEE.NaNExp, 16384, "binary128 NaNExp is 16384");
  assertEqual(IEEE.numberOfBits, 128, "binary128 numberOfBits is 128");

  const val = IEEE.parse("42");
  assert(!val.nan, "binary128 parse('42') is not NaN");

  IEEE.switchBitSize(64); // restore
})();

// ============================================================
// Arithmetic Tests
// ============================================================

suite("Arithmetic - basic operations");

(() => {
  // 1 + 1 = 2
  const a = IEEE.parse("1");
  const b = IEEE.parse("1");
  const sum = addThem(a, b);
  assertEqual(sum.decimalOutput(), "2.0", "1 + 1 = 2.0");

  // 5 - 3 = 2
  const c = IEEE.parse("5");
  const d = IEEE.parse("3");
  const diff = subtractThem(c, d);
  assertEqual(diff.decimalOutput(), "2.0", "5 - 3 = 2.0");

  // 3 * 4 = 12
  const e = IEEE.parse("3");
  const f = IEEE.parse("4");
  const prod = multiplyThem(e, f);
  assertEqual(prod.decimalOutput(), "12.0", "3 * 4 = 12.0");

  // 10 / 4 = 2.5
  const g = IEEE.parse("10");
  const h = IEEE.parse("4");
  const quot = divideThem(g, h);
  assertEqual(quot.decimalOutput(), "2.5", "10 / 4 = 2.5");
})();

suite("Arithmetic - negative numbers");

(() => {
  // -3 + 5 = 2
  const a = IEEE.parse("-3");
  const b = IEEE.parse("5");
  const sum = addThem(a, b);
  assertEqual(sum.decimalOutput(), "2.0", "-3 + 5 = 2.0");

  // 3 + (-5) = -2
  const c = IEEE.parse("3");
  const d = IEEE.parse("-5");
  const sum2 = addThem(c, d);
  assertEqual(sum2.decimalOutput(), "-2.0", "3 + (-5) = -2.0");

  // -3 * -4 = 12
  const e = IEEE.parse("-3");
  const f = IEEE.parse("-4");
  const prod = multiplyThem(e, f);
  assertEqual(prod.decimalOutput(), "12.0", "-3 * -4 = 12.0");

  // -3 * 4 = -12
  const g = IEEE.parse("-3");
  const h = IEEE.parse("4");
  const prod2 = multiplyThem(g, h);
  assertEqual(prod2.decimalOutput(), "-12.0", "-3 * 4 = -12.0");
})();

suite("Arithmetic - special values");

(() => {
  const one = IEEE.parse("1");
  const nan = IEEE.parse("NaN");

  // NaN + anything = NaN
  const nanResult = compute("+", nan, one);
  assert(nanResult.nan, "NaN + 1 = NaN");

  const nanResult2 = compute("+", one, nan);
  assert(nanResult2.nan, "1 + NaN = NaN");

  // Inf + 1 = Inf
  const inf = IEEE.parse("Inf");
  const infResult = addThem(inf, one);
  assert(infResult.inf, "Inf + 1 is Inf");
  assert(!infResult.minus, "Inf + 1 is positive Inf");

  // 0 * Inf = NaN
  const zero = IEEE.parse("0");
  const zeroInfResult = multiplyThem(zero, inf);
  assert(zeroInfResult.nan, "0 * Inf = NaN");

  // 1 / 0 = Inf
  const zero2 = IEEE.parse("0");
  const divResult = divideThem(one, zero2);
  assert(divResult.inf, "1 / 0 is Inf");
  assert(!divResult.minus, "1 / 0 is positive Inf");

  // -1 / 0 = -Inf
  const negOne = IEEE.parse("-1");
  const zero3 = IEEE.parse("0");
  const negDivResult = divideThem(negOne, zero3);
  assert(negDivResult.inf, "-1 / 0 is Inf");
  assert(negDivResult.minus, "-1 / 0 is negative Inf");

  // Inf + Inf = Inf
  const inf2 = IEEE.parse("Inf");
  const infSum = addThem(inf, inf2);
  assert(infSum.inf, "Inf + Inf is Inf");

  // Inf - Inf = NaN
  const infSub = subtractThem(inf, inf);
  assert(infSub.nan, "Inf - Inf = NaN");

  // Inf * Inf = Inf
  const infProd = multiplyThem(inf, inf);
  assert(infProd.inf, "Inf * Inf is Inf");

  // Inf / Inf = NaN
  const infQuot = divideThem(inf, inf);
  assert(infQuot.nan, "Inf / Inf = NaN");

  // Inf * 0 = NaN
  const zero4 = IEEE.parse("0");
  const infZero = multiplyThem(inf, zero4);
  assert(infZero.nan, "Inf * 0 = NaN");

  // 0 / 0 = NaN
  const zero5 = IEEE.parse("0");
  const zero6 = IEEE.parse("0");
  const zeroDiv = divideThem(zero5, zero6);
  assert(zeroDiv.nan, "0 / 0 = NaN");
})();

// ============================================================
// Decimal Output Tests
// ============================================================

suite("Decimal output");

(() => {
  IEEE.switchBitSize(64);

  const half = IEEE.parse("0.5");
  assertEqual(half.decimalOutput(), "0.5", "parse('0.5').decimalOutput() === '0.5'");

  const fortyTwo = IEEE.parse("42");
  assertEqual(fortyTwo.decimalOutput(), "42.0", "parse('42').decimalOutput() === '42.0'");

  const negThree = IEEE.parse("-3.14");
  const negDec = negThree.decimalOutput();
  assert(negDec.startsWith("-3.14"), "parse('-3.14').decimalOutput() starts with -3.14");

  // Binary16
  IEEE.switchBitSize(16);
  const b16 = IEEE.parse("1.5");
  assertEqual(b16.decimalOutput(), "1.5", "binary16 parse('1.5').decimalOutput() === '1.5'");

  IEEE.switchBitSize(64); // restore
})();

// ============================================================
// binStrToHex Tests
// ============================================================

suite("binStrToHex");

(() => {
  assertEqual(binStrToHex("0100"), "4", "binStrToHex('0100') === '4'");
  assertEqual(binStrToHex("1111"), "F", "binStrToHex('1111') === 'F'");
  assertEqual(binStrToHex("10101010"), "AA", "binStrToHex('10101010') === 'AA'");
  assertEqual(binStrToHex("00000000"), "00", "binStrToHex('00000000') === '00'");
  assertEqual(
    binStrToHex("01000000010010010000111111011011"),
    "40490FDB",
    "binStrToHex for float32 pi hex"
  );
})();

// ============================================================
// Signed Zero Tests
// ============================================================

suite("Signed zero behavior");

(() => {
  const posZero = IEEE.parse("0.0");
  const negZero = IEEE.parse("-0.0");

  assert(posZero.isZero(), "0.0 is zero");
  assert(!posZero.minus, "0.0 is not negative");

  assert(negZero.isZero(), "-0.0 is zero");
  assert(negZero.minus, "-0.0 is negative");

  // -0 + -0 = -0
  const negZeroNegZero = addThem(negZero, negZero);
  assert(negZeroNegZero.isZero(), "-0 + -0 is zero");
  assert(negZeroNegZero.minus, "-0 + -0 is negative zero");

  // 0 + -0 = 0 (positive)
  const posNegZero = addThem(posZero, negZero);
  assert(posNegZero.isZero() && !posNegZero.minus, "0 + -0 is positive zero");
})();

// ============================================================
// Summary
// ============================================================

console.log("\n=== RESULTS ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  console.error("\nSome tests FAILED!");
  process.exit(1);
} else {
  console.log("\nAll tests PASSED!");
  process.exit(0);
}
