"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessibilityAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const util_1 = require("util");
const configuration_1 = require("./configuration");
class AccessibilityAnalyzer {
    /**
     * Gets the accessibility log context by running axe-cli analysis
     */
    async getAccessibilityLogContext() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                console.log("No workspace folder found");
                return "Error: No workspace folder found";
            }
            try {
                const websiteUrl = (0, configuration_1.getWebsiteUrl)();
                const timeout = (0, configuration_1.getTimeout)();
                console.log(`Running axe-cli analysis on: ${websiteUrl}`);
                const exec = (0, util_1.promisify)(child_process.exec);
                let axeCliPath;
                try {
                    const axePkgJsonPath = require.resolve("@axe-core/cli/package.json");
                    const axePkgJson = JSON.parse(fs.readFileSync(axePkgJsonPath, "utf8"));
                    const axePkgDir = path.dirname(axePkgJsonPath);
                    const binField = axePkgJson.bin;
                    let binRel;
                    if (typeof binField === "string") {
                        binRel = binField;
                    }
                    else if (typeof binField === "object" && binField !== null) {
                        binRel = binField["axe"] || binField["cli"] || binField[Object.keys(binField)[0]];
                    }
                    if (binRel) {
                        axeCliPath = path.join(axePkgDir, binRel);
                    }
                }
                catch (resolveErr) {
                    console.warn("Could not resolve @axe-core/cli package.json:", resolveErr?.message || resolveErr);
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
                let results;
                try {
                    if (!fs.existsSync(axeResultsPath)) {
                        throw new Error(`Axe results file not found: ${axeResultsPath}`);
                    }
                    const resultsFileContent = fs.readFileSync(axeResultsPath, "utf-8");
                    if (!resultsFileContent.trim()) {
                        throw new Error("Axe results file is empty");
                    }
                    results = JSON.parse(resultsFileContent);
                }
                catch (parseError) {
                    console.error("Failed to read or parse axe-results.json:", parseError);
                    throw new Error(`Failed to parse axe-results.json: ${parseError}`);
                }
                // Return the raw JSON results
                const logContent = JSON.stringify(results, null, 2);
                return logContent;
            }
            catch (error) {
                const errorMessage = `Error running axe-cli accessibility check: ${error.message || "Unknown error"}`;
                console.error(errorMessage);
                console.error("Full error:", error);
                // Show notification for error
                vscode.window.showWarningMessage("⚠️ Axe-cli accessibility check failed: " + error.message);
                return errorMessage;
            }
        }
        catch (error) {
            console.error("Critical error:", error);
            return "Critical error occurred: " + (error.message || "Unknown error");
        }
    }
}
exports.AccessibilityAnalyzer = AccessibilityAnalyzer;
//# sourceMappingURL=accessibilityAnalyzer.js.map