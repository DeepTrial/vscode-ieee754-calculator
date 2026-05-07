// Copyright (c) 2016-2023, Dr. Edmund Weitz

const abs = (x: bigint): bigint => x < 0n ? -x : x;

// computes the greatest common divisor of a and b
function gcd(a: bigint, b: bigint): bigint {
  if (a === 0n) return b;
  if (b === 0n) return a;
  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

// a "Fraction" object represents a rational number with a numerator
// and a denominator; both of these are "bigInt" objects so that we
// have infinite precision
class Fraction {
  num: bigint;
  den: bigint;

  // if there's only one argument to the constructor, we construct a
  // fraction representing an integer
  constructor(num: number | bigint, den?: number | bigint) {
    den = den ?? 1;
    this.num = BigInt(num);
    this.den = BigInt(den);
    if (den !== 1 && num !== 1) {
      this.cancel();
    }
  }

  // "Fraction" objects are always canceled and the denominator is never
  // negative; that's done by this method
  cancel(): void {
    const g = gcd(abs(this.num), abs(this.den));
    this.num /= g;
    this.den /= g;
    if (this.den < 0n) {
      this.num = -this.num;
      this.den = -this.den;
    }
  }

  // add "summand" to fraction and return NEW object
  add(summand: Fraction): Fraction {
    return new Fraction(
      this.num * summand.den + this.den * summand.num,
      this.den * summand.den
    );
  }

  // subtract "subtrahend" from fraction and return NEW object
  sub(subtrahend: Fraction): Fraction {
    return new Fraction(
      this.num * subtrahend.den - this.den * subtrahend.num,
      this.den * subtrahend.den
    );
  }

  // subtract integer k in-place
  subInt(k: number | bigint): void {
    this.num -= BigInt(k) * this.den;
    this.cancel();
  }

  // multiply fraction with "factor" and return NEW object
  mult(factor: Fraction): Fraction {
    return new Fraction(this.num * factor.num, this.den * factor.den);
  }

  // multiply fraction in-place with ten
  multTen(): void {
    this.num *= 10n;
    this.cancel();
  }

  // divide fraction by "divisor" and return NEW object
  div(divisor: Fraction): Fraction {
    return new Fraction(this.num * divisor.den, this.den * divisor.num);
  }

  // whether the fraction and "other" are equal
  eq(other: Fraction): boolean {
    return this.num * other.den === this.den * other.num;
  }

  // whether fraction is greater than "other"
  gt(other: Fraction): boolean {
    if (this.num > 0n && other.num <= 0n) return true;
    if (this.num <= 0n && other.num > 0n) return false;
    return this.num * other.den > this.den * other.num;
  }

  // whether fraction is greater than "other" or equal to it
  ge(other: Fraction): boolean {
    return this.gt(other) || this.eq(other);
  }

  // whether fraction is less than "other"
  lt(other: Fraction): boolean {
    return other.gt(this);
  }

  // whether fraction is less than "other" or equal to it
  le(other: Fraction): boolean {
    return this.lt(other) || this.eq(other);
  }

  // whether fraction is positive
  isPositive(): boolean {
    return this.num > 0n;
  }

  // whether fraction is negative
  isNegative(): boolean {
    return this.num < 0n;
  }

  // whether the fraction is equal to zero
  isZero(): boolean {
    return this.num === 0n;
  }

  // returns the absolute value of the fraction as a NEW object
  abs(): Fraction {
    return new Fraction(abs(this.num), this.den);
  }

  // string representation of the fraction; only used for debugging
  toString(): string {
    return (this.isNegative() ? "-" : "") + this.num.toString() + "/" + this.den.toString();
  }

  // computes the integer part of the fraction as a JavaScript integer;
  // assumes that the fraction is positive!
  floor(): number {
    return Number(this.num / this.den);
  }

  // returns the ceiling of the decadic logarithm of the fraction as a
  // JavaScript integer; assumes that its argument is positive
  log10(): number {
    let cand = Math.ceil(intLog10(this.num) - intLog10(this.den)) - 2;
    while (fractionTimesPower10(1n, cand).lt(this)) cand++;
    return cand;
  }

  // returns a rough approximation of the binary logarithm of the
  // fraction as a JavaScript integer; assumes that its argument is
  // positive
  log2(): number {
    return intLog2(this.num) - intLog2(this.den);
  }

  // some constants
  static ZERO = new Fraction(0, 1);
  static ONE = new Fraction(1, 1);
  static MINUSONE = new Fraction(-1, 1);
  static TWO = new Fraction(2, 1);
  static HALF = new Fraction(1, 2);
  static TENTEN = new Fraction(10 ** 10, 1);
  static TENHUNDRED = new Fraction(10n ** 100n, 1);
  static TWOTEN = new Fraction(1024, 1);
  static TWOFIFTY = new Fraction(1125899906842624, 1);
  static TWOMINUSTEN = new Fraction(1, 1024);
  static TWOMINUSFIFTY = new Fraction(1, 1125899906842624);
}

// helper function which computes the product of "val" (a BigInt) and
// 10 to the "exp" power and returns it as a fraction
export function fractionTimesPower10(val: bigint, exp: number): Fraction {
  if (exp >= 0) {
    const pow = 10n ** BigInt(exp);
    return new Fraction(val !== 1n ? val * pow : pow);
  } else {
    return new Fraction(val, 10n ** BigInt(-exp));
  }
}

// helper function which computes the product of "val" (a BigInt) and
// 2 to the "exp" power and returns it as a fraction
export function fractionTimesPower2(val: bigint, exp: number): Fraction {
  if (exp >= 0) {
    const pow = 1n << BigInt(exp);
    return new Fraction(val !== 1n ? val * pow : pow);
  } else {
    return new Fraction(val, 1n << BigInt(-exp));
  }
}

// returns an approximation of the decadic logarithm of an integer
// (can be a BigInt) which is assumed to be positive
function intLog10(n: bigint): number {
  const s = n.toString(10);
  return s.length + Math.log10(`0.${s.substring(0, 15)}`);
}

// returns a rough approximation of the binary logarithm of an integer
// (can be a BigInt) which is assumed to be positive
function intLog2(n: bigint): number {
  return n.toString(2).length;
}

export default Fraction;
