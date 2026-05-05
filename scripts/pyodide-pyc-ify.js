/**
 * pyodide has a pyc version we'd like to use at jsdelivr's
 * /pyodide/v<version>/pyc/. The version is read from the installed
 * pyodide's package.json (see ext/package.json). It isn't packaged
 * as a separate npm release, so we fetch and overlay manually.
 */

const fs = require('fs');
const path = require('path');

// Regular pyodide release is stored here.
const base = 'node_modules/pyodide';

// Scan pyodide release, and replace any files with a "pyc" version.
async function scanFiles() {
  const packageFile = path.join(base, 'package.json');
  const data = fs.readFileSync(packageFile, 'utf8');
  const packageJson = JSON.parse(data);
  const version = packageJson.version;

  console.log(`pyodide version ${version}`);

  const checkFile = path.join(base, `checked-${version}.txt`);
  if (fs.existsSync(checkFile)) {
    const packageTime = fs.statSync(packageFile).mtime;
    const checkTime = fs.statSync(checkFile).mtime;
    if (packageTime <= checkTime) {
      console.log('already converted to pyc');
      return;
    }
  }

  const indexURL = `https://cdn.jsdelivr.net/pyodide/v${version}/pyc/`;
  const files = fs.readdirSync(base);
  await Promise.all(files.map(async f => {
    const src = indexURL + f;
    const fileResponse = await fetch(src);
    if (!fileResponse.ok) { return; }
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const outputFile = path.join(base, f);
    fs.writeFileSync(outputFile, fileBuffer);
    console.log(`overlaid ${f}`);
  }));
  fs.writeFileSync(checkFile, '');
}

scanFiles().catch(e => console.error(e));
