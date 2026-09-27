import { ThemeRegistry } from './types/themes';

export const THEME_REGISTRY: ThemeRegistry = {
  'tct-ayu': {
    id: 'tct-ayu',
    label: 'TCT Ayu',
    path: './themes/ayu.json',
    uiTheme: 'vs-dark',
    description: 'A classic dark theme.',
    variants: {
      italic: {
        id: 'tct-ayu-italic',
        label: 'TCT Ayu Italic',
        path: './themes/ayuItalic.json',
      },
    },
  },
  'tct-darcula': {
    id: 'tct-darcula',
    label: 'TCT Darcula',
    path: './themes/darcula.json',
    uiTheme: 'vs-dark',
    description: 'A classic dark theme from JetBrains.',
  },
  'tct-gruvbox': {
    id: 'tct-gruvbox',
    label: 'TCT Gruvbox',
    path: './themes/gruvbox.json',
    uiTheme: 'vs-dark',
    description: 'A retro-inspired theme.',
    variants: {
      italic: {
        id: 'tct-gruvbox-italic',
        label: 'TCT Gruvbox Italic',
        path: './themes/gruvboxItalic.json',
      },
    },
  },
  'tct-monokai': {
    id: 'tct-monokai',
    label: 'TCT Monokai',
    path: './themes/monokai.json',
    uiTheme: 'vs-dark',
    description: 'A popular theme with vibrant colors.',
    variants: {
      italic: {
        id: 'tct-monokai-italic',
        label: 'TCT Monokai Italic',
        path: './themes/monokaiItalic.json',
      },
    },
  },
  'tct-oceanic': {
    id: 'tct-oceanic',
    label: 'TCT Oceanic',
    path: './themes/oceanic.json',
    uiTheme: 'vs-dark',
    description: 'A theme with a blueish tint.',
    variants: {
      italic: {
        id: 'tct-oceanic-italic',
        label: 'TCT Oceanic Italic',
        path: './themes/oceanicItalic.json',
      },
    },
  },
  'tct-one-dark': {
    id: 'tct-one-dark',
    label: 'TCT One Dark',
    path: './themes/one.json',
    uiTheme: 'vs-dark',
    description: "Atom's iconic One Dark theme.",
    variants: {
      italic: {
        id: 'tct-one-dark-italic',
        label: 'TCT One Dark Italic',
        path: './themes/oneItalic.json',
      },
    },
  },
  'tct-slime': {
    id: 'tct-slime',
    label: 'TCT Slime',
    path: './themes/slime.json',
    uiTheme: 'vs-dark',
    description: 'A dark theme with green accents.',
    variants: {
      italic: {
        id: 'tct-slime-italic',
        label: 'TCT Slime Italic',
        path: './themes/slimeItalic.json',
      },
    },
  },
  'tct-simple-light': {
    id: 'tct-simple-light',
    label: 'TCT Simple Light',
    path: './themes/simple-as-light-theme.json',
    uiTheme: 'vs',
    description: 'A clean and minimal light theme.',
  },
  'tct-forest': {
    id: 'tct-forest',
    label: 'TCT Forest',
    path: './themes/TCTForest.json',
    uiTheme: 'vs-dark',
    description: 'A theme inspired by nature.',
    recommendations: ['python'],
  },
  'tct-zen-garden': {
    id: 'tct-zen-garden',
    label: 'TCT Zen Garden',
    path: './themes/TCTZenGarden.json',
    uiTheme: 'vs-dark',
    description: 'A minimalist theme for focus.',
    recommendations: ['python'],
  },
  'tct-sea-wave': {
    id: 'tct-sea-wave',
    label: 'TCT Sea Wave',
    path: './themes/TCTSeaWave.json',
    uiTheme: 'vs-dark',
    description: 'A theme with ocean vibes.',
    recommendations: ['javascript', 'typescript'],
  },
  'tct-starry-night': {
    id: 'tct-starry-night',
    label: 'TCT Starry Night',
    path: './themes/TCTStarryNight.json',
    uiTheme: 'vs-dark',
    description: 'A theme inspired by the night sky.',
    recommendations: ['javascript', 'typescript'],
  },
  'tct-solarized-dark': {
    id: 'tct-solarized-dark',
    label: 'TCT Solarized Dark',
    path: './themes/TCTSolarizedDark.json',
    uiTheme: 'vs-dark',
    description: 'A dark theme based on the popular Solarized palette.',
    variants: {
      light: {
        id: 'tct-solarized-light',
        label: 'TCT Solarized Light',
        path: './themes/TCTSolarizedLight.json',
      },
    },
  },
  'tct-solarized-light': {
    id: 'tct-solarized-light',
    label: 'TCT Solarized Light',
    path: './themes/TCTSolarizedLight.json',
    uiTheme: 'vs',
    description: 'A light theme based on the popular Solarized palette.',
    variants: {
      dark: {
        id: 'tct-solarized-dark',
        label: 'TCT Solarized Dark',
        path: './themes/TCTSolarizedDark.json',
      },
    },
  },
  'tct-nord': {
    id: 'tct-nord',
    label: 'TCT Nord',
    path: './themes/TCTNord.json',
    uiTheme: 'vs-dark',
    description: 'A theme based on the popular Nord color palette.',
  },
  'tct-gruvbox-material': {
    id: 'tct-gruvbox-material',
    label: 'TCT Gruvbox Material',
    path: './themes/TCTGruvboxMaterial.json',
    uiTheme: 'vs-dark',
    description: 'A more modern take on the Gruvbox theme.',
  },
  'tct-high-contrast': {
    id: 'tct-high-contrast',
    label: 'TCT High Contrast',
    path: './themes/TCTHighContrast.json',
    uiTheme: 'vs-dark',
    description: 'A high-contrast theme for maximum readability.',
  },
};
