export interface InjectorOptions {
  displayAs?: 'dialog' | 'fullscreen',
  version: string | 'latest' | 'stable';
  cdn?: string;
}

export interface VersionMetadata {
  version: string;
  js: string[];
  css: string[];
}
