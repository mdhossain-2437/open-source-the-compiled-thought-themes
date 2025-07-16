import * as vscode from "vscode";
import type { ThemeManager } from "../themeManager";

interface TransitionMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  frameCount: number;
  memoryStart: NodeJS.MemoryUsage;
  memoryEnd: NodeJS.MemoryUsage;
}

export class ThemeTransitionManager {
  private static instance: ThemeTransitionManager;
  private transitionInterval: NodeJS.Timer | null = null;
  private isTransitioning = false;
  private transitionMetrics: TransitionMetrics[] = [];

  private constructor(private context: vscode.ExtensionContext) {}

  static getInstance(context: vscode.ExtensionContext): ThemeTransitionManager {
    if (!this.instance) {
      this.instance = new ThemeTransitionManager(context);
    }
    return this.instance;
  }

  async transitionTo(
    targetThemeId: string,
    duration: number = 1000
  ): Promise<void> {
    if (this.isTransitioning) {
      return;
    }

    const metrics: TransitionMetrics = {
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      frameCount: 0,
      memoryStart: process.memoryUsage(),
      memoryEnd: process.memoryUsage(),
    };

    try {
      this.isTransitioning = true;

      // Get current workspace colors
      const currentColors =
        (vscode.workspace
          .getConfiguration("workbench")
          .get("colorCustomizations") as Record<string, string>) || {};

      // Get target theme
      const themeManager = await import("../themeManager").then(
        ({ ThemeManager }) => ThemeManager.getInstance(this.context)
      );

      const targetTheme = await themeManager.getTheme(targetThemeId);
      const targetColors = targetTheme.colors;

      // Calculate color transitions
      const steps = 10;
      const stepDuration = duration / steps;

      for (let i = 1; i <= steps; i++) {
        metrics.frameCount++;
        const progress = i / steps;
        const interpolatedColors = this.interpolateColors(
          currentColors,
          targetColors,
          progress
        );

        await vscode.workspace
          .getConfiguration("workbench")
          .update(
            "colorCustomizations",
            interpolatedColors,
            vscode.ConfigurationTarget.Global
          );

        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }

      // Set final theme
      await themeManager.setTheme(targetThemeId);

      // Reset color customizations
      await vscode.workspace
        .getConfiguration("workbench")
        .update("colorCustomizations", {}, vscode.ConfigurationTarget.Global);
    } finally {
      this.isTransitioning = false;
      metrics.endTime = performance.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.memoryEnd = process.memoryUsage();
      this.transitionMetrics.push(metrics);

      // Keep only last 10 metrics
      if (this.transitionMetrics.length > 10) {
        this.transitionMetrics.shift();
      }
    }
  }

  getPerformanceMetrics(): TransitionMetrics[] {
    return this.transitionMetrics;
  }

  private interpolateColors(
    start: Record<string, string>,
    end: Record<string, string>,
    progress: number
  ): Record<string, string> {
    const result: Record<string, string> = {};
    const allKeys = new Set([...Object.keys(start), ...Object.keys(end)]);

    for (const key of allKeys) {
      const startColor = this.parseColor(start[key] || "#000000");
      const endColor = this.parseColor(end[key] || "#000000");

      if (startColor && endColor) {
        result[key] = this.rgbToHex(
          Math.round(startColor.r + (endColor.r - startColor.r) * progress),
          Math.round(startColor.g + (endColor.g - startColor.g) * progress),
          Math.round(startColor.b + (endColor.b - startColor.b) * progress)
        );
      }
    }

    return result;
  }

  private parseColor(
    color: string
  ): { r: number; g: number; b: number } | null {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = Math.max(0, Math.min(255, x)).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  dispose(): void {
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval);
    }
  }
}
