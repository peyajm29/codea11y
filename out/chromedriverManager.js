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
exports.ChromeDriverManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const util_1 = require("util");
const exec = (0, util_1.promisify)(child_process.exec);
class ChromeDriverManager {
    static instance;
    chromedriverPath = null;
    constructor() { }
    static getInstance() {
        if (!ChromeDriverManager.instance) {
            ChromeDriverManager.instance = new ChromeDriverManager();
        }
        return ChromeDriverManager.instance;
    }
    /**
     * Gets or downloads the ChromeDriver path using browser-driver-manager
     */
    async getChromedriverPath() {
        // Return cached path if available
        if (this.chromedriverPath && fs.existsSync(this.chromedriverPath)) {
            return this.chromedriverPath;
        }
        // Check default browser-driver-manager location
        const homeDir = process.env.HOME || process.env.USERPROFILE || "";
        const defaultBDMPath = path.join(homeDir, ".browser-driver-manager");
        const cachedPath = this.findChromedriverInCache(defaultBDMPath);
        if (cachedPath) {
            this.chromedriverPath = cachedPath;
            return cachedPath;
        }
        // Download ChromeDriver using browser-driver-manager
        const downloadedPath = await this.downloadChromeDriver();
        if (downloadedPath) {
            this.chromedriverPath = downloadedPath;
            return downloadedPath;
        }
        return null;
    }
    /**
     * Downloads ChromeDriver using browser-driver-manager (recommended by axe-cli)
     */
    async downloadChromeDriver() {
        try {
            vscode.window.showInformationMessage(`Downloading missing ChromeDriver... This may take a moment.`);
            // browser-driver-manager installs to ~/.browser-driver-manager by default
            const bdmCommand = `npx browser-driver-manager@latest install chromedriver`;
            const { stdout, stderr } = await exec(bdmCommand, {
                timeout: 180000, // 3 minutes
                maxBuffer: 1024 * 1024 * 10,
                env: { ...process.env, PATH: process.env.PATH },
            });
            // Find the chromedriver executable in the default installation location
            const homeDir = process.env.HOME || process.env.USERPROFILE || "";
            const defaultBDMPath = path.join(homeDir, ".browser-driver-manager");
            const chromedriverPath = this.findChromedriverInCache(defaultBDMPath);
            if (chromedriverPath && fs.existsSync(chromedriverPath)) {
                vscode.window.showInformationMessage(`Missing ChromeDriver downloaded and configured successfully!`);
                return chromedriverPath;
            }
            else {
                throw new Error("ChromeDriver was installed but could not be located");
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to download ChromeDriver: ${error.message}`);
            return null;
        }
    }
    /**
     * Finds chromedriver executable in the browser-driver-manager directory
     */
    findChromedriverInCache(bdmPath) {
        try {
            const chromedriverDir = path.join(bdmPath, "chromedriver");
            if (!fs.existsSync(chromedriverDir)) {
                return null;
            }
            const executableName = process.platform === "win32" ? "chromedriver.exe" : "chromedriver";
            // Look through version directories (e.g., mac_arm-142.0.7444.162)
            const versionDirs = fs.readdirSync(chromedriverDir);
            for (const versionDir of versionDirs) {
                const versionPath = path.join(chromedriverDir, versionDir);
                if (!fs.statSync(versionPath).isDirectory()) {
                    continue;
                }
                // Look for chromedriver in platform-specific subdirectory
                const platformDirs = fs.readdirSync(versionPath);
                for (const platformDir of platformDirs) {
                    const chromedriverPath = path.join(versionPath, platformDir, executableName);
                    if (fs.existsSync(chromedriverPath)) {
                        return chromedriverPath;
                    }
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Clears the cached ChromeDriver path (useful for testing or forcing re-detection)
     */
    clearCache() {
        this.chromedriverPath = null;
    }
}
exports.ChromeDriverManager = ChromeDriverManager;
//# sourceMappingURL=chromedriverManager.js.map