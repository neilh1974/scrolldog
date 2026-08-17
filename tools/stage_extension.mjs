import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'Build', 'WebExtension');
const files = [
  'manifest.json',
  'dog_art.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'popup.css',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon96.png',
  'icons/icon128.png',
  'icons/icon256.png',
  'icons/icon512.png',
  'icons/icon1024.png',
];

rmSync(out, { recursive: true, force: true });

for (const file of files) {
  const target = join(out, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, file), target);
}

console.log(`STAGED ${files.length} FILES`);
