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
exports.getRelevantContext = getRelevantContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Reads the README.md file from the workspace if it exists
 */
async function getRelevantContext() {
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
    }
    catch (error) {
        console.error("Error reading README.md:", error);
        return "";
    }
}
//# sourceMappingURL=utils.js.map