const fs = require('fs');
const path = require('path');

const THEME_REGISTRY_PATH = path.join(__dirname, '../src/themeRegistry.ts');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

function parseThemeRegistry() {
  let content = fs.readFileSync(THEME_REGISTRY_PATH, 'utf8');
  // This is a bit of a hack, but it's for a build script so it's fine.
  content = content
    .replace(/import.*from.*/g, '')
    .replace(/export const THEME_REGISTRY: ThemeRegistry =/g, '')
    .replace(/;/g, '')
    .trim();

  // Using eval as this is a controlled environment.
  return eval(`(${content})`);
}

function generateThemeContributions(registry) {
  const contributions = [];
  for (const themeId in registry) {
    const theme = registry[themeId];
    contributions.push({
      label: theme.label,
      uiTheme: theme.uiTheme,
      path: theme.path,
    });

    if (theme.variants) {
      for (const variantId in theme.variants) {
        const variant = theme.variants[variantId];
        contributions.push({
          label: variant.label,
          uiTheme: theme.uiTheme,
          path: variant.path,
        });
      }
    }
  }
  return contributions;
}

function updatePackageJson() {
  const registry = parseThemeRegistry();
  const newThemes = generateThemeContributions(registry);

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  packageJson.contributes.themes = newThemes;

  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('Successfully updated package.json with themes from the registry.');
}

updatePackageJson();
