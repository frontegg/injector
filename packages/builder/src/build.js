const fs = require('fs');
const rewire = require('rewire');

process.env.PUBLIC_URL = '/FRONTEGG_INJECTOR_CDN_HOST';

const defaults = rewire('react-scripts/scripts/build.js');
let config = defaults.__get__('config');

const injectScripts = (compilation) => {
  console.log('searching for main chunk');
  const mainChunk = compilation.chunks.find((({ name }) => name.startsWith('runtime')));
  const mainJsFile = mainChunk.files.find(file => file.endsWith('.js'));
  const mainJsFilePath = `${process.cwd()}/build/${mainJsFile}`;

  console.log('injecting AdminBox scripts and shadow dom helpers');
  let jsContent = fs.readFileSync(mainJsFilePath, { encoding: 'utf8' });

  jsContent = jsContent
    .replace(`"static/js/"`, `(typeof fronteggInjector !== 'undefined' ? fronteggInjector.version : 'static') + "/js/"`)
    .replace(`"static/css/"`, `(typeof fronteggInjector !== 'undefined' ? fronteggInjector.version : 'static') + "/css/"`)
    .replace(`document.head.appendChild`, `(typeof fronteggInjector !=='undefined' ? fronteggInjector.injectJavascript : document.head.appendChild)`)
    .replace(`document.getElementsByTagName("head")[0].appendChild`, `(typeof fronteggInjector !=='undefined' ? fronteggInjector.injectCss : document.getElementsByTagName("head")[0].appendChild)`);

  console.log(`update file: ${mainJsFilePath}`);
  fs.writeFileSync(mainJsFilePath, jsContent, { encoding: 'utf8' });
};
const findEntrypointScripts = (compilation) => {
  const entrypointGroupId = compilation.entrypoints.get('main').groupDebugId;
  console.log(`entrypoint mainGroupId:`, entrypointGroupId);

  const entrypointChunks = {
    js: [],
    css: [],
  };
  compilation.chunks.filter(chunk => {
    const groups = Array.from(chunk._groups.entries())[0];
    const isMainChunk = groups.find(({ groupDebugId }) => entrypointGroupId === groupDebugId) != null;
    if (isMainChunk) {
      entrypointChunks.js.push(...chunk.files.filter(f => f.endsWith('.js')).map(f => f.substring('static/js/'.length)));
      entrypointChunks.css.push(...chunk.files.filter(f => f.endsWith('.css')).map(f => f.substring('static/css/'.length)));
    }
  });

  return entrypointChunks;
};

config.devtool = undefined;
config.plugins.push({
  apply: (compiler) => {
    compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
      injectScripts(compilation);
      const entrypointChunks = findEntrypointScripts(compilation);
      fs.writeFileSync(`${process.cwd()}/build/static/version.json`, JSON.stringify(entrypointChunks), { encoding: 'utf8' });
    });
  },
});
