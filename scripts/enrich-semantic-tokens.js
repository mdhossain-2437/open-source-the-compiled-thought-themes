const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '..', 'themes');

function extractHex(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && typeof val.foreground === 'string') return val.foreground.trim();
  return null;
}

function hexToRgb(input) {
  const hex = extractHex(input);
  if (!hex || typeof hex !== 'string') return [128, 128, 128];
  let c = hex.replace('#', '').trim();
  if (c.length === 8) c = c.slice(0, 6);
  if (c.length === 4) c = c.slice(0, 3);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [128, 128, 128];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function luminance([r, g, b]) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(val1, val2) {
  const hex1 = extractHex(val1);
  const hex2 = extractHex(val2);
  if (!hex1 || !hex2) return 10;
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function adjustContrast(foregroundInput, backgroundInput, minContrast = 4.5) {
  const fg = extractHex(foregroundInput);
  const bg = extractHex(backgroundInput);
  if (!fg || !bg) return foregroundInput || '#FFFFFF';
  
  const current = getContrast(fg, bg);
  if (current >= minContrast) {
    if (typeof foregroundInput === 'object' && foregroundInput !== null) {
      return { ...foregroundInput, foreground: fg };
    }
    return fg;
  }

  const bgLum = luminance(hexToRgb(bg));
  const isDarkBg = bgLum < 0.5;
  let [r, g, b] = hexToRgb(fg);

  for (let i = 0; i < 30; i++) {
    if (isDarkBg) {
      r = Math.min(255, r + 8);
      g = Math.min(255, g + 8);
      b = Math.min(255, b + 8);
    } else {
      r = Math.max(0, r - 8);
      g = Math.max(0, g - 8);
      b = Math.max(0, b - 8);
    }
    const candidate = rgbToHex([r, g, b]);
    if (getContrast(candidate, bg) >= minContrast) {
      if (typeof foregroundInput === 'object' && foregroundInput !== null) {
        return { ...foregroundInput, foreground: candidate };
      }
      return candidate;
    }
  }
  const fallback = rgbToHex([r, g, b]);
  if (typeof foregroundInput === 'object' && foregroundInput !== null) {
    return { ...foregroundInput, foreground: fallback };
  }
  return fallback;
}

// Load all themes into memory
const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));
const themeMap = new Map();

for (const file of themeFiles) {
  const raw = fs.readFileSync(path.join(themesDir, file), 'utf8');
  themeMap.set(file, JSON.parse(raw));
}

function resolveProperty(file, propGetter) {
  const current = themeMap.get(file);
  if (!current) return null;
  const direct = propGetter(current);
  if (direct) return direct;
  if (current.include) {
    const parentFile = path.basename(current.include);
    return resolveProperty(parentFile, propGetter);
  }
  return null;
}

function resolveBackground(file) {
  return resolveProperty(file, t => t.colors && t.colors['editor.background']) || '#1E1E1E';
}

function resolveForeground(file) {
  return resolveProperty(file, t => t.colors && t.colors['editor.foreground']) || '#D4D4D4';
}

function resolveAllTokens(file, visited = new Set()) {
  if (visited.has(file)) return [];
  visited.add(file);
  const current = themeMap.get(file);
  if (!current) return [];

  let tokens = Array.isArray(current.tokenColors) ? [...current.tokenColors] : [];
  if (current.include) {
    const parentFile = path.basename(current.include);
    tokens = [...resolveAllTokens(parentFile, visited), ...tokens];
  }
  return tokens;
}

let updatedCount = 0;

for (const file of themeFiles) {
  const theme = themeMap.get(file);
  const bg = resolveBackground(file);
  const fg = resolveForeground(file);
  const isLight = theme.type === 'light';

  const allTokens = resolveAllTokens(file);
  const existingSemantic = theme.semanticTokenColors || {};

  let funcColor = null, typeColor = null, varColor = null, constColor = null;
  let paramColor = null, kwColor = null, strColor = null, commentColor = null;

  for (const rule of allTokens) {
    const scope = Array.isArray(rule.scope) ? rule.scope.join(' ') : (rule.scope || '');
    const c = rule.settings && rule.settings.foreground;
    if (!c || typeof c !== 'string') continue;

    if (!funcColor && (scope.includes('entity.name.function') || scope.includes('support.function'))) funcColor = c;
    if (!typeColor && (scope.includes('entity.name.type') || scope.includes('support.type') || scope.includes('entity.name.class'))) typeColor = c;
    if (!varColor && (scope.includes('variable') && !scope.includes('parameter'))) varColor = c;
    if (!constColor && (scope.includes('constant.numeric') || scope.includes('constant.language'))) constColor = c;
    if (!paramColor && scope.includes('variable.parameter')) paramColor = c;
    if (!kwColor && scope.includes('keyword')) kwColor = c;
    if (!strColor && scope.includes('string')) strColor = c;
    if (!commentColor && scope.includes('comment')) commentColor = c;
  }

  // Fallbacks if not found
  funcColor = funcColor || (isLight ? '#0066BB' : '#61AFEF');
  typeColor = typeColor || (isLight ? '#267F99' : '#4EC9B0');
  varColor = varColor || fg;
  constColor = constColor || (isLight ? '#0070C1' : '#D19A66');
  paramColor = paramColor || (isLight ? '#795E26' : '#E5C07B');
  kwColor = kwColor || (isLight ? '#AF00DB' : '#C678DD');
  strColor = strColor || (isLight ? '#A31515' : '#98C379');
  commentColor = commentColor || (isLight ? '#008000' : '#7F848E');

  const ensureContrast = (c) => adjustContrast(c, bg, 4.5);

  const semanticTokens = {
    namespace: ensureContrast(existingSemantic.namespace || typeColor),
    type: ensureContrast(existingSemantic.type || typeColor),
    class: ensureContrast(existingSemantic.class || typeColor),
    struct: ensureContrast(existingSemantic.struct || typeColor),
    interface: ensureContrast(existingSemantic.interface || typeColor),
    enum: ensureContrast(existingSemantic.enum || typeColor),
    typeParameter: ensureContrast(existingSemantic.typeParameter || paramColor),
    parameter: ensureContrast(existingSemantic.parameter || paramColor),
    variable: ensureContrast(existingSemantic.variable || varColor),
    'variable.readonly': ensureContrast(existingSemantic['variable.readonly'] || constColor),
    'variable.defaultLibrary': ensureContrast(existingSemantic['variable.defaultLibrary'] || typeColor),
    property: ensureContrast(existingSemantic.property || varColor),
    'property.readonly': ensureContrast(existingSemantic['property.readonly'] || constColor),
    enumMember: ensureContrast(existingSemantic.enumMember || constColor),
    event: ensureContrast(existingSemantic.event || funcColor),
    function: ensureContrast(existingSemantic.function || funcColor),
    'function.declaration': ensureContrast(existingSemantic['function.declaration'] || funcColor),
    method: ensureContrast(existingSemantic.method || funcColor),
    'method.declaration': ensureContrast(existingSemantic['method.declaration'] || funcColor),
    'member.declaration': ensureContrast(existingSemantic['member.declaration'] || funcColor),
    decorator: ensureContrast(existingSemantic.decorator || paramColor),
    macro: ensureContrast(existingSemantic.macro || constColor),
    label: ensureContrast(existingSemantic.label || varColor),
    comment: ensureContrast(existingSemantic.comment || commentColor),
    string: ensureContrast(existingSemantic.string || strColor),
    keyword: ensureContrast(existingSemantic.keyword || kwColor),
    'keyword.control': ensureContrast(existingSemantic['keyword.control'] || kwColor),
    number: ensureContrast(existingSemantic.number || constColor),
    regexp: ensureContrast(existingSemantic.regexp || strColor),
    operator: ensureContrast(existingSemantic.operator || kwColor),
  };

  theme.semanticHighlighting = true;
  theme.semanticTokenColors = semanticTokens;

  fs.writeFileSync(
    path.join(themesDir, file),
    JSON.stringify(theme, null, 2) + '\n',
    'utf8'
  );
  updatedCount++;
}

console.log(`Successfully enriched ${updatedCount} themes with semanticHighlighting and semanticTokenColors!`);
