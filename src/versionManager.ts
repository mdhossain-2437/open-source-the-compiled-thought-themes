import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";

interface GitError {
  code: string;
  message: string;
  command?: string;
}

interface GitOperationResult {
  success: boolean;
  data?: string;
  error?: GitError;
}

/**
 * @interface ChangeAnalysis
 * @description Analysis result of code changes for versioning decisions
 */
interface ChangeAnalysis {
  type: "major" | "minor" | "patch";
  impact: "high" | "medium" | "low";
  changes: string[];
  scope: string[];
  breakingChanges: boolean;
}

/**
 * @class VersionManager
 * @description Manages versioning, changelogs, and impact analysis for the extension
 */
export class VersionManager {
  private readonly packageJsonPath: string;
  private readonly changelogPath: string;
  private readonly vsixOutputDir: string;
  private readonly themeChangesThreshold = {
    major: 5, // 5+ new themes or major theme updates
    minor: 2, // 2-4 theme updates
    patch: 1, // Single theme update
  };

  constructor(private context: vscode.ExtensionContext) {
    this.packageJsonPath = path.join(context.extensionPath, "package.json");
    this.changelogPath = path.join(context.extensionPath, "CHANGELOG.md");
    this.vsixOutputDir = context.extensionPath;
  }

  /**
   * Bumps the version number in package.json
   * @param type - The type of version increment
   * @returns Promise with the new version string
   * @throws {Error} If version increment fails
   */
  async bumpVersion(type: "major" | "minor" | "patch"): Promise<string> {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(this.packageJsonPath, "utf8")
      );
      const currentVersion = packageJson.version;
      const newVersion = semver.inc(currentVersion, type);

      if (!newVersion) {
        throw new Error(`Failed to increment version from ${currentVersion}`);
      }

      // Update package.json
      packageJson.version = newVersion;
      fs.writeFileSync(
        this.packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );

      // Create new vsix filename
      const vsixName = `compiled-thought-themes-${newVersion}.vsix`;

      // Update old vsix if exists
      try {
        const files = fs.readdirSync(this.vsixOutputDir);
        const oldVsix = files.find(
          (f) => f.startsWith("compiled-thought-themes-") && f.endsWith(".vsix")
        );
        if (oldVsix) {
          const oldPath = path.join(this.vsixOutputDir, oldVsix);
          const newPath = path.join(this.vsixOutputDir, vsixName);
          fs.renameSync(oldPath, newPath);
        }
      } catch (error) {
        console.error("Failed to update VSIX file:", error);
        // Don't throw here as this is not critical
      }

      return newVersion;
    } catch (error) {
      throw new Error(
        `Version bump failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Extracts theme name from file path
   * @param file - The file path
   * @returns Formatted theme name
   */
  private getThemeName(file: string): string {
    try {
      const basename = path.basename(file, ".json");
      return basename.replace(/([A-Z])/g, " $1").trim();
    } catch (error) {
      console.error(`Failed to parse theme name from ${file}:`, error);
      return path.basename(file, ".json");
    }
  }

  /**
   * Checks for breaking changes in diff content
   * @param diff - Git diff content
   * @returns boolean indicating if breaking changes were found
   */
  private containsBreakingChanges(diff: string): boolean {
    if (!diff) return false;

    const breakingPatterns = [
      /BREAKING CHANGE/i,
      /breaking-change/i,
      /removed.*API/i,
      /deprecated.*API/i,
      /changed.*interface/i,
    ];
    return breakingPatterns.some((pattern) => pattern.test(diff));
  }

  /**
   * Checks for API changes in diff content
   * @param diff - Git diff content
   * @returns boolean indicating if API changes were found
   */
  private isAPIChange(diff: string): boolean {
    if (!diff) return false;

    const apiPatterns = [
      /export.*interface/,
      /export.*class/,
      /export.*function/,
      /public.*method/,
    ];
    return apiPatterns.some((pattern) => pattern.test(diff));
  }

  /**
   * Generates the changelog entry for the new version
   * @param version - The new version string
   * @param changes - Array of change descriptions
   * @returns Promise that resolves when the changelog is updated
   * @throws {Error} If changelog update fails
   */
  async generateChangelog(version: string, changes: string[]): Promise<void> {
    try {
      const date = new Date().toISOString().split("T")[0];
      const changelogEntry = `
## [${version}] - ${date}

${changes.map((change) => `- ${change}`).join("\n")}
`;

      let changelog = "";
      if (fs.existsSync(this.changelogPath)) {
        changelog = fs.readFileSync(this.changelogPath, "utf8");
      } else {
        changelog =
          "# Changelog\n\nAll notable changes to this project will be documented in this file.\n";
      }

      // Insert new changes after the header
      const parts = changelog.split("\n");
      const headerEnd = parts.findIndex((line) => line.startsWith("## "));
      if (headerEnd === -1) {
        changelog += changelogEntry;
      } else {
        parts.splice(headerEnd, 0, changelogEntry);
        changelog = parts.join("\n");
      }

      fs.writeFileSync(this.changelogPath, changelog);
    } catch (error) {
      console.error("Failed to generate changelog:", error);
      throw new Error(
        `Changelog generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Analyzes the impact of code changes
   * @param files - Array of file paths to analyze
   * @returns Promise with change analysis results
   */
  private async analyzeCodeImpact(files: string[]): Promise<ChangeAnalysis> {
    const analysis: ChangeAnalysis = {
      type: "patch",
      impact: "low",
      changes: [],
      scope: [],
      breakingChanges: false,
    };

    try {
      let themeChanges = 0;
      let coreChanges = 0;
      let apiChanges = false;
      let newFeatures = false;

      for (const file of files) {
        const content = await this.getFileChanges(file);

        if (file.includes("themes/")) {
          themeChanges++;
          if (this.isNewTheme(file)) {
            analysis.changes.push(
              `✨ Added new theme: ${this.getThemeName(file)}`
            );
            newFeatures = true;
          }
        }

        if (file.includes("src/")) {
          coreChanges++;
          if (this.containsBreakingChanges(content)) {
            analysis.breakingChanges = true;
            analysis.impact = "high";
          }
        }

        if (this.isAPIChange(content)) {
          apiChanges = true;
          analysis.scope.push("api");
        }
      }

      // Determine version bump type
      if (
        analysis.breakingChanges ||
        themeChanges >= this.themeChangesThreshold.major
      ) {
        analysis.type = "major";
        analysis.impact = "high";
      } else if (
        newFeatures ||
        themeChanges >= this.themeChangesThreshold.minor ||
        apiChanges
      ) {
        analysis.type = "minor";
        analysis.impact = "medium";
      }

      return analysis;
    } catch (error) {
      console.error("Failed to analyze code impact:", error);
      return analysis; // Return default analysis on error
    }
  }

  /**
   * Gets the git diff for a specific file
   * @param file - The file path to get changes for
   * @returns Promise with the git diff content
   * @throws {Error} If git command fails
   */
  private async getFileChanges(file: string): Promise<string> {
    try {
      const result = await this.executeGitCommand(`git diff HEAD~1 "${file}"`);
      if (!result.success) {
        throw new Error(`Git diff failed: ${result.error?.message}`);
      }
      return result.data || "";
    } catch (error) {
      console.error(`Failed to get file changes for ${file}:`, error);
      return "";
    }
  }

  /**
   * Executes a git command in the extension directory
   * @param command - The git command to execute
   * @returns Promise with the command result
   */
  private async executeGitCommand(
    command: string
  ): Promise<GitOperationResult> {
    try {
      const { execSync } = require("child_process");
      const result = execSync(command, {
        cwd: this.context.extensionPath,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      const gitError: GitError = {
        code:
          typeof error.status === "number"
            ? `GIT_ERROR_${error.status}`
            : "GIT_UNKNOWN_ERROR",
        message: error?.message || "Unknown git error occurred",
        command: command,
      };

      // Log the error for debugging
      console.error("Git operation failed:", {
        command,
        error: gitError,
      });

      return {
        success: false,
        error: gitError,
      };
    }
  }

  private async validateGitRepo(): Promise<boolean> {
    const result = await this.executeGitCommand(
      "git rev-parse --is-inside-work-tree"
    );
    return result.success;
  }

  private async ensureGitRepo(): Promise<void> {
    if (!(await this.validateGitRepo())) {
      throw new Error("Not a git repository. Please initialize git first.");
    }
  }

  public async createRelease(version: string): Promise<GitOperationResult> {
    try {
      await this.ensureGitRepo();

      // Validate version format
      if (!semver.valid(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      // Create release branch
      const branchResult = await this.executeGitCommand(
        `git checkout -b release/${version}`
      );
      if (!branchResult.success) {
        throw new Error(
          `Failed to create release branch: ${branchResult.error?.message}`
        );
      }

      // Update version in package.json
      const pkg = require(this.packageJsonPath);
      pkg.version = version;
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(pkg, null, 2));

      // Commit changes
      const commitResult = await this.executeGitCommand(
        `git commit -am "Release version ${version}"`
      );
      if (!commitResult.success) {
        throw new Error(
          `Failed to commit version update: ${commitResult.error?.message}`
        );
      }

      // Create tag
      const tagResult = await this.executeGitCommand(
        `git tag -a v${version} -m "Version ${version}"`
      );
      if (!tagResult.success) {
        throw new Error(`Failed to create tag: ${tagResult.error?.message}`);
      }

      return {
        success: true,
        data: `Successfully created release ${version}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: {
          code: "RELEASE_CREATION_ERROR",
          message: errorMessage,
        },
      };
    }
  }

  public async getLastRelease(): Promise<GitOperationResult> {
    try {
      await this.ensureGitRepo();
      return await this.executeGitCommand("git describe --tags --abbrev=0");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: {
          code: "GET_LAST_RELEASE_ERROR",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Checks if a file contains a new theme
   * @param file - The file path to check
   * @returns boolean indicating if it's a new theme
   */
  private isNewTheme(file: string): boolean {
    try {
      const content = fs.readFileSync(file, "utf8");
      const theme = JSON.parse(content);
      return !theme.modified && theme.name && theme.colors;
    } catch (error) {
      console.error(`Failed to parse theme file ${file}:`, error);
      return false;
    }
  }

  /**
   * Analyzes changes using AI-powered code analysis
   * @returns Promise with version type and changes
   */
  async analyzeChangesWithAI(): Promise<{
    type: "major" | "minor" | "patch";
    changes: string[];
  }> {
    try {
      const changedFiles = await vscode.workspace.findFiles(
        "**/*",
        "**/node_modules/**"
      );
      const filesForAnalysis = changedFiles.map((file) => file.fsPath);

      const analysis = await this.analyzeCodeImpact(filesForAnalysis);

      if (!analysis) {
        throw new Error("Failed to analyze code impact");
      }
      return analysis;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handles errors in a consistent way
   */
  private handleError(error: unknown): GitError {
    if (error instanceof Error) {
      return {
        code: "ERROR",
        message: error.message,
      };
    }
    return {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
    };
  }
}
