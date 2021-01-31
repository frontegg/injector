export default class Logger {
  constructor(private disabled: boolean = false, private logger?: ((str: string) => void) | null) {}

  private log = (l: string, prefix: string, color?: string) => {
    if (this.disabled) {
      return () => {};
    }
    if (typeof this.logger === 'function') {
      return this.logger;
    }
    // tslint:disable-next-line:no-console
    if (console.log.bind === undefined) {
      // @ts-ignore
      return Function.prototype.bind.call(console[l], console, prefix || '', color || '-');
    } else {
      // @ts-ignore
      return console[l].bind(console, prefix || '', color || '-');
    }
  };
  info = this.log?.('log', '%c[AdminBox]', 'background:#e8e8e8;');
  warn = this.log?.('warn', '[AdminBox]');
  error = this.log?.('error', '[AdminBox]');
}
