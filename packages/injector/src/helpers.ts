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

export async function getVersionMetadata(logger: Logger, cdn: string, _version: string): Promise<VersionMetadata> {
  logger.info(`Retrieving version from cdn: ${cdn} version: ${_version}`);
  let version = _version;
  if (version !== 'latest' && version !== 'stable' && version !== 'next') {
    version = `${_version}/config`;
  }
  const res = await fetch(`${cdn}/${version}.json`, { cache: 'no-cache' });
  return res.json();
}
