// Copyright (c) 2016-2023, Dr. Edmund Weitz

import Fraction, { fractionTimesPower10, fractionTimesPower2 } from './Fraction';

// helper function which checks if all elements of the array L are
// zeros
function allZeros(L: number[]): boolean {
  return L.every(x => x == 0);
}

// an "IEEE" object holds one numerical value which is determined
// either like this:
// - if "nan" is true, the value is "NaN"
// - if "inf" is true, the value is "Inf" or "-Inf", depending on "minus"
// - otherwise, the absolute value is "val" and "minus" signifies a negative value
// there will also be two additional slots for information which is
// essentially redundant:
// - "mantissa" is an array of bits for the significand
// - "exp" is the exponent (without bias) stored as a JavaScript integer
//         with the two extreme values IEEE.NaNExp and 1 - IEEE.NaNExp used
//         for NaN, Inf, and denormalized numbers
class IEEE {
  val: Fraction;
  minus: boolean;
  nan: boolean;
  inf: boolean;
  exp!: number;
  mantissa!: number[];

  // static properties
  static numberOfBits: number = 0;
  static NaNExp: number = 0;
  static mantissaLen: number = 0;
  static binRegex: RegExp = /^$/;
  static hexRegex: RegExp = /^$/;
  static smallestPositiveHalved: Fraction = new Fraction(0);

  constructor(val: Fraction | bigint) {
    // argument can be a fraction or a BigInt
    this.val = val instanceof Fraction ? val : new Fraction(val);
    this.minus = false;
    // argument can be negative
    if (this.val.isNegative()) {
      this.minus = true;
      this.val = this.val.abs();
    }
    // convert very small values immediately to zero
    if (!this.val.isZero() && this.val.le(IEEE.smallestPositiveHalved))
      this.val = new Fraction(0);
    this.nan = false;
    this.inf = false;
    this.updateBits();
  }

  // checks if object represents zero (positive or negative)
  isZero(): boolean {
    return !this.nan && !this.inf && this.val.isZero();
  }

  // set the "mantissa" and "exponent" slots of the IEEE objects
  // according to "nan", "inf", and "val"
  updateBits(): void {
    if (this.nan) {
      this.exp = IEEE.NaNExp;
      // only ones
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(1);
      return;
    }
    if (this.inf) {
      this.exp = IEEE.NaNExp;
      // only zeros
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(0);
      return;
    }
    let exp = 0;
    let val = new Fraction(this.val.num, this.val.den);
    // zeros first, including very small values
    if (val.isZero() || val.lt(IEEE.smallestPositiveHalved)) {
      this.exp = 1 - IEEE.NaNExp;
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(0);
      return;
    }
    // adjust "val" so that it's between one and two and adjust "exp"
    // correspondingly; start with an estimate to speed things up
    const lg = val.log2();
    if (lg > 1) {
      val.den <<= BigInt(lg);
      exp += lg;
    } else if (lg < 0) {
      val.num <<= BigInt(-lg);
      exp += lg;
    }
    while (val.ge(Fraction.TWO)) {
      val.den <<= 1n;
      exp += 1;
    }
    while (val.lt(Fraction.ONE)) {
      val.num <<= 1n;
      exp -= 1;
    }
    val.cancel();

    // if the exponent would be too big, we call it "infinity"
    if (exp >= IEEE.NaNExp) {
      this.inf = true;
      this.updateBits();
      return;
    }
    if (exp < 2 - IEEE.NaNExp) {
      // for denormalized numbers, we might have to shift the number to
      // the right (which will result in initial zeros in the mantissa);
      // this depends on "exp"
      val = val.div(fractionTimesPower2(1n, 2 - IEEE.NaNExp - exp));
      // always the same exponent
      exp = 1 - IEEE.NaNExp;
    } else {
      // for normalized numbers, subtract one for the "hidden bit"
      val.subInt(1);
    }
    let mantissa: number[] = [];
    let count = 0;
    // now fill the array "mantissa" bit by bit
    while (count < IEEE.mantissaLen) {
      val = val.mult(Fraction.TWO);
      if (val.ge(Fraction.ONE)) {
        mantissa.push(1);
        val = val.sub(Fraction.ONE);
      } else {
        mantissa.push(0);
      }
      count++;
    }
    // "val" has the remainder now, make "count" point to the last bit
    // in "mantissa"
    count = mantissa.length - 1;
    // if the remainder is more than 0.5 or if it is exactly 0.5 and the
    // last bit is a one, we round up
    if (val.gt(Fraction.HALF) || (val.eq(Fraction.HALF) && mantissa[count] == 1)) {
      // we essentially just add one, but we need to watch out for
      // carrys
      while (count >= 0) {
        if (mantissa[count] == 0) {
          mantissa[count] = 1;
          break;
        }
        mantissa[count] = 0;
        count--;
      }
      // if all bits are zero now, the carry went all the way to the
      // left
      if (allZeros(mantissa)) {
        // the number became too big, so it's "Inf" now
        if (exp == IEEE.NaNExp) {
          this.inf = true;
          this.updateBits();
          return;
        }
        // otherwise just increase the exponent; note that this works
        // the same for denormalized numbers
        exp += 1;
      }
    }
    this.mantissa = mantissa;
    this.exp = exp;
  }

  // sets "nan", "inf", and "val" according to the values of "mantissa"
  // and "exp", so this is kind of the inverse to "updateBits"
  fromBits(): void {
    // first the special cases Inf and NaN
    if (this.exp == IEEE.NaNExp) {
      if (allZeros(this.mantissa)) {
        this.inf = true;
        this.nan = false;
      } else {
        this.inf = false;
        this.nan = true;
      }
      return;
    }
    this.nan = false;
    this.inf = false;
    // hidden bit
    let hiddenBit = 1;
    let exp = this.exp;
    if (this.exp == 1 - IEEE.NaNExp) {
      if (allZeros(this.mantissa)) {
        // zero
        this.val = new Fraction(0);
        return;
      } else {
        // denormalized, so hidden bit is zero
        hiddenBit = 0;
        // adjust exp to what it really "means"
        exp = 2 - IEEE.NaNExp;
      }
    }
    // now go through bits and compute value
    const bigVal = BigInt("0b" + hiddenBit.toString() + this.mantissa.join(""));
    // multiply with two times exponent, but also divide by the left
    // shift from the loop above
    const e = exp - IEEE.mantissaLen;
    if (e >= 0)
      this.val = new Fraction(bigVal << BigInt(e));
    else
      this.val = new Fraction(bigVal, 1n << BigInt(-e));
  }

  // returns the numerical value of the IEEE object as a string in
  // decimal format; can't cope with "Inf", "NaN", or zero; based on the
  // Burger/Dybvig algorithm without any effort to make this efficient
  decimalOutput(): string {
    // if the last binary digit of the mantissa is zero, then "low" and
    // "high" (see below) will round to "v" (assuming "round to nearest,
    // ties to even"!)
    const isEven = (this.mantissa[IEEE.mantissaLen - 1] == 0);
    // we will first set "e" and "v" such that the value
    // is "v * 2^e" where "v" is the mantissa interpreted as an integer
    let e: number;
    let v: bigint;
    let denorm: boolean;
    if (this.exp == 1 - IEEE.NaNExp) {
      denorm = true;
      v = 0n;
      e = 1 + this.exp - IEEE.mantissaLen;
    } else {
      denorm = false;
      v = 1n;
      e = this.exp - IEEE.mantissaLen;
    }
    for (let i = 0; i < IEEE.mantissaLen; i++) {
      v *= 2n;
      if (this.mantissa[i])
        v++;
    }
    // now let "succ" be the next representable number and "pred" the
    // previous one
    const succ = fractionTimesPower2(v + 1n, e);
    let pred: Fraction;
    if (!denorm && allZeros(this.mantissa.slice(1)))
      // special case where the mantissa is "10.....0" and the
      // predecessor is thus "11.....1" of the same length but with the
      // exponent being one less
      pred = fractionTimesPower2(v * 2n - 1n, e - 1);
    else
      pred = fractionTimesPower2(v - 1n, e);
    // combine "v" and "e" into one value
    const vFraction = fractionTimesPower2(v, e);
    // "low" is the middle between "v" and "pred"
    const low = vFraction.add(pred);
    // divide by two
    low.den <<= 1n;
    low.cancel();
    // and "high" is the middle between "v" and "succ", so all values
    // between "low" and "high" are OK to represent our "v"
    const high = vFraction.add(succ);
    // divide by two
    high.den <<= 1n;
    high.cancel();

    // now we take the ceiling of the decadic logarithm of "high" and
    // divide "v" by the corresponding power; "k" will be the starting
    // point for the exponent and "q0" (now less than one) for the value
    const k = high.log10();
    let q0 = vFraction.mult(fractionTimesPower10(1n, -k));
    let d: number[] = [];
    // now in a loop extract digits from "q0"; the current digit is
    // called "f", the list of digits is "d"
    while (true) {
      q0.multTen();
      const f = q0.floor();
      d.push(f);
      // "dVal1" is the first candidate: the current list of digits
      const dVal1 = decFromList(d, k);
      // check if it's greater than "low"
      const cond1 = (isEven && dVal1.ge(low)) || dVal1.gt(low);
      let dVal2: Fraction = dVal1; // placeholder, overwritten below
      let cond2: boolean = false;
      let newD: number[] = d;
      if (d[d.length - 1] < 9) {
        // if the last digit of "d" isn't nine, we increase it for the
        // second candidate, "dVal2", which is "one digit greater" than
        // "dVal1"
        newD = d.slice(0, -1).concat([d[d.length - 1] + 1]);
        dVal2 = decFromList(newD, k);
        // check if it's less than "high"
        cond2 = dVal2 && ((isEven && dVal2.le(high)) || dVal2.lt(high));
      } else {
        // if the last digit is nine, adding one would result in a carry
        // and make the number shorter
        cond2 = false;
      }
      if (cond1 && !cond2) {
        // if only "dVal1" is OK, this is it
        return decimalString(this.minus, k, d);
      } else if (cond2 && !cond1) {
        // if only "dVal2" is OK, this is it
        return decimalString(this.minus, k, newD);
      } else if (cond1 && cond2) {
        // if both are OK, take the one closer to "v"
        if (dVal1.sub(vFraction).abs().lt(dVal2.sub(vFraction).abs()))
          return decimalString(this.minus, k, d);
        else
          return decimalString(this.minus, k, newD);
      }
      q0.subInt(f);
    }
  }

  // whether two IEEE objects represent the same value
  eq(other: IEEE): boolean {
    return this.nan == other.nan && this.inf == other.inf && this.minus == other.minus
      && this.mantissa.every((thing, i) => thing == other.mantissa[i]);
  }

  // static methods

  // returns a new IEEE object representing "-0.0"
  static newNegZero(): IEEE {
    const result = new IEEE(0n);
    result.minus = true;
    return result;
  }

  // returns a new IEEE object representing NaN
  static newNaN(): IEEE {
    const result = new IEEE(0n);
    result.nan = true;
    return result;
  }

  // returns a new IEEE object representing Inf or (if "minus" is true) -Inf
  static newInf(minus?: boolean): IEEE {
    const result = new IEEE(0n);
    result.inf = true;
    result.minus = minus ? true : false;
    return result;
  }

  // sets some global values depending on the bit size of the current
  // standard; supported values are 16, 32, 64, and 128
  static switchBitSize(size: number): void {
    size = size || 64;
    IEEE.numberOfBits = size;
    switch (size) {
      case 16:
        // exponent for NaN and Inf
        IEEE.NaNExp = 16;
        // number of bits for significand (without sign and hidden bit)
        IEEE.mantissaLen = 10;
        // regular expression for a bit string of the correct length
        IEEE.binRegex = /^[01]{1,16}$/;
        // regular expression for the corresponding hexadecimal number
        IEEE.hexRegex = /^[0-9a-fA-F]{1,4}$/;
        break;
      case 32:
        IEEE.NaNExp = 128;
        IEEE.mantissaLen = 23;
        IEEE.binRegex = /^[01]{1,32}$/;
        IEEE.hexRegex = /^[0-9a-fA-F]{1,8}$/;
        break;
      case 128:
        IEEE.NaNExp = 16384;
        IEEE.mantissaLen = 112;
        IEEE.binRegex = /^[01]{1,128}$/;
        IEEE.hexRegex = /^[0-9a-fA-F]{1,32}$/;
        break;
      default:
        IEEE.NaNExp = 1024;
        IEEE.mantissaLen = 52;
        IEEE.binRegex = /^[01]{1,64}$/;
        IEEE.hexRegex = /^[0-9a-fA-F]{1,16}$/;
        break;
    }
    IEEE.smallestPositiveHalved = fractionTimesPower2(1n, -IEEE.mantissaLen - IEEE.NaNExp + 1);
  }

  // parses string "str" as a decimal number and converts it into an
  // IEEE object
  static parseDecimal(str: string): IEEE {
    str = str.trim();
    // the various ways to write zero
    let regex = /^([+-])?(?:0(?:\.0*)?|\.00*)(?:E[+-]?\d+)?$/i;
    let match = regex.exec(str);
    if (match) {
      if (match[1] == "-")
        return IEEE.newNegZero();
      else
        return new IEEE(0n);
    }
    // general format with regex groups for sign, (decimal) mantissa,
    // and exponent
    regex = /^([+-])?(\d+(?:\.\d*)?|\.\d\d*)(?:E([+-]?\d{1,5}))?$/i;
    match = regex.exec(str);
    if (!match)
      return IEEE.newNaN();
    let mantissa = match[2]!;
    let exp = parseInt(match[3] || "0");
    // remove leading zeros
    while (mantissa[0] == "0")
      mantissa = mantissa.slice(1);
    // but we need one in front of the decimal point
    if (mantissa[0] == ".")
      mantissa = "0" + mantissa;
    // mark where the point is
    const dot = mantissa.indexOf(".");
    if (dot != -1) {
      // if there is a point, remove trailing zeros
      while (mantissa[mantissa.length - 1] == "0")
        mantissa = mantissa.slice(0, -1);
      // remove point and adjust exponent accordingly
      exp -= mantissa.length - dot - 1;
      mantissa = mantissa.slice(0, dot) + mantissa.slice(dot + 1);
    }
    let big = BigInt(mantissa);
    if (match[1] == "-")
      big = -big;
    return new IEEE(fractionTimesPower10(big, exp));
  }

  // regular expression for fraction syntax
  private static fractionRegex = /^([+-])?(\d+)\/(\d+)$/;

  // parses string "str" as a fraction and converts it into an IEEE
  // object
  static parseFraction(str: string): IEEE {
    str = str.trim();
    const match = IEEE.fractionRegex.exec(str);
    if (!match)
      return IEEE.newNaN();
    let sign = match[1];
    if (sign != "-")
      sign = "+";
    const num = BigInt(match[2]!);
    const den = BigInt(match[3]!);
    // could be NaN or Inf if denominator is zero
    if (den == 0n)
      return num == 0n ? IEEE.newNaN() : IEEE.newInf(sign == "-");
    if (num == 0n) {
      // is zero if numerator is zero
      if (sign == "-")
        return IEEE.newNegZero();
      else
        return new IEEE(0n);
    }
    // "normal" fraction
    return new IEEE(new Fraction(sign == "-" ? -num : num, den));
  }

  // parses string "str" as a sequence of binary digits to be converted
  // into an IEEE object
  static parseBin(str: string): IEEE {
    str = str.trim();
    if (!IEEE.binRegex.exec(str))
      return IEEE.newNaN();
    // fill with zeros at the beginning if necessary
    str = "0".repeat(IEEE.numberOfBits - str.length) + str;
    const ieee = new IEEE(0n);
    // create an array of ones and zeros from the string
    const bits = str.split("").map(x => parseInt(x));
    // split into parts
    ieee.minus = (bits[0] == 1);
    ieee.exp = parseInt(str.slice(1, IEEE.numberOfBits - IEEE.mantissaLen), 2) - IEEE.NaNExp + 1;
    ieee.mantissa = bits.slice(IEEE.numberOfBits - IEEE.mantissaLen);
    // set value from bits
    ieee.fromBits();
    return ieee;
  }

  // parses string "str" as a sequence of hexadecimal digits to be
  // converted into an IEEE object
  static parseHex(str: string): IEEE {
    str = str.trim();
    if (!IEEE.hexRegex.exec(str))
      return IEEE.newNaN();
    let binStr = "";
    // go through the digits and convert each to four bits
    for (let i = 0; i < str.length; i++) {
      let digits = Number(parseInt(str[i]!, 16)).toString(2);
      digits = "0".repeat(4 - digits.length) + digits;
      binStr += digits;
    }
    // let the other function do the rest
    return IEEE.parseBin(binStr);
  }

  // general parsing function to combine all the specialized parsing
  // functions from above
  static parse(str: string): IEEE {
    str = str.trim();
    let regex = /^nan$/i;
    if (regex.exec(str))
      return IEEE.newNaN();
    regex = /^([+-])?inf$/i;
    const match = regex.exec(str);
    if (match)
      return IEEE.newInf(match[1] == "-");
    regex = /^0b/i;
    if (regex.exec(str))
      return IEEE.parseBin(str.slice(2));
    regex = /^0x/i;
    if (regex.exec(str))
      return IEEE.parseHex(str.slice(2));
    if (IEEE.fractionRegex.exec(str))
      return IEEE.parseFraction(str);
    return IEEE.parseDecimal(str);
  }
}

// constructs a Fraction object from a list of decimal digits; if for
// example "L" is [3, 4, 5] and "k" is 2, this is interpreted as "0.345 * 10^2"
function decFromList(L: number[], k: number): Fraction {
  const str = L.join("");
  k -= L.length;
  if (k >= 0)
    return new Fraction(BigInt(str + "0".repeat(k)));
  else
    return new Fraction(BigInt(str), 10n ** BigInt(-k));
}

// generates the string for the function above; receives as input a
// boolean (whether the number is negative), an exponent, and a list
// of digits; the latter two arguments are interpreted as in
// "decFromList"
function decimalString(minus: boolean, exp: number, digits: number[]): string {
  let size: number;
  // set a meaningful maximal length for numbers which aren't shown in
  // scientific notation if possible
  switch (IEEE.numberOfBits) {
    case 16: size = 5; break;
    case 32: size = 9; break;
    case 128: size = 36; break;
    default: size = 17; break;
  }

  const sign = minus ? "-" : "";
  if (exp >= digits.length && exp < size)
    // integers which can be shown without an exponent
    return sign + digits.join("") + "0".repeat(exp - digits.length) + ".0";
  if (exp < 1 && digits.length - exp <= size)
    // absolute value smaller than one and can be shown without
    // exponent
    return sign + "0." + "0".repeat(-exp) + digits.join("");
  // by default, the decimal point comes after the first digit
  let index = 1;
  // but shift it if possible
  if (exp >= 1 && exp < digits.length)
    index = exp;
  let str = sign + digits.slice(0, index).join("");
  if (index < digits.length)
    str += "." + digits.slice(index).join("");
  if (exp != index)
    str += "E" + (exp - index);
  return str;
}

// default
IEEE.switchBitSize(64);

export default IEEE;
