import * as vscode from "vscode";

/**
 * Gets the website URL from VS Code settings
 */
export function getWebsiteUrl(): string {
  const config = vscode.workspace.getConfiguration("codea11y");
  return config.get("websiteUrl", "http://127.0.0.1:5500");
}

/**
 * Gets the timeout value from VS Code settings
 */
export function getTimeout(): number {
  const config = vscode.workspace.getConfiguration("codea11y");
  return config.get("timeout", 10000);
}