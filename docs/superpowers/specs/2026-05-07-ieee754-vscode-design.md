# IEEE 754 VSCode Extension Design

## Overview

A VSCode sidebar extension that replicates the functionality of [weitz.de/ieee](https://weitz.de/ieee/) — an IEEE 754 floating-point converter with arithmetic operations. The extension provides bidirectional conversion between decimal and binary representations, bit-level visualization, and basic arithmetic for binary16/32/64/128 formats.

## Goals

- Replicate all functionality from weitz.de/ieee with verified calculation logic
- Redesign the UI for a modern, dark, minimal VSCode aesthetic
- Support i18n (follow VSCode language setting)
- Zero runtime dependencies

## Architecture

**Approach: Extension Host + Webview Separation**

```
┌─────────────────────────────────────────┐
│  VSCode Extension Host (TypeScript)      │
│  ┌───────────────┐  ┌────────────────┐  │
│  │ IEEE754 Engine │  │ Message Router │  │
│  │ - Conversions  │  │ - postMessage  │  │
│  │ - Arithmetic   │  │ - State Sync   │  │
│  │ - Special Vals │  └────────────────┘  │
│  └───────────────┘                       │
└─────────────────────────────────────────┘
              ↕ postMessage
┌─────────────────────────────────────────┐
│  Webview (HTML/CSS/JS)                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐  │
│  │Input │ │ Bits │ │Arith │ │Format  │  │
│  │Panel │ │Disp. │ │Panel │ │Switcher│  │
│  └──────┘ └──────┘ └──────┘ └────────┘  │
└─────────────────────────────────────────┘
```

**Core principle**: Webview handles rendering and user interaction only. All IEEE 754 computation lives in the extension host.

## IEEE 754 Engine

The engine is ported directly from weitz.de/ieee's VanillaJS implementation. The source logic is preserved as-is; only module boundaries and TypeScript types are added.

### Supported Formats

| Format    | Total Bits | Exponent | Significand |
|-----------|-----------|----------|-------------|
| binary16  | 16        | 5        | 10          |
| binary32  | 32        | 8        | 23          |
| binary64  | 64        | 11       | 52          |
| binary128 | 128       | 15       | 112         |

### Data Types

```typescript
type IEEEFormat = 'binary16' | 'binary32' | 'binary64' | 'binary128';

interface FormatSpec {
  bits: number;
  exponentBits: number;
  significandBits: number;
}

interface ParsedFloat {
  format: IEEEFormat;
  sign: 0 | 1;
  exponent: bigint;
  significand: bigint;
  value: string;
  hex: string;
  binary: string;
  isSpecial: boolean;
  type: 'normal' | 'subnormal' | 'zero' | 'inf' | 'nan';
}
```

### Key Implementation Details

- Uses `BigInt` for binary64 and binary128 arithmetic
- Rounding mode: round to nearest, ties to even (matches website)
- Special values: NaN, +Inf, -Inf, ±0, subnormals
- Decimal conversion uses Burger-Dybvig algorithm (from website source)
- NaN has no quiet/signaling distinction (matches website)

## UI Design

### Layout

Sidebar panel with the following vertical sections:

1. **Format Switcher** — Four toggle buttons: binary16, binary32, binary64, binary128
2. **Value A** — Input row with decimal/hex/binary input, bit display, sign/exponent/significand breakdown
3. **Value B** — Same as Value A
4. **Arithmetic Panel** — Four operation buttons: +, -, ×, ÷
5. **Result** — Read-only display of operation result with full bit breakdown

### Interaction

- Decimal input: `42`, `2.345`, `12E-3`, `17/23`, `NaN`, `Inf`, `-Inf`
- Binary input: `0b0100001000101000...`
- Hex input: `0x4228`
- Exponent field: accepts decimal with sign (`+10`, `-5`)
- Hidden bit: displayed in special style, not editable
- All bits are clickable to toggle 0/1
- Format switch recalculates and redisplays all values

### Color Scheme (Dark Minimal)

| Element          | Color     | Usage              |
|-----------------|-----------|-------------------|
| Background      | #1e1e1e   | Panel background   |
| Text            | #d4d4d4   | Default text       |
| Sign bits       | #d16969   | Red                |
| Exponent bits   | #ce9178   | Orange             |
| Significand bits| #569cd6   | Blue               |
| Hidden bit      | #808080   | Grey, dimmed       |
| Buttons         | #2d2d30   | Button background  |
| Button hover    | #3e3e42   | Button hover state |

## Message Flow

### Extension Host → Webview

```typescript
{ type: 'updateResult', payload: ParsedFloat }
{ type: 'formatChanged', payload: { format: IEEEFormat, spec: FormatSpec } }
```

### Webview → Extension Host

```typescript
{ type: 'inputChanged', payload: { row: 'A' | 'B', value: string, format: IEEEFormat } }
{ type: 'calculate', payload: { op: '+' | '-' | '*' | '/', a: ParsedFloat, b: ParsedFloat } }
{ type: 'switchFormat', payload: { format: IEEEFormat } }
```

## Project Structure

```
vs-ieee754/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts          # Plugin entry, command registration
│   ├── ieee754/
│   │   ├── engine.ts         # Core computation (ported from website)
│   │   ├── types.ts          # Type definitions
│   │   └── index.ts          # Exports
│   └── webview/
│       ├── provider.ts       # WebviewPanelProvider
│       ├── panel.ts          # Webview panel management
│       └── webview.html      # Webview HTML template
├── webview-ui/
│   ├── index.html            # Webview page
│   ├── style.css             # Styles
│   └── script.js             # Webview-side interaction logic
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-07-ieee754-vscode-design.md
```

## Dependencies

- **Runtime**: None (zero dependencies)
- **DevDependencies**: @types/vscode, typescript, esbuild

## Testing

- Jest tests for the IEEE 754 engine
- Test cases cover: normal values, special values (NaN, Inf, ±0), subnormals, arithmetic operations, rounding edge cases
- Validation against weitz.de/ieee output for correctness

## Error Handling

- Invalid input: show error message, retain last valid value
- Overflow/underflow: handle per IEEE 754 standard (return Inf or subnormal)
- Webview communication failure: silent retry, no crash
