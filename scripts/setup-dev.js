const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Setup git hooks
try {
  execSync('npx husky install');
  execSync('npx husky add .husky/pre-commit "npx lint-staged"');
  execSync('npx husky add .husky/pre-push "npm run validate"');
} catch (error) {
  console.error('Error setting up git hooks:', error);
}

// Create necessary directories
const dirs = ['src/__tests__', 'src/themes', 'src/icons'];
dirs.forEach((dir) => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Create sample test file if it doesn't exist
const testFile = path.join(__dirname, '../src/__tests__/themeManager.test.ts');
if (!fs.existsSync(testFile)) {
  const testContent = `import { ThemeManager } from '../themeManager';

describe('ThemeManager', () => {
  it('should be a singleton', () => {
    const instance1 = ThemeManager.getInstance();
    const instance2 = ThemeManager.getInstance();
    expect(instance1).toBe(instance2);
  });
});`;
  fs.writeFileSync(testFile, testContent);
}

console.log('Development environment setup complete! 🚀');
