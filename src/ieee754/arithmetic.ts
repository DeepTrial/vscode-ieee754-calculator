// Copyright (c) 2016-2023, Dr. Edmund Weitz
// Ported to TypeScript from the website's code.js

import Fraction from "./Fraction";
import IEEE from "./IEEE";

// converts binary numbers (given as a string) into a hexadecimal
// number; assumes length of "binStr" is divisible by 4
export function binStrToHex(binStr: string): string {
  let hexStr = "";
  for (let i = 0; i + 3 < binStr.length; i += 4)
    hexStr += parseInt(binStr.slice(i, i + 4), 2).toString(16);
  return hexStr.toUpperCase();
}

// computes the sum of two IEEE objects and returns it as an IEEE
// object; assumes that its arguments aren't NaNs
export function addThem(a: IEEE, b: IEEE): IEEE {
  // treat Inf first
  if (a.inf || b.inf) {
    if (!b.inf)
      return IEEE.newInf(a.minus);
    if (!a.inf)
      return IEEE.newInf(b.minus);
    if (a.minus == b.minus)
      return IEEE.newInf(a.minus);
    return IEEE.newNaN();
  }
  // special case, see https://en.wikipedia.org/wiki/Signed_zero
  if (a.isZero() && b.isZero() && a.minus && b.minus)
    return IEEE.newNegZero();
  let val: Fraction;
  // do the right thing depending on the sign
  if ((!a.minus) == (!b.minus)) {
    val = a.val.add(b.val);
    if (a.minus)
      val = val.mult(Fraction.MINUSONE);
  } else {
    if (a.minus)
      val = b.val.sub(a.val);
    else
      val = a.val.sub(b.val);
  }
  return new IEEE(val);
}

// computes the difference of two IEEE objects and returns it as an
// IEEE object; assumes that its arguments aren't NaNs
export function subtractThem(a: IEEE, b: IEEE): IEEE {
  const subtrahend = b.inf ? IEEE.newInf(b.minus) : new IEEE(b.val);
  subtrahend.minus = !b.minus;
  return addThem(a, subtrahend);
}

// computes the product of two IEEE objects and returns it as an IEEE
// object; assumes that its arguments aren't NaNs
export function multiplyThem(a: IEEE, b: IEEE): IEEE {
  const signsDiffer = (!a.minus) != (!b.minus);
  // treat Inf first
  if (a.inf || b.inf) {
    if (a.isZero() || b.isZero())
      return IEEE.newNaN();
    return IEEE.newInf(signsDiffer);
  }
  const product = new IEEE(a.val.mult(b.val));
  product.minus = signsDiffer;
  return product;
}

// computes the quotient of two IEEE objects and returns it as an IEEE
// object; assumes that its arguments aren't NaNs
export function divideThem(a: IEEE, b: IEEE): IEEE {
  const signsDiffer = (!a.minus) != (!b.minus);
  // treat Infs first
  if (a.inf && b.inf)
    return IEEE.newNaN();
  if (a.inf)
    return IEEE.newInf(signsDiffer);
  if (b.inf)
    return signsDiffer ? IEEE.newNegZero() : new IEEE(0n);
  if (b.isZero()) {
    if (a.isZero())
      return IEEE.newNaN();
    else
      return IEEE.newInf(signsDiffer);
  }
  const quotient = new IEEE(a.val.div(b.val));
  quotient.minus = signsDiffer;
  return quotient;
}

// dispatcher that handles NaN propagation and calls the right
// arithmetic function; "op" is one of "+", "-", "*", "/"
export function compute(op: string, a: IEEE, b: IEEE): IEEE {
  // NaN propagates through any operation
  if (a.nan || b.nan)
    return IEEE.newNaN();
  switch (op) {
    case "+": return addThem(a, b);
    case "-": return subtractThem(a, b);
    case "*": return multiplyThem(a, b);
    case "/": return divideThem(a, b);
    default: return IEEE.newNaN();
  }
}
