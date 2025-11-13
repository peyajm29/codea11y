import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";

const exec = promisify(child_process.exec);

export class ChromeDriverManager {
  private static instance: ChromeDriverManager;
  private chromedriverPath: string | null = null;

  private constructor() {}

  public static getInstance(): ChromeDriverManager {
    if (!ChromeDriverManager.instance) {
      ChromeDriverManager.instance = new ChromeDriverManager();
    }
    return ChromeDriverManager.instance;
  }

  /**
   * Gets or downloads the ChromeDriver path using browser-driver-manager
   */
  public async getChromedriverPath(): Promise<string | null> {
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
  private async downloadChromeDriver(): Promise<string | null> {
    try {
      vscode.window.showInformationMessage(
        `Downloading missing ChromeDriver... This may take a moment.`
      );

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
        vscode.window.showInformationMessage(
          `Missing ChromeDriver downloaded and configured successfully!`
        );
        return chromedriverPath;
      } else {
        throw new Error("ChromeDriver was installed but could not be located");
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to download ChromeDriver: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Finds chromedriver executable in the browser-driver-manager directory
   */
  private findChromedriverInCache(bdmPath: string): string | null {
    try {
      const chromedriverDir = path.join(bdmPath, "chromedriver");
      if (!fs.existsSync(chromedriverDir)) {
        return null;
      }

      const executableName = process.platform === "win32" ? "chromedriver.exe" : "chromedriver";
      
      // Look through version directories
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
    } catch (error) {
      return null;
    }
  }

  /**
   * Clears the cached ChromeDriver path (useful for testing or forcing re-detection)
   */
  public clearCache(): void {
    this.chromedriverPath = null;
  }
}
