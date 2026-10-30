import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const htmlPaths = ['index.html'].map((file) => path.join(publicDir, file));
const now = new Date();
const fallbackVersion = [
  String(now.getFullYear()),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('') + `.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12)
  || process.env.VERCEL_DEPLOYMENT_ID
  || fallbackVersion;

for (const htmlPath of htmlPaths) {
  const source = fs.readFileSync(htmlPath, 'utf8');
  const updated = source.replace(/([?&]v=)[^"&]+/g, `$1${version}`);

  if (updated === source) {
    throw new Error(`Không tìm thấy asset version trong ${path.relative(publicDir, htmlPath)}`);
  }

  fs.writeFileSync(htmlPath, updated);
}

const swPath = path.join(publicDir, 'sw.js');
const swSource = fs.readFileSync(swPath, 'utf8');
if (!swSource.includes('__ASSET_VERSION__')) {
  throw new Error('Không tìm thấy __ASSET_VERSION__ trong sw.js');
}
fs.writeFileSync(swPath, swSource.replaceAll('__ASSET_VERSION__', version));
console.log(`Asset version: ${version}`);