import Logger from './logger';
import { VersionMetadata } from './types';

export function getOrCreateHtmlElementInside(id: string, container: HTMLElement | ShadowRoot): HTMLElement {
  let el = container.querySelector(`#${id}`) as HTMLElement;
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('id', id);
    container.appendChild(el);
  }
  return el;
}


export async function getVersionMetadata(logger: Logger, cdn: string, version: string): Promise<VersionMetadata> {
  logger.info(`Retrieving version from cdn: ${version}`);
  const res = await fetch(`${cdn}/${version}`, { cache: 'no-cache' });
  return res.json();
}
