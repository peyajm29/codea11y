import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";
import { getWebsiteUrl, getTimeout } from "./configuration";
import { ChromeDriverManager } from "./chromedriverManager";

export class AccessibilityAnalyzer {
  /**
   * Filters accessibility results to only include violations (the actual problems)
   * This dramatically reduces context size by removing passes, incomplete, and inapplicable tests
   */
  private filterAndTruncateResults(results: any): any {
    if (!results) {
      return results;
    }

    const MAX_CONTEXT_SIZE = 15000; // Maximum characters for the entire log context

    // Step 1: Create a violations-only version
    const violationsOnly: any = {
      url: results.url,
      timestamp: results.timestamp,
      totalViolations: results.violations?.length || 0,
      // Only keep violations - prioritized by impact (critical > serious > moderate > minor)
      violations: this.prioritizeAndTruncateViolations(results.violations || [])
    };

    // Step 2: Check size and reduce violations if still too large
    let jsonString = JSON.stringify(violationsOnly, null, 2);
    if (jsonString.length > MAX_CONTEXT_SIZE) {
      // Keep reducing violations until it fits
      let maxViolations = Math.floor(violationsOnly.violations.length * 0.7);
      while (jsonString.length > MAX_CONTEXT_SIZE && maxViolations > 1) {
        violationsOnly.violations = this.prioritizeAndTruncateViolations(results.violations || [], maxViolations);
        jsonString = JSON.stringify(violationsOnly, null, 2);
        maxViolations = Math.floor(maxViolations * 0.8);
      }
      
      // Final fallback - just top 3 most critical violations
      if (jsonString.length > MAX_CONTEXT_SIZE) {
        violationsOnly.violations = this.prioritizeAndTruncateViolations(results.violations || [], 3);
        violationsOnly.note = `Showing only top 3 of ${results.violations?.length || 0} total violations due to context size limits`;
      }
    }

    return violationsOnly;
  }

  /**
   * Sorts violations by impact priority and truncates to most important ones
   * Impact priority: critical > serious > moderate > minor
   */
  private prioritizeAndTruncateViolations(violations: any[], maxCount?: number): any[] {
    if (!violations || violations.length === 0) {
      return [];
    }

    // Define impact priority scores (higher = more important)
    const impactPriority = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    
    // Sort violations by impact (most critical first)
    const sortedViolations = violations.sort((a, b) => {
      const aPriority = impactPriority[a.impact as keyof typeof impactPriority] || 0;
      const bPriority = impactPriority[b.impact as keyof typeof impactPriority] || 0;
      return bPriority - aPriority;
    });

    // Determine how many violations to keep (default: max 10)
    const limit = maxCount !== undefined ? maxCount : Math.min(10, sortedViolations.length);
    const truncatedViolations = sortedViolations.slice(0, limit);

    // Simplify each violation to reduce size while keeping essential info
    return truncatedViolations.map(violation => ({
      id: violation.id, // Axe rule ID (e.g., "color-contrast")
      impact: violation.impact, // critical, serious, moderate, minor
      description: violation.description, // What the rule checks
      help: violation.help, // How to fix it
      helpUrl: violation.helpUrl, // Link to detailed documentation
      tags: violation.tags, // WCAG tags (e.g., ["wcag2aa", "wcag143"])
      // Simplify nodes (actual DOM elements with issues)
      nodes: this.simplifyViolationNodes(violation.nodes || [])
    }));
  }

  /**
   * Simplifies violation nodes to keep only essential information
   * Each node represents a DOM element that failed the accessibility test
   */
  private simplifyViolationNodes(nodes: any[]): any[] {
    // Keep only first 3 nodes per violation (most issues repeat across similar elements)
    const limitedNodes = nodes.slice(0, 3);
    
    return limitedNodes.map(node => ({
      // Truncate HTML to 200 chars (enough to identify the element)
      html: node.html?.substring(0, 200) + (node.html && node.html.length > 200 ? '...' : ''),
      impact: node.impact, // Impact level for this specific element
      // Keep only first 2 CSS selectors (usually sufficient to locate element)
      target: node.target?.slice(0, 2),
      // Truncate failure summary to 300 chars (contains the specific error details)
      failureSummary: node.failureSummary?.substring(0, 300) + (node.failureSummary && node.failureSummary.length > 300 ? '...' : '')
    }));
  }



  /**
   * Gets the accessibility log context by running axe-cli analysis
   */
  public async getAccessibilityLogContext(): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return "Error: No workspace folder found";
      }

      try {
        const websiteUrl = getWebsiteUrl();
        const timeout = getTimeout();

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

        // Get the ChromeDriver path (will auto-download if needed)
        const chromedriverPath = await ChromeDriverManager.getInstance().getChromedriverPath();
        
        if (!chromedriverPath) {
          throw new Error("Failed to download or locate ChromeDriver. Please check your internet connection and try again.");
        }

        const nodeExec = process.execPath;
        const axeCommand = `"${nodeExec}" "${axeCliPath}" "${websiteUrl}" --tags wcag2a,wcag2aa,wcag21aa,best-practice --save "${axeResultsPath}" --chromedriver-path "${chromedriverPath}" --verbose`;

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

        // Handle case where axe-cli returns an array of results (which it does)
        let actualResults = results;
        if (Array.isArray(results) && results.length > 0) {
          actualResults = results[0]; // Take the first (and usually only) result object
        }
        
        // Filter and truncate results to fit within context limits
        const filteredResults = this.filterAndTruncateResults(actualResults);
        
        return JSON.stringify(filteredResults, null, 2);
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