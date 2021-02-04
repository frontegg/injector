export interface InjectorOptions {
  version: string | 'latest' | 'stable' | 'next';
  cdn?: string;

  themeOptions: {
    displayAs?: 'dialog' | 'fullscreen';
    [key: string]: any;
  };
  contextOptions: any;
}

export interface VersionMetadata {
  version: string;
  js: string[];
  css: string[];
}
