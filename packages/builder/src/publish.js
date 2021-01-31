const fs = require('fs');
const { gzip } = require('node-gzip');
const { BlobServiceClient } = require('@azure/storage-blob');
const deploymentType = process.argv[2] === 'latest' || process.argv[2] === 'stable' ? process.argv[2] : null;
const fsOptions = { encoding: 'utf8' };

const packageJson = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, fsOptions));
const staticFolder = `${process.cwd()}/build/static`;
const entrypointChunks = JSON.parse(fs.readFileSync(`${staticFolder}/version.json`, fsOptions));
const version = packageJson.version;

const jsFiles = fs.readdirSync(`${staticFolder}/js/`);
const cssFiles = fs.readdirSync(`${staticFolder}/css/`);

// const mainJsFileName = jsFiles.find(name => name.startsWith('main.'));
// const mainJsFilePath = `${staticFolder}/js/${mainJsFileName}`;
// let mainJsFile = fs.readFileSync(mainJsFilePath, fsOptions);
// mainJsFile = mainJsFile.startsWith('window.ADMIN_BOX_VERSION = ') ? mainJsFile : `window.ADMIN_BOX_VERSION = "${version}";\n${mainJsFile}`;
// fs.writeFileSync(mainJsFilePath, mainJsFile, fsOptions);

// if (!process.env.CI) {
//   const cdnFolder = path.join(process.cwd(), '../../cdn');
//   const cdnVersions = JSON.parse(fs.readFileSync(`${cdnFolder}/versions.json`, fsOptions));
//   cdnVersions.latest = version;
//   cdnVersions.versions[version] = entrypointChunks;
//   fs.mkdirSync(`${cdnFolder}/versions/${version}/js`, { recursive: true });
//   fs.mkdirSync(`${cdnFolder}/versions/${version}/css`, { recursive: true });
//
//   jsFiles.forEach(jsFile => fs.copyFileSync(`${staticFolder}/js/${jsFile}`, `${cdnFolder}/versions/${version}/js/${jsFile}`));
//   cssFiles.forEach(cssFile => fs.copyFileSync(`${staticFolder}/css/${cssFile}`, `${cdnFolder}/versions/${version}/css/${cssFile}`));
//   fs.writeFileSync(`${cdnFolder}/versions.json`, JSON.stringify(cdnVersions, null, 2), fsOptions);
// }


async function uploadToCDN() {
  // Create the BlobServiceClient object which will be used to create a container client
  const blobServiceClient = await BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = await blobServiceClient.getContainerClient('admin-box');

  console.log(`Uploading new version to azure blobs: v${version}`);

  console.log(`Start uploading js files`);
  // upload version to blob
  await Promise.all(jsFiles.map(async (file) => {
    const blobName = `${version}/js/${file}`;
    const blobContent = await gzip(fs.readFileSync(`${staticFolder}/js/${file}`, fsOptions));

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(blobContent, blobContent.length, {
      tier: 'Hot',
      metadata: { version },
      blobHTTPHeaders: {
        blobContentType: file.endsWith('.txt') ? 'text/plain' : file.endsWith('.js.map') ? 'application/json' : 'text/javascript',
        blobCacheControl: 'public, max-age=31536000',
        blobContentEncoding: 'gzip',
      },
    });
    console.log(`  - ${blockBlobClient.url.replace(/%2F/g, '/')}`);
  }));

  console.log(`Start uploading css files`);
  await Promise.all(cssFiles.map(async (file) => {
    const blobName = `${version}/css/${file}`;
    const blobContent = await gzip(fs.readFileSync(`${staticFolder}/css/${file}`, fsOptions));

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(blobContent, blobContent.length, {
      tier: 'Hot',
      metadata: { version },
      blobHTTPHeaders: {
        blobContentType: 'text/css',
        blobCacheControl: 'public, max-age=31536000',
        blobContentEncoding: 'gzip',
      },
    });
    console.log(`  - ${blockBlobClient.url.replace(/%2F/g, '/')}`);
  }));

  console.log(`Start uploading config files`);
  const versionConfigFile = `${version}/config.json`;
  const versionConfigContent = await gzip(JSON.stringify({ ...entrypointChunks, version }));
  const blockBlobClient = containerClient.getBlockBlobClient(versionConfigFile);
  await blockBlobClient.upload(versionConfigContent, versionConfigContent.length, {
    tier: 'Hot',
    metadata: { version },
    blobHTTPHeaders: {
      blobContentType: 'application/json',
      blobCacheControl: 'public, max-age=31536000',
      blobContentEncoding: 'gzip',
    },
  });
  console.log(`  - ${blockBlobClient.url.replace(/%2F/g, '/')}`);


  if (deploymentType) {
    console.log(`Going to update ${deploymentType} version`);
    const versionConfigFile = `${deploymentType}.json`;
    const versionConfigContent = await gzip(JSON.stringify({ ...entrypointChunks, version }));
    const blockBlobClient = containerClient.getBlockBlobClient(versionConfigFile);
    await blockBlobClient.upload(versionConfigContent, versionConfigContent.length, {
      tier: 'Hot',
      metadata: { version },
      blobHTTPHeaders: {
        blobContentType: 'application/json',
        blobCacheControl: 'no-cache',
        blobContentEncoding: 'gzip',
      },
    });
  }

  // for await (const blob of containerClient.listBlobsFlat()) {
  //   console.log('\t', blob.name);
  // }
}

uploadToCDN().catch(e => console.error(e));
