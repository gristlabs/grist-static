/**
 * pyodide has a pyc version we'd like to use, currently at:
 *   https://cdn.jsdelivr.net/pyodide/v0.23.4/pyc/
 * Unlike the rest of pyodide, the version isn't available in
 * github releases or other packaged forms that I can find,
 * so we play some tricks to fetch it.
 *
 * (We could do simply:
 *   loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/pyc/'})
 * but then grist-static wouldn't be usable at all without a network, and
 * we'd need to document the extra dependency).
 */

const fs = require('fs');
const fetch = require('node-fetch');
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
  for (const f of files) {
    const src = indexURL + f;
    console.log(`checking for version of ${f} at ${src}`);
    const fileResponse = await fetch(src);
    if (fileResponse.ok) {
      const fileBuffer = await fileResponse.buffer();
      const outputFile = path.join(base, f);
      fs.writeFileSync(outputFile, fileBuffer);
      console.log(`Wrote to ${outputFile}`);
    }
  }
  fs.writeFileSync(checkFile, '');
}

scanFiles().catch(e => console.error(e));
