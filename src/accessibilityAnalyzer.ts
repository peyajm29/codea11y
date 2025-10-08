import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";
import { getWebsiteUrl, getTimeout } from "./configuration";

export class AccessibilityAnalyzer {
  /**
   * Gets the accessibility log context by running axe-cli analysis
   */
  public async getAccessibilityLogContext(): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        console.log("No workspace folder found");
        return "Error: No workspace folder found";
      }

      try {
        const websiteUrl = getWebsiteUrl();
        const timeout = getTimeout();

        console.log(`Running axe-cli analysis on: ${websiteUrl}`);

        const exec = promisify(child_process.exec);

        let axeCliPath: string | undefined;
        try {
          const axePkgJsonPath = require.resolve("@axe-core/cli/package.json");
          const axePkgJson = JSON.parse(fs.readFileSync(axePkgJsonPath, "utf8"));
          const axePkgDir = path.dirname(axePkgJsonPath);

          const binField = axePkgJson.bin;
          let binRel: string | undefined;
          if (typeof binField === "string") {
            binRel = binField;
          } else if (typeof binField === "object" && binField !== null) {
            binRel = binField["axe"] || binField["cli"] || binField[Object.keys(binField)[0]];
          }

          if (binRel) {
            axeCliPath = path.join(axePkgDir, binRel);
          }
        } catch (resolveErr) {
          console.warn("Could not resolve @axe-core/cli package.json:", (resolveErr as any)?.message || resolveErr);
        }

        if (!axeCliPath) {
          axeCliPath = path.join(__dirname, "..", "node_modules", ".bin", "axe");
        }

        const logsDir = path.join(workspaceFolder.uri.fsPath, ".codea11y-logs");
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }

        const axeResultsPath = path.join(logsDir, "axe-results.json");

  const nodeExec = process.execPath;
  const axeCommand = `"${nodeExec}" "${axeCliPath}" "${websiteUrl}" --tags wcag2a,wcag2aa,wcag21aa,best-practice --save "${axeResultsPath}" --verbose`;

        console.log(`Executing: ${axeCommand}`);

        const { stderr } = await exec(axeCommand, {
          timeout: timeout + 5000, 
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large results
        });

        if (stderr && stderr.trim()) {
          console.warn("Axe-cli stderr:", stderr);
        }

        // Read and parse the JSON results file
        let results: any;
        try {
          if (!fs.existsSync(axeResultsPath)) {
            throw new Error(`Axe results file not found: ${axeResultsPath}`);
          }

          const resultsFileContent = fs.readFileSync(axeResultsPath, "utf-8");
          if (!resultsFileContent.trim()) {
            throw new Error("Axe results file is empty");
          }

          results = JSON.parse(resultsFileContent);
        } catch (parseError) {
          console.error("Failed to read or parse axe-results.json:", parseError);
          throw new Error(`Failed to parse axe-results.json: ${parseError}`);
        }

        // Return the raw JSON results
        const logContent = JSON.stringify(results, null, 2);

        return logContent;
      } catch (error: any) {
        const errorMessage = `Error running axe-cli accessibility check: ${
          error.message || "Unknown error"
        }`;
        console.error(errorMessage);
        console.error("Full error:", error);

        // Show notification for error
        vscode.window.showWarningMessage(
          "⚠️ Axe-cli accessibility check failed: " + error.message
        );

        return errorMessage;
      }
    } catch (error: any) {
      console.error("Critical error:", error);
      return "Critical error occurred: " + (error.message || "Unknown error");
    }
  }
}