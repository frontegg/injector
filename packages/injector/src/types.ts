export interface InjectorOptions {
  displayAs?: 'dialog' | 'fullscreen',
  version: string | 'latest' | 'stable' | 'next';
  cdn?: string;

  [key: string]: any;
}

export interface VersionMetadata {
  version: string;
  js: string[];
  css: string[];
}
