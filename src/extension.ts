import * as vscode from "vscode";
import { ConverterViewProvider } from "./webview/provider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ConverterViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ConverterViewProvider.viewType, provider)
  );
}

export function deactivate() {}
