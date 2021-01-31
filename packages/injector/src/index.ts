import Logger from './logger';
import { InjectorOptions } from './types';
import { getOrCreateHtmlElementInside, getVersionMetadata } from './helpers';

const CONTAINER_ID_PREFIX = 'frontegg-host';
const CONTENT_ID_PREFIX = 'frontegg-content';

declare global {
  interface Window {
    FronteggInjector: Injector
  }
}

class Injector {
  private static _apps: { [name in string]: Injector } = {};

  private readonly logger: Logger;
  private readonly hostEl: HTMLElement;
  private readonly shadowEl: ShadowRoot;
  private readonly rootEl: HTMLElement;
  private js: string[] = [];
  private css: string[] = [];
  name: string = 'default';
  cdn: string = 'https://fronteggdeveustorage.blob.core.windows.net/admin-box';
  version: string = 'latest';
  mount: (element: HTMLElement) => void = () => {this.logger.error('App not loaded yet');};
  unmount: (element: HTMLElement) => void = () => {this.logger.error('App not loaded yet');};

  protected constructor(name: string) {
    this.logger = new Logger();
    this.logger.info('Create shadow dom element');
    this.hostEl = getOrCreateHtmlElementInside(`${CONTAINER_ID_PREFIX}-${name}`, document.body);
    this.shadowEl = this.hostEl.attachShadow({ mode: 'open' });
    this.rootEl = getOrCreateHtmlElementInside(CONTENT_ID_PREFIX, this.shadowEl);
    this.name = name;

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.destroy = this.destroy.bind(this);
    this.injectJavascript = this.injectJavascript.bind(this);
    this.injectCss = this.injectCss.bind(this);
  }

  static async init(options: InjectorOptions, name: string = 'default') {
    Object.assign(window, { FronteggInjector: Injector });
    const instance = new Injector(name);
    const { logger } = instance;

    logger.info('Initializing Injector instance');
    instance.cdn = options.cdn ?? instance.cdn;
    instance.cdn = instance.cdn.endsWith('/') ? instance.cdn.substring(0, instance.cdn.length - 1) : instance.cdn;

    logger.info('Retrieving version metadata');
    const metadata = await getVersionMetadata(logger, instance.cdn, options.version);
    instance.version = metadata.version;
    instance.js = metadata.js;
    instance.css = metadata.css;

    logger.info(`Injector instance initialized successfully`, { name, cdn: instance.version, ...metadata });
    Injector._apps[name] = instance;

    logger.info('Loading entrypoint files');
    await instance.loadEntrypoints();
    logger.info('Entrypoint files loaded successfully');
  }

  static getInstance(name: string = 'default') {
    const instance = Injector._apps[name];
    if (!instance) {
      throw Error(`injector instance not found for name: ${name}.\nInject.init(options${name === 'default' ? '' : `, '${name}'`}) must be called`);
    }
    return instance;
  }

  open() {
    this.mount(this.rootEl);
  }

  close() {
    this.unmount(this.rootEl);
  }

  destroy() {
    delete Injector._apps[this.name];
    this.hostEl.remove();
    this.logger.info(`${this.name} destroyed`);
  }

  protected async loadEntrypoints() {
    return Promise.all([
      ...this.js.map((file: string) => this.injectJavascript(`${this.cdn}/${this.version}/js/${file}`, true)),
      ...this.css.map((file: string) => this.injectCss(`${this.cdn}/${this.version}/css/${file}`)),
    ]);
  }

  injectJavascript(url: string | HTMLScriptElement, entrypoint: boolean = false): Promise<void> {
    return new Promise(async (resolve) => {
      const logger = this.logger;
      if (typeof url === 'string') {
        logger.info('Loading JS file from ', url);

        const res = await fetch(url, { method: 'GET', cache: 'default' });
        let contentScript = await res.text();

        const bundleScript = document.createElement('script');
        bundleScript.setAttribute('charset', 'utf-8');
        bundleScript.setAttribute('type', 'text/javascript');

        if (contentScript.indexOf('FRONTEGG_INJECTOR_CDN_HOST')) {
          contentScript = contentScript.replace('/FRONTEGG_INJECTOR_CDN_HOST', this.cdn);

          contentScript = `(()=> { const fronteggInjector = FronteggInjector.getInstance('${this.name}');
          ${contentScript}
          })();`;

        }
        bundleScript.innerHTML = contentScript;
        this.shadowEl.appendChild(bundleScript);
        logger.info('JS loaded successfully', url);

      } else {
        logger.info('Loading lazy JS file from ', url.src);
        this.shadowEl.appendChild(url);
      }
    });
  }

  injectCss(url: string | HTMLLinkElement): Promise<void> {
    return new Promise((resolve) => {
      const logger = this.logger!;
      if (typeof url === 'string') {
        logger.info('Loading CSS file from ', url);
        const bundleCss = document.createElement('link');
        bundleCss.href = url;
        bundleCss.rel = 'stylesheet';
        bundleCss.type = 'text/css';
        this.shadowEl.prepend(bundleCss);
        bundleCss.onload = e => {
          logger.info('CSS loaded successfully', url);
          resolve();
        };
      } else {
        logger.info('Loading lazy CSS file from ', url.href);
        this.shadowEl.insertBefore(url, this.rootEl);
      }
    });
  }
}

export default Injector;
