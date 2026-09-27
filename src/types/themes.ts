export interface ThemeVariant {
  id: string;
  label: string;
  path: string;
}

export interface ThemeRegistryEntry {
  id: string;
  label:string;
  path: string;
  uiTheme: 'vs-dark' | 'vs';
  description: string;
  recommendations?: string[];
  variants?: {
    [key: string]: ThemeVariant;
  };
}

export interface ThemeRegistry {
  [key: string]: ThemeRegistryEntry;
}
