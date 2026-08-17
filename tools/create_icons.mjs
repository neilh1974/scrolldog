import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sizes = [16, 32, 48, 96, 128, 256, 512, 1024];
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'icons', 'icon.svg');

if (!existsSync(source)) {
  console.error('Missing icons/icon.svg');
  process.exit(1);
}

const temporary = mkdtempSync(`${tmpdir()}${sep}scrolldog-icons-`);
const preview = join(temporary, 'icon.svg.png');

try {
  run('qlmanage', ['-t', '-s', '1024', '-o', temporary, source]);
  copyFileSync(preview, join(root, 'icons', 'icon1024.png'));

  for (const size of sizes.filter((value) => value !== 1024)) {
    const target = join(root, 'icons', `icon${size}.png`);
    run('sips', ['-z', String(size), String(size), preview, '--out', target]);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log(`CREATED ${sizes.length} ICONS`);

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}
