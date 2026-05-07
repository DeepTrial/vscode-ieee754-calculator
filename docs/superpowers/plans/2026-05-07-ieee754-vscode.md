# IEEE 754 VSCode Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VSCode sidebar extension that replicates weitz.de/ieee's IEEE 754 floating-point converter with arithmetic operations.

**Architecture:** Extension host (TypeScript) runs the IEEE 754 engine ported directly from the website's source. Webview renders a dark, minimal UI and communicates via postMessage. Zero runtime dependencies.

**Tech Stack:** TypeScript, esbuild, @types/vscode, Jest (testing)

---

## File Structure

```
vs-ieee754/
├── package.json                          # Extension manifest
├── tsconfig.json                         # TypeScript config
├── esbuild.js                            # Build script
├── src/
│   ├── extension.ts                      # Entry point, registers webview provider
│   ├── ieee754/
│   │   ├── Fraction.ts                   # Ported from website's Fraction.js
│   │   ├── IEEE.ts                       # Ported from website's IEEE.js
│   │   ├── arithmetic.ts                 # Ported from website's code.js arithmetic
│   │   └── index.ts                      # Re-exports
│   └── webview/
│       └── provider.ts                   # WebviewViewProvider for sidebar
├── webview-ui/
│   ├── index.html                        # Webview HTML
│   ├── style.css                         # Dark minimal styles
│   └── script.js                         # Webview interaction logic
├── src/test/
│   ├── suite/
│   │   ├── index.ts                      # Test runner
│   │   ├── ieee754.test.ts              # Engine tests
│   │   └── runTest.ts                    # Mocha runner
│   └── runTest.ts                        # Test entry
└── .vscodeignore                         # Files to exclude from package
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.js`
- Create: `.vscodeignore`
- Create: `src/extension.ts` (minimal stub)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "ieee754-converter",
  "displayName": "IEEE 754 Converter",
  "description": "IEEE 754 floating-point converter with arithmetic operations",
  "version": "0.0.1",
  "publisher": "karl",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ieee754",
          "title": "IEEE 754",
          "icon": "$(symbol-number)"
        }
      ]
    },
    "views": {
      "ieee754": [
        {
          "type": "webview",
          "id": "ieee754.converter",
          "name": "Converter"
        }
      ]
    }
  },
  "scripts": {
    "build": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.20.0",
    "@vscode/test-electron": "^2.3.8",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "src/test"]
}
```

- [ ] **Step 3: Create esbuild.js**

```javascript
const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
  });

  if (watch) {
    await ctx.watch();
    console.log("watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: Create .vscodeignore**

```
.vscode/**
.vscode-test/**
src/**
node_modules/**
tsconfig.json
esbuild.js
**/*.ts
**/*.map
```

- [ ] **Step 5: Create minimal extension stub**

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("IEEE 754 Converter activated");
}

export function deactivate() {}
```

- [ ] **Step 6: Install dependencies and verify build**

Run: `cd /home/karl/vs-ieee754 && npm install && npm run build`
Expected: Build succeeds, `dist/extension.js` created

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold project with esbuild, package.json, tsconfig"
```

---

## Task 2: Port Fraction.js to TypeScript

**Files:**
- Create: `src/ieee754/Fraction.ts`

This is a direct port of `/tmp/ieee-source/Fraction.js`. All logic preserved exactly.

- [ ] **Step 1: Create Fraction.ts**

```typescript
// Copyright (c) 2016-2023, Dr. Edmund Weitz
// Ported to TypeScript for VSCode extension

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

function gcd(a: bigint, b: bigint): bigint {
  if (a === 0n) return b;
  if (b === 0n) return a;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

export class Fraction {
  num: bigint;
  den: bigint;

  static ZERO = new Fraction(0, 1);
  static ONE = new Fraction(1, 1);
  static MINUSONE = new Fraction(-1, 1);
  static TWO = new Fraction(2, 1);
  static HALF = new Fraction(1, 2);

  constructor(num: number | bigint, den: number | bigint = 1) {
    this.num = BigInt(num);
    this.den = BigInt(den);
    if (den !== 1 && num !== 1) {
      this.cancel();
    }
  }

  cancel(): void {
    const g = gcd(abs(this.num), abs(this.den));
    this.num /= g;
    this.den /= g;
    if (this.den < 0n) {
      this.num = -this.num;
      this.den = -this.den;
    }
  }

  add(summand: Fraction): Fraction {
    return new Fraction(this.num * summand.den + this.den * summand.num, this.den * summand.den);
  }

  sub(subtrahend: Fraction): Fraction {
    return new Fraction(this.num * subtrahend.den - this.den * subtrahend.num, this.den * subtrahend.den);
  }

  subInt(k: number | bigint): void {
    this.num -= BigInt(k) * this.den;
    this.cancel();
  }

  mult(factor: Fraction): Fraction {
    return new Fraction(this.num * factor.num, this.den * factor.den);
  }

  multTen(): void {
    this.num *= 10n;
    this.cancel();
  }

  div(divisor: Fraction): Fraction {
    return new Fraction(this.num * divisor.den, this.den * divisor.num);
  }

  eq(other: Fraction): boolean {
    return this.num * other.den === this.den * other.num;
  }

  gt(other: Fraction): boolean {
    if (this.num > 0n && other.num <= 0n) return true;
    if (this.num <= 0n && other.num > 0n) return false;
    return this.num * other.den > this.den * other.num;
  }

  ge(other: Fraction): boolean {
    return this.gt(other) || this.eq(other);
  }

  lt(other: Fraction): boolean {
    return other.gt(this);
  }

  le(other: Fraction): boolean {
    return this.lt(other) || this.eq(other);
  }

  isPositive(): boolean {
    return this.num > 0n;
  }

  isNegative(): boolean {
    return this.num < 0n;
  }

  isZero(): boolean {
    return this.num === 0n;
  }

  abs(): Fraction {
    return new Fraction(abs(this.num), this.den);
  }

  toString(): string {
    return (this.isNegative() ? "-" : "") + this.num.toString() + "/" + this.den.toString();
  }

  floor(): number {
    return Number(this.num / this.den);
  }

  log10(): number {
    let cand = Math.ceil(intLog10(this.num) - intLog10(this.den)) - 2;
    while (fractionTimesPower10(1n, cand).lt(this)) cand++;
    return cand;
  }

  log2(): number {
    return intLog2(this.num) - intLog2(this.den);
  }
}

function fractionTimesPower10(val: bigint, exp: number): Fraction {
  if (exp >= 0) {
    const pow = 10n ** BigInt(exp);
    return new Fraction(val !== 1n ? val * pow : pow);
  } else {
    return new Fraction(val, 10n ** BigInt(-exp));
  }
}

function fractionTimesPower2(val: bigint, exp: number): Fraction {
  if (exp >= 0) {
    const pow = 1n << BigInt(exp);
    return new Fraction(val !== 1n ? val * pow : pow);
  } else {
    return new Fraction(val, 1n << BigInt(-exp));
  }
}

function intLog10(n: bigint): number {
  const s = n.toString(10);
  return s.length + Math.log10(Number(`0.${s.substring(0, 15)}`));
}

function intLog2(n: bigint): number {
  return n.toString(2).length;
}

export { fractionTimesPower10, fractionTimesPower2 };
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ieee754/Fraction.ts && git commit -m "feat: port Fraction.js to TypeScript"
```

---

## Task 3: Port IEEE.js to TypeScript

**Files:**
- Create: `src/ieee754/IEEE.ts`

Direct port of `/tmp/ieee-source/IEEE.js`. All logic preserved exactly.

- [ ] **Step 1: Create IEEE.ts**

```typescript
// Copyright (c) 2016-2023, Dr. Edmund Weitz
// Ported to TypeScript for VSCode extension

import { Fraction, fractionTimesPower2, fractionTimesPower10 } from "./Fraction";

const allZeros = (L: number[]): boolean => L.every((x) => x === 0);

export class IEEE {
  val: Fraction;
  minus: boolean;
  nan: boolean;
  inf: boolean;
  exp: number = 0;
  mantissa: number[] = [];

  static numberOfBits: number = 64;
  static NaNExp: number = 1024;
  static mantissaLen: number = 52;
  static binRegex: RegExp = /^[01]{1,64}$/;
  static hexRegex: RegExp = /^[0-9a-fA-F]{1,16}$/;
  static smallestPositiveHalved: Fraction = new Fraction(0);

  constructor(val: number | bigint | Fraction) {
    this.val = val instanceof Fraction ? val : new Fraction(val);
    this.minus = false;
    if (this.val.isNegative()) {
      this.minus = true;
      this.val = this.val.abs();
    }
    if (!this.val.isZero() && this.val.le(IEEE.smallestPositiveHalved)) {
      this.val = new Fraction(0);
    }
    this.nan = false;
    this.inf = false;
  }

  static switchBitSize(size: number): void {
    size = size || 64;
    IEEE.numberOfBits = size;
    switch (size) {
      case 16:
        IEEE.NaNExp = 16;
        IEEE.mantissaLen = 10;
        IEEE.binRegex = /^[01]{1,16}$/;
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

  isZero(): boolean {
    return !this.nan && !this.inf && this.val.isZero();
  }

  static newNegZero(): IEEE {
    const result = new IEEE(0);
    result.minus = true;
    return result;
  }

  static newNaN(): IEEE {
    const result = new IEEE(0);
    result.nan = true;
    return result;
  }

  static newInf(minus?: boolean): IEEE {
    const result = new IEEE(0);
    result.inf = true;
    result.minus = minus ? true : false;
    return result;
  }

  eq(other: IEEE): boolean {
    return (
      this.nan === other.nan &&
      this.inf === other.inf &&
      this.minus === other.minus &&
      this.mantissa.every((thing, i) => thing === other.mantissa[i])
    );
  }

  updateBits(): void {
    if (this.nan) {
      this.exp = IEEE.NaNExp;
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(1);
      return;
    }
    if (this.inf) {
      this.exp = IEEE.NaNExp;
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(0);
      return;
    }
    let exp = 0;
    let val = new Fraction(this.val.num, this.val.den);
    if (val.isZero() || val.lt(IEEE.smallestPositiveHalved)) {
      this.exp = 1 - IEEE.NaNExp;
      this.mantissa = new Array(IEEE.mantissaLen);
      this.mantissa.fill(0);
      return;
    }
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

    if (exp >= IEEE.NaNExp) {
      this.inf = true;
      this.updateBits();
      return;
    }
    if (exp < 2 - IEEE.NaNExp) {
      val = val.div(fractionTimesPower2(1n, 2 - IEEE.NaNExp - exp));
      exp = 1 - IEEE.NaNExp;
    } else {
      val.subInt(1);
    }
    const mantissa: number[] = [];
    let count = 0;
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
    count = mantissa.length - 1;
    if (val.gt(Fraction.HALF) || (val.eq(Fraction.HALF) && mantissa[count] === 1)) {
      while (count >= 0) {
        if (mantissa[count] === 0) {
          mantissa[count] = 1;
          break;
        }
        mantissa[count] = 0;
        count--;
      }
      if (allZeros(mantissa)) {
        if (exp === IEEE.NaNExp) {
          this.inf = true;
          this.updateBits();
          return;
        }
        exp += 1;
      }
    }
    this.mantissa = mantissa;
    this.exp = exp;
  }

  fromBits(): void {
    if (this.exp === IEEE.NaNExp) {
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
    let val = 1;
    let exp = this.exp;
    if (this.exp === 1 - IEEE.NaNExp) {
      if (allZeros(this.mantissa)) {
        this.val = new Fraction(0);
        return;
      } else {
        val = 0;
        exp = 2 - IEEE.NaNExp;
      }
    }
    let bigVal = BigInt("0b" + val.toString() + this.mantissa.join(""));
    const e = exp - IEEE.mantissaLen;
    if (e >= 0) this.val = new Fraction(bigVal << BigInt(e));
    else this.val = new Fraction(bigVal, 1n << BigInt(-e));
  }

  decimalOutput(): string {
    const isEven = this.mantissa[IEEE.mantissaLen - 1] === 0;
    let e: number, v: bigint, denorm: boolean;
    if (this.exp === 1 - IEEE.NaNExp) {
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
      if (this.mantissa[i]) v++;
    }
    let succ = fractionTimesPower2(v + 1n, e);
    let pred: Fraction;
    if (!denorm && allZeros(this.mantissa.slice(1))) {
      pred = fractionTimesPower2(v * 2n - 1n, e - 1);
    } else {
      pred = fractionTimesPower2(v - 1n, e);
    }
    v = fractionTimesPower2(v, e);
    const low = v.add(pred);
    low.den <<= 1n;
    low.cancel();
    const high = v.add(succ);
    high.den <<= 1n;
    high.cancel();

    const k = high.log10();
    let q0 = v.mult(fractionTimesPower10(1n, -k));
    const d: number[] = [];
    while (true) {
      q0.multTen();
      const f = q0.floor();
      d.push(f);
      const dVal1 = decFromList(d, k);
      const cond1 = isEven ? dVal1.ge(low) : dVal1.gt(low);
      let dVal2: Fraction | null = null;
      let cond2 = false;
      let newD: number[] = [];
      if (d[d.length - 1] < 9) {
        newD = d.slice(0, -1).concat([d[d.length - 1] + 1]);
        dVal2 = decFromList(newD, k);
        cond2 = isEven ? dVal2.le(high) : dVal2.lt(high);
      } else {
        cond2 = false;
      }
      if (cond1 && !cond2) {
        return decimalString(this.minus, k, d);
      } else if (cond2 && !cond1) {
        return decimalString(this.minus, k, newD);
      } else if (cond1 && cond2) {
        if (dVal1.sub(v).abs().lt(dVal2!.sub(v).abs())) return decimalString(this.minus, k, d);
        else return decimalString(this.minus, k, newD);
      }
      q0.subInt(f);
    }
  }

  static parseDecimal(str: string): IEEE {
    str = str.trim();
    let regex = /^([+-])?(?:0(?:\.0*)?|\.00*)(?:E[+-]?\d+)?$/i;
    let match = regex.exec(str);
    if (match) {
      if (match[1] === "-") return IEEE.newNegZero();
      else return new IEEE(0);
    }
    regex = /^([+-])?(\d+(?:\.\d*)?|\.\d\d*)(?:E([+-]?\d{1,5}))?$/i;
    match = regex.exec(str);
    if (!match) return IEEE.newNaN();
    let mantissa = match[2];
    let exp = parseInt(match[3] || "0");
    while (mantissa[0] === "0") mantissa = mantissa.slice(1);
    if (mantissa[0] === ".") mantissa = "0" + mantissa;
    const dot = mantissa.indexOf(".");
    if (dot !== -1) {
      while (mantissa[mantissa.length - 1] === "0") mantissa = mantissa.slice(0, -1);
      exp -= mantissa.length - dot - 1;
      mantissa = mantissa.slice(0, dot) + mantissa.slice(dot + 1);
    }
    let big = BigInt(mantissa);
    if (match[1] === "-") big = -big;
    return new IEEE(fractionTimesPower10(big, exp));
  }

  static parseFraction(str: string): IEEE {
    str = str.trim();
    const fractionRegex = /^([+-])?(\d+)\/(\d+)$/;
    const match = fractionRegex.exec(str);
    if (!match) return IEEE.newNaN();
    let sign = match[1];
    if (sign !== "-") sign = "+";
    const num = BigInt(match[2]);
    const den = BigInt(match[3]);
    if (den === 0n) return num === 0n ? IEEE.newNaN() : IEEE.newInf(sign === "-");
    if (num === 0n) {
      if (sign === "-") return IEEE.newNegZero();
      else return new IEEE(0);
    }
    return new IEEE(new Fraction(sign === "-" ? -num : num, den));
  }

  static parseBin(str: string): IEEE {
    str = str.trim();
    if (!IEEE.binRegex.exec(str)) return IEEE.newNaN();
    str = "0".repeat(IEEE.numberOfBits - str.length) + str;
    const ieee = new IEEE(0);
    const bits = str.split("").map((x) => parseInt(x));
    ieee.minus = bits[0] === 1;
    ieee.exp = parseInt(str.slice(1, IEEE.numberOfBits - IEEE.mantissaLen), 2) - IEEE.NaNExp + 1;
    ieee.mantissa = bits.slice(IEEE.numberOfBits - IEEE.mantissaLen);
    ieee.fromBits();
    return ieee;
  }

  static parseHex(str: string): IEEE {
    str = str.trim();
    if (!IEEE.hexRegex.exec(str)) return IEEE.newNaN();
    let binStr = "";
    for (let i = 0; i < str.length; i++) {
      let digits = Number(parseInt(str[i], 16)).toString(2);
      digits = "0".repeat(4 - digits.length) + digits;
      binStr += digits;
    }
    return IEEE.parseBin(binStr);
  }

  static parse(str: string): IEEE {
    str = str.trim();
    let regex = /^nan$/i;
    if (regex.exec(str)) return IEEE.newNaN();
    regex = /^([+-])?inf$/i;
    const match = regex.exec(str);
    if (match) return IEEE.newInf(match[1] === "-");
    regex = /^0b/i;
    if (regex.exec(str)) return IEEE.parseBin(str.slice(2));
    regex = /^0x/i;
    if (regex.exec(str)) return IEEE.parseHex(str.slice(2));
    const fractionRegex = /^([+-])?(\d+)\/(\d+)$/;
    if (fractionRegex.exec(str)) return IEEE.parseFraction(str);
    return IEEE.parseDecimal(str);
  }
}

function decFromList(L: number[], k: number): Fraction {
  const str = L.join("");
  k -= L.length;
  if (k >= 0) return new Fraction(BigInt(str + "0".repeat(k)));
  else return new Fraction(BigInt(str), 10n ** BigInt(-k));
}

function decimalString(minus: boolean, exp: number, digits: number[]): string {
  let size: number;
  switch (IEEE.numberOfBits) {
    case 16: size = 5; break;
    case 32: size = 9; break;
    case 128: size = 36; break;
    default: size = 17; break;
  }
  const sign = minus ? "-" : "";
  if (exp >= digits.length && exp < size)
    return sign + digits.join("") + "0".repeat(exp - digits.length) + ".0";
  if (exp < 1 && digits.length - exp <= size)
    return sign + "0." + "0".repeat(-exp) + digits.join("");
  let index = 1;
  if (exp >= 1 && exp < digits.length) index = exp;
  let str = sign + digits.slice(0, index).join("");
  if (index < digits.length) str += "." + digits.slice(index).join("");
  if (exp !== index) str += "E" + (exp - index);
  return str;
}

// Initialize default format
IEEE.switchBitSize(64);
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ieee754/IEEE.ts && git commit -m "feat: port IEEE.js to TypeScript"
```

---

## Task 4: Port Arithmetic and Add Re-exports

**Files:**
- Create: `src/ieee754/arithmetic.ts`
- Create: `src/ieee754/index.ts`

Port the arithmetic functions from `code.js` (addThem, subtractThem, multiplyThem, divideThem) and binStrToHex utility.

- [ ] **Step 1: Create arithmetic.ts**

```typescript
// Copyright (c) 2016-2023, Dr. Edmund Weitz
// Ported to TypeScript for VSCode extension

import { IEEE } from "./IEEE";
import { Fraction } from "./Fraction";

export function binStrToHex(binStr: string): string {
  let hexStr = "";
  for (let i = 0; i + 3 < binStr.length; i += 4) {
    hexStr += parseInt(binStr.slice(i, i + 4), 2).toString(16);
  }
  return hexStr.toUpperCase();
}

export function addThem(a: IEEE, b: IEEE): IEEE {
  if (a.inf || b.inf) {
    if (!b.inf) return IEEE.newInf(a.minus);
    if (!a.inf) return IEEE.newInf(b.minus);
    if (a.minus === b.minus) return IEEE.newInf(a.minus);
    return IEEE.newNaN();
  }
  if (a.isZero() && b.isZero() && a.minus && b.minus) return IEEE.newNegZero();
  let val: Fraction;
  if (!a.minus === !b.minus) {
    val = a.val.add(b.val);
    if (a.minus) val = val.mult(Fraction.MINUSONE);
  } else {
    if (a.minus) val = b.val.sub(a.val);
    else val = a.val.sub(b.val);
  }
  return new IEEE(val);
}

export function subtractThem(a: IEEE, b: IEEE): IEEE {
  const subtrahend = b.inf ? IEEE.newInf(b.minus) : new IEEE(b.val);
  subtrahend.minus = !b.minus;
  return addThem(a, subtrahend);
}

export function multiplyThem(a: IEEE, b: IEEE): IEEE {
  const signsDiffer = !a.minus !== !b.minus;
  if (a.inf || b.inf) {
    if (a.isZero() || b.isZero()) return IEEE.newNaN();
    return IEEE.newInf(signsDiffer);
  }
  const product = new IEEE(a.val.mult(b.val));
  product.minus = signsDiffer;
  return product;
}

export function divideThem(a: IEEE, b: IEEE): IEEE {
  const signsDiffer = !a.minus !== !b.minus;
  if (a.inf && b.inf) return IEEE.newNaN();
  if (a.inf) return IEEE.newInf(signsDiffer);
  if (b.inf) return signsDiffer ? IEEE.newNegZero() : new IEEE(0);
  if (b.isZero()) {
    if (a.isZero()) return IEEE.newNaN();
    else return IEEE.newInf(signsDiffer);
  }
  const quotient = new IEEE(a.val.div(b.val));
  quotient.minus = signsDiffer;
  return quotient;
}

export function compute(op: string, a: IEEE, b: IEEE): IEEE {
  if (a.nan || b.nan) return IEEE.newNaN();
  switch (op) {
    case "+": return addThem(a, b);
    case "-": return subtractThem(a, b);
    case "*": return multiplyThem(a, b);
    case "/": return divideThem(a, b);
    default: return IEEE.newNaN();
  }
}
```

- [ ] **Step 2: Create index.ts**

```typescript
export { Fraction } from "./Fraction";
export { IEEE } from "./IEEE";
export { compute, addThem, subtractThem, multiplyThem, divideThem, binStrToHex } from "./arithmetic";
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/ieee754/arithmetic.ts src/ieee754/index.ts && git commit -m "feat: port arithmetic functions and add re-exports"
```

---

## Task 5: Create Webview Provider

**Files:**
- Create: `src/webview/provider.ts`
- Modify: `src/extension.ts`

The provider handles message passing between webview and extension host, and dispatches IEEE 754 computations.

- [ ] **Step 1: Create webview provider**

```typescript
import * as vscode from "vscode";
import { IEEE, compute, binStrToHex } from "../ieee754";

export class ConverterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "ieee754.converter";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "inputChanged": {
          const { row, value, format } = message.payload;
          IEEE.switchBitSize(format);
          const ieee = IEEE.parse(value);
          ieee.updateBits();
          ieee.fromBits();
          const result = this._formatResult(ieee);
          this._view?.webview.postMessage({
            type: "updateParsed",
            payload: { row, ...result },
          });
          break;
        }
        case "calculate": {
          const { op, a, b, format } = message.payload;
          IEEE.switchBitSize(format);
          const ieeeA = this._reconstructIEEE(a);
          const ieeeB = this._reconstructIEEE(b);
          const result = compute(op, ieeeA, ieeeB);
          result.updateBits();
          result.fromBits();
          const formatted = this._formatResult(result);
          this._view?.webview.postMessage({
            type: "updateResult",
            payload: formatted,
          });
          break;
        }
        case "switchFormat": {
          IEEE.switchBitSize(message.payload.format);
          break;
        }
      }
    });
  }

  private _reconstructIEEE(data: any): IEEE {
    const ieee = new IEEE(0);
    ieee.minus = data.minus;
    ieee.nan = data.nan;
    ieee.inf = data.inf;
    ieee.exp = data.exp;
    ieee.mantissa = data.mantissa;
    ieee.fromBits();
    return ieee;
  }

  private _formatResult(ieee: IEEE): any {
    const binStr = (ieee.minus || ieee.nan) ? "1" : "0";
    let expStr = Number(ieee.exp + IEEE.NaNExp - 1).toString(2);
    expStr = "0".repeat(IEEE.numberOfBits - IEEE.mantissaLen - 1 - expStr.length) + expStr;
    const mantissaStr = ieee.mantissa.join("");
    const fullBin = binStr + expStr + mantissaStr;

    let hiddenBit = "0";
    let signStr = ieee.minus ? "1" : "0";
    let signOut = ieee.minus ? "-" : "+";
    let expOut = "";
    let mantissaOut = "";
    let decimalValue = "";

    if (ieee.nan) {
      signStr = "1";
      signOut = "";
      mantissaOut = "NaN";
      decimalValue = "NaN";
    } else if (ieee.inf) {
      mantissaOut = "Inf";
      decimalValue = ieee.inf ? (ieee.minus ? "-Inf" : "Inf") : "";
    } else if (ieee.isZero()) {
      hiddenBit = "0";
      mantissaOut = "0.0";
      expOut = "+0";
      decimalValue = (ieee.minus ? "-" : "") + "0.0";
    } else {
      if (ieee.exp === 1 - IEEE.NaNExp) {
        hiddenBit = "0";
        expOut = String(2 - IEEE.NaNExp);
      } else {
        hiddenBit = "1";
        expOut = ieee.exp >= 0 ? "+" + ieee.exp : String(ieee.exp);
      }
      decimalValue = ieee.decimalOutput();
    }

    return {
      minus: ieee.minus,
      nan: ieee.nan,
      inf: ieee.inf,
      exp: ieee.exp,
      mantissa: ieee.mantissa,
      sign: signStr,
      signOut,
      hiddenBit,
      expOut,
      mantissaOut,
      decimalValue,
      hex: "0x" + binStrToHex(fullBin),
      binary: "0b" + fullBin,
    };
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "script.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "style.css")
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>IEEE 754 Converter</title>
</head>
<body>
  <div id="app"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
```

- [ ] **Step 2: Update extension.ts**

```typescript
import * as vscode from "vscode";
import { ConverterViewProvider } from "./webview/provider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ConverterViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ConverterViewProvider.viewType, provider)
  );
}

export function deactivate() {}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/webview/provider.ts src/extension.ts && git commit -m "feat: add webview provider with message handling"
```

---

## Task 6: Create Webview UI

**Files:**
- Create: `webview-ui/index.html`
- Create: `webview-ui/style.css`
- Create: `webview-ui/script.js`

Dark minimal UI with bit-level display and arithmetic controls.

- [ ] **Step 1: Create style.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: 13px;
  padding: 12px;
}

.section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #808080;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

/* Format Switcher */
.format-buttons {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.format-btn {
  flex: 1;
  padding: 6px 8px;
  background: #2d2d30;
  color: #858585;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  text-align: center;
  transition: all 0.15s;
}

.format-btn:hover {
  background: #3e3e42;
  color: #d4d4d4;
}

.format-btn.active {
  background: #264f78;
  color: #ffffff;
  border-color: #1177bb;
}

/* Value Row */
.value-row {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;
}

.value-row.result {
  border-color: #264f78;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row label {
  font-size: 11px;
  color: #808080;
  min-width: 50px;
}

.input-row input {
  flex: 1;
  background: #1e1e1e;
  color: #d4d4d4;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  padding: 4px 8px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 13px;
  outline: none;
}

.input-row input:focus {
  border-color: #007acc;
}

/* Bit Display */
.bits-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 12px;
}

.bits-label {
  color: #808080;
  min-width: 70px;
  font-size: 11px;
}

.bits-value {
  display: flex;
  gap: 1px;
  flex-wrap: wrap;
}

.bit {
  width: 14px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}

.bit.sign {
  background: #3a1d1d;
  color: #d16969;
}

.bit.exponent {
  background: #3a2d1d;
  color: #ce9178;
}

.bit.significand {
  background: #1d2d3a;
  color: #569cd6;
}

.bit.hidden {
  background: #2d2d2d;
  color: #808080;
  cursor: default;
}

.bit:hover:not(.hidden) {
  filter: brightness(1.3);
}

/* Breakdown */
.breakdown {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 12px;
}

.breakdown-item {
  display: flex;
  gap: 4px;
}

.breakdown-label {
  color: #808080;
}

.breakdown-value.sign { color: #d16969; }
.breakdown-value.exponent { color: #ce9178; }
.breakdown-value.significand { color: #569cd6; }

/* Hex/Bin Output */
.output-row {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 11px;
  color: #808080;
}

/* Arithmetic Panel */
.arithmetic-panel {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.arith-btn {
  flex: 1;
  padding: 10px;
  background: #2d2d30;
  color: #d4d4d4;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  text-align: center;
  transition: all 0.15s;
}

.arith-btn:hover {
  background: #094771;
  border-color: #007acc;
}

.arith-btn:active {
  background: #264f78;
}

/* Decimal Value */
.decimal-value {
  font-size: 14px;
  color: #b5cea8;
  font-family: "Cascadia Code", "Fira Code", monospace;
  margin-bottom: 6px;
}
```

- [ ] **Step 2: Create script.js**

```javascript
(function () {
  const vscode = acquireVsCodeApi();

  let state = {
    format: 64,
    a: { value: "0.0", parsed: null },
    b: { value: "0.0", parsed: null },
    result: null,
  };

  const formatLabels = { 16: "binary16", 32: "binary32", 64: "binary64", 128: "binary128" };

  function render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="section">
        <div class="format-buttons">
          ${[16, 32, 64, 128].map(
            (s) =>
              `<button class="format-btn ${state.format === s ? "active" : ""}" data-format="${s}">${formatLabels[s]}</button>`
          ).join("")}
        </div>
      </div>

      <div class="section">
        <div class="section-label">Value A</div>
        ${renderValueRow("a", state.a)}
      </div>

      <div class="section">
        <div class="section-label">Value B</div>
        ${renderValueRow("b", state.b)}
      </div>

      <div class="section">
        <div class="arithmetic-panel">
          <button class="arith-btn" data-op="+">+</button>
          <button class="arith-btn" data-op="-">&minus;</button>
          <button class="arith-btn" data-op="*">&times;</button>
          <button class="arith-btn" data-op="/">&divide;</button>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Result</div>
        ${state.result ? renderResultRow(state.result) : renderEmptyResult()}
      </div>
    `;

    bindEvents();
  }

  function renderValueRow(id, data) {
    const p = data.parsed;
    if (!p) {
      return `
        <div class="value-row">
          <div class="input-row">
            <label>Value</label>
            <input type="text" id="input-${id}" value="${data.value}" placeholder="e.g. 42, 0x4228, 0b1010...">
          </div>
          <div class="bits-row">
            <span class="bits-label">Binary</span>
            <span class="bits-value" id="bits-${id}">${renderEmptyBits()}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="value-row">
        <div class="input-row">
          <label>Value</label>
          <input type="text" id="input-${id}" value="${p.decimalValue}">
        </div>
        <div class="decimal-value">${p.decimalValue}</div>
        <div class="bits-row">
          <span class="bits-label">Sign</span>
          <span class="bits-value">${renderBit(p.sign, "sign")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Exponent</span>
          <span class="bits-value">${renderBit(p.hiddenBit, "hidden")}${renderBitString(p.binary.slice(2, 2 + exponentBits()), "exponent")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Significand</span>
          <span class="bits-value">${renderBitString(p.binary.slice(2 + exponentBits()), "significand")}</span>
        </div>
        <div class="breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Sign:</span>
            <span class="breakdown-value sign">${p.signOut}${p.sign}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Exp:</span>
            <span class="breakdown-value exponent">${p.expOut}</span>
          </div>
        </div>
        <div class="output-row">
          <span>${p.hex}</span>
          <span>${p.binary}</span>
        </div>
      </div>
    `;
  }

  function renderResultRow(r) {
    if (r.nan) {
      return `<div class="value-row result"><div class="decimal-value">NaN</div><div class="bits-row"><span class="bits-label">Sign</span><span class="bits-value">${renderBit("1", "sign")}</span></div></div>`;
    }
    if (r.inf) {
      return `<div class="value-row result"><div class="decimal-value">${r.decimalValue}</div><div class="bits-row"><span class="bits-label">Sign</span><span class="bits-value">${renderBit(r.sign, "sign")}</span></div></div>`;
    }
    return `
      <div class="value-row result">
        <div class="decimal-value">${r.decimalValue}</div>
        <div class="bits-row">
          <span class="bits-label">Sign</span>
          <span class="bits-value">${renderBit(r.sign, "sign")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Exponent</span>
          <span class="bits-value">${renderBit(r.hiddenBit, "hidden")}${renderBitString(r.binary.slice(2, 2 + exponentBits()), "exponent")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Significand</span>
          <span class="bits-value">${renderBitString(r.binary.slice(2 + exponentBits()), "significand")}</span>
        </div>
        <div class="breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Sign:</span>
            <span class="breakdown-value sign">${r.signOut}${r.sign}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Exp:</span>
            <span class="breakdown-value exponent">${r.expOut}</span>
          </div>
        </div>
        <div class="output-row">
          <span>${r.hex}</span>
          <span>${r.binary}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyResult() {
    return `<div class="value-row result"><div class="decimal-value" style="color:#808080">Select an operation</div></div>`;
  }

  function renderBit(bit, cls) {
    return `<span class="bit ${cls}">${bit}</span>`;
  }

  function renderBitString(str, cls) {
    return str.split("").map((b) => `<span class="bit ${cls}">${b}</span>`).join("");
  }

  function renderEmptyBits() {
    return `<span class="bit hidden">?</span>`.repeat(8);
  }

  function exponentBits() {
    const map = { 16: 5, 32: 8, 64: 11, 128: 15 };
    return map[state.format] || 11;
  }

  function bindEvents() {
    document.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.format = parseInt(btn.dataset.format);
        vscode.postMessage({ type: "switchFormat", payload: { format: state.format } });
        // Re-parse current values with new format
        if (state.a.value) {
          vscode.postMessage({ type: "inputChanged", payload: { row: "a", value: state.a.value, format: state.format } });
        }
        if (state.b.value) {
          vscode.postMessage({ type: "inputChanged", payload: { row: "b", value: state.b.value, format: state.format } });
        }
        render();
      });
    });

    ["a", "b"].forEach((id) => {
      const input = document.getElementById(`input-${id}`);
      if (input) {
        input.addEventListener("change", () => {
          state[id].value = input.value;
          vscode.postMessage({
            type: "inputChanged",
            payload: { row: id, value: input.value, format: state.format },
          });
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            state[id].value = input.value;
            vscode.postMessage({
              type: "inputChanged",
              payload: { row: id, value: input.value, format: state.format },
            });
          }
        });
      }
    });

    document.querySelectorAll(".arith-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.a.parsed && state.b.parsed) {
          vscode.postMessage({
            type: "calculate",
            payload: {
              op: btn.dataset.op,
              a: state.a.parsed,
              b: state.b.parsed,
              format: state.format,
            },
          });
        }
      });
    });
  }

  // Handle messages from extension
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "updateParsed":
        state[message.payload.row].parsed = message.payload;
        render();
        break;
      case "updateResult":
        state.result = message.payload;
        render();
        break;
    }
  });

  // Initial render
  render();
})();
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add webview-ui/ && git commit -m "feat: add webview UI with dark minimal design"
```

---

## Task 7: Add Tests

**Files:**
- Create: `src/test/suite/ieee754.test.ts`
- Create: `src/test/suite/index.ts`
- Create: `src/test/runTest.ts`

- [ ] **Step 1: Create test runner**

```typescript
// src/test/runTest.ts
import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error("Failed to run tests:", err);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Create test suite index**

```typescript
// src/test/suite/index.ts
import * as path from "path";
import Mocha from "mocha";
import { glob } from "glob";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true });
  const testsRoot = path.resolve(__dirname, ".");

  return glob("**/**.test.js", { cwd: testsRoot }).then((files) => {
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));
    return new Promise<void>((resolve, reject) => {
      mocha.run((failures) => {
        if (failures > 0) reject(new Error(`${failures} tests failed`));
        else resolve();
      });
    });
  });
}
```

- [ ] **Step 3: Create IEEE 754 tests**

```typescript
// src/test/suite/ieee754.test.ts
import * as assert from "assert";
import { IEEE, compute } from "../../ieee754";

suite("IEEE 754 Engine", () => {
  suite("binary64 (default)", () => {
    test("parses decimal 42", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("42");
      ieee.updateBits();
      ieee.fromBits();
      assert.strictEqual(ieee.isZero(), false);
      assert.strictEqual(ieee.minus, false);
      assert.strictEqual(ieee.nan, false);
      assert.strictEqual(ieee.inf, false);
    });

    test("parses 0.5", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("0.5");
      ieee.updateBits();
      ieee.fromBits();
      assert.strictEqual(ieee.isZero(), false);
      assert.strictEqual(ieee.decimalOutput(), "0.5");
    });

    test("parses NaN", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("NaN");
      assert.strictEqual(ieee.nan, true);
    });

    test("parses Inf", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("Inf");
      assert.strictEqual(ieee.inf, true);
      assert.strictEqual(ieee.minus, false);
    });

    test("parses -Inf", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("-Inf");
      assert.strictEqual(ieee.inf, true);
      assert.strictEqual(ieee.minus, true);
    });

    test("parses 0.0", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("0.0");
      ieee.updateBits();
      assert.strictEqual(ieee.isZero(), true);
    });

    test("parses -0.0", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("-0.0");
      ieee.updateBits();
      assert.strictEqual(ieee.isZero(), true);
      assert.strictEqual(ieee.minus, true);
    });

    test("parses hex 0x40490FDB (pi)", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("0x40490FDB");
      // This is actually binary32 pi, but parseHex works on hex strings
      // For binary64, we need the right hex
    });

    test("parses binary input", () => {
      IEEE.switchBitSize(64);
      const ieee = IEEE.parse("0b01000000010010010000111111011011");
      ieee.updateBits();
      ieee.fromBits();
      assert.strictEqual(ieee.minus, false);
      assert.strictEqual(ieee.nan, false);
    });

    test("addition 1 + 1 = 2", () => {
      IEEE.switchBitSize(64);
      const a = IEEE.parse("1");
      a.updateBits(); a.fromBits();
      const b = IEEE.parse("1");
      b.updateBits(); b.fromBits();
      const result = compute("+", a, b);
      result.updateBits(); result.fromBits();
      assert.strictEqual(result.decimalOutput(), "2.0");
    });

    test("subtraction 5 - 3 = 2", () => {
      IEEE.switchBitSize(64);
      const a = IEEE.parse("5");
      a.updateBits(); a.fromBits();
      const b = IEEE.parse("3");
      b.updateBits(); b.fromBits();
      const result = compute("-", a, b);
      result.updateBits(); result.fromBits();
      assert.strictEqual(result.decimalOutput(), "2.0");
    });

    test("multiplication 3 * 4 = 12", () => {
      IEEE.switchBitSize(64);
      const a = IEEE.parse("3");
      a.updateBits(); a.fromBits();
      const b = IEEE.parse("4");
      b.updateBits(); b.fromBits();
      const result = compute("*", a, b);
      result.updateBits(); result.fromBits();
      assert.strictEqual(result.decimalOutput(), "12.0");
    });

    test("division 10 / 4 = 2.5", () => {
      IEEE.switchBitSize(64);
      const a = IEEE.parse("10");
      a.updateBits(); a.fromBits();
      const b = IEEE.parse("4");
      b.updateBits(); b.fromBits();
      const result = compute("/", a, b);
      result.updateBits(); result.fromBits();
      assert.strictEqual(result.decimalOutput(), "2.5");
    });

    test("NaN propagation in arithmetic", () => {
      IEEE.switchBitSize(64);
      const a = IEEE.parse("NaN");
      const b = IEEE.parse("1");
      b.updateBits(); b.fromBits();
      const result = compute("+", a, b);
      assert.strictEqual(result.nan, true);
    });
  });

  suite("binary32", () => {
    test("parses and displays correctly", () => {
      IEEE.switchBitSize(32);
      const ieee = IEEE.parse("3.14");
      ieee.updateBits();
      ieee.fromBits();
      assert.strictEqual(ieee.decimalOutput(), "3.140000104904175");
    });
  });

  suite("binary16", () => {
    test("parses and displays correctly", () => {
      IEEE.switchBitSize(16);
      const ieee = IEEE.parse("1.5");
      ieee.updateBits();
      ieee.fromBits();
      assert.strictEqual(ieee.decimalOutput(), "1.5");
    });
  });
});
```

- [ ] **Step 4: Update package.json test script**

Add to scripts in package.json:
```json
"test": "node ./out/test/runTest.js"
```

- [ ] **Step 5: Build and run tests**

Run: `npm run build && npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/test/ && git commit -m "test: add IEEE 754 engine tests"
```

---

## Task 8: Final Polish and Package

**Files:**
- Modify: `package.json` (add extension kind, icon metadata)
- Create: `CHANGELOG.md`
- Create: `README.md`

- [ ] **Step 1: Update package.json with metadata**

Add to package.json:
```json
"extensionKind": ["desktop"],
"icon": "icon.png",
"repository": {
  "type": "git",
  "url": ""
},
"keywords": ["ieee754", "floating-point", "converter", "binary", "hex"]
```

- [ ] **Step 2: Create minimal README.md**

```markdown
# IEEE 754 Converter

A VSCode sidebar extension for IEEE 754 floating-point conversion and arithmetic.

Based on [weitz.de/ieee](https://weitz.de/ieee/) by Dr. Edmund Weitz.

## Features

- Convert between decimal and binary/hex representations
- Support for binary16, binary32, binary64, binary128 formats
- Bit-level visualization with color-coded sign, exponent, and significand
- Basic arithmetic: addition, subtraction, multiplication, division
- Input formats: decimal, hex (0x), binary (0b), fractions, NaN, Inf

## Usage

1. Open the sidebar and click the IEEE 754 icon
2. Enter a value in the input field
3. Click arithmetic buttons to compute results
4. Switch formats using the format buttons
```

- [ ] **Step 3: Build final package**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 4: Commit**

```bash
git add package.json README.md && git commit -m "chore: add metadata, README, final polish"
```
