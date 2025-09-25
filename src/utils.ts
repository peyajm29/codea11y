import * as fs from "fs";
import * as path from "path";

/**
 * Reads the README.md file from the workspace if it exists
 */
export async function getRelevantContext(): Promise<string> {
  const vscode = await import("vscode");
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return "";
  }

  const readmePath = path.join(workspaceFolder.uri.fsPath, "README.md");
  if (!fs.existsSync(readmePath)) {
    return "";
  }

  try {
    const fileContent = fs.readFileSync(readmePath, "utf-8");
    return fileContent;
  } catch (error) {
    console.error("Error reading README.md:", error);
    return "";
  }
}