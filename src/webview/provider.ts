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
    const ieee = new IEEE(0n);
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
      decimalValue = ieee.minus ? "-Inf" : "Inf";
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
