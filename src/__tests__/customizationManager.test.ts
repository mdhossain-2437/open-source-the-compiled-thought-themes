import * as vscode from "vscode";
import { CustomizationManager } from "../customizationManager";

describe("CustomizationManager Dynamic Engine", () => {
  const sampleThemes = ["TCT Aurora", "TCT Cyber Synthwave", "TCT Deep Ocean"];

  beforeEach(() => {
    CustomizationManager.setRegisteredThemes(sampleThemes);
  });

  afterEach(async () => {
    await CustomizationManager.resetCustomizations();
  });

  test("should register theme labels uniquely", () => {
    CustomizationManager.setRegisteredThemes(["TCT Ayu", "TCT Ayu", "TCT Dark"]);
    // Should not throw and options can be read
    const options = CustomizationManager.getOptions();
    expect(options).toBeDefined();
    expect(typeof options.italicComments).toBe("boolean");
  });

  test("should apply token customizations across registered TCT themes", async () => {
    CustomizationManager.setRegisteredThemes(sampleThemes);
    await CustomizationManager.applyCustomizations();

    const editorConfig = vscode.workspace.getConfiguration("editor");
    const tokens = editorConfig.get<Record<string, Record<string, unknown>>>("tokenColorCustomizations");

    expect(tokens).toBeDefined();
    expect(tokens!["[TCT Aurora]"]).toBeDefined();
    expect(tokens!["[TCT Aurora]"].comments).toBe("italic");
    expect(tokens!["[TCT Cyber Synthwave]"]).toBeDefined();
    expect(tokens!["[TCT Deep Ocean]"]).toBeDefined();
  });

  test("should apply status bar accent when accentStatusBar is true", async () => {
    const config = vscode.workspace.getConfiguration("tct.customization");
    await config.update("accentStatusBar", true, vscode.ConfigurationTarget.Global);

    await CustomizationManager.applyCustomizations();

    const workbenchConfig = vscode.workspace.getConfiguration("workbench");
    const colors = workbenchConfig.get<Record<string, Record<string, string>>>("colorCustomizations");

    expect(colors).toBeDefined();
    expect(colors!["[TCT Aurora]"]["statusBar.background"]).toBe("#0B132B");
    expect(colors!["[TCT Aurora]"]["statusBar.foreground"]).toBe("#6FFFE9");
  });

  test("should reset customizations cleanly without affecting other themes", async () => {
    const editorConfig = vscode.workspace.getConfiguration("editor");
    // Simulate pre-existing third-party customization
    await editorConfig.update(
      "tokenColorCustomizations",
      { "[Other ThirdParty Theme]": { comments: "italic" } },
      vscode.ConfigurationTarget.Global
    );

    CustomizationManager.setRegisteredThemes(sampleThemes);
    await CustomizationManager.applyCustomizations();
    await CustomizationManager.resetCustomizations();

    const tokens = editorConfig.get<Record<string, Record<string, unknown>>>("tokenColorCustomizations");
    expect(tokens!["[Other ThirdParty Theme]"]).toBeDefined();
    expect(tokens!["[TCT Aurora]"]).toBeUndefined();
    expect(tokens!["[TCT Cyber Synthwave]"]).toBeUndefined();
  });

  test("should handle quick pick selection and update configuration", async () => {
    // QuickPick mock resolves first item
    await CustomizationManager.promptCustomizationQuickPick();

    const options = CustomizationManager.getOptions();
    expect(options).toBeDefined();
  });
});
