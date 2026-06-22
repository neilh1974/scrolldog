import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const warnings = [];

runNodeTool('tools/validate_extension.mjs');
runNodeTool('tools/stage_extension.mjs');
expectFile('manifest.json');
expectFile('popup.html');
expectFile('popup.js');
expectFile('content.js');
expectFile('content.css');
expectFile('PRIVACY.md');
expectFile('icons/icon1024.png');
expectFile('tools/convert_safari.sh');
expectExecutable('tools/convert_safari.sh');
expectFile('Build/WebExtension/manifest.json');
expectFile('Build/WebExtension/content.js');
expectFile('Build/WebExtension/popup.html');
expectOnlyStagedFiles();
expectNoLargeUnexpectedFiles();

const converter = spawnSync('xcrun', ['--find', 'safari-web-extension-converter'], { encoding: 'utf8' });
if (converter.status === 0) {
  pass('Safari converter exists');
} else {
  warnings.push('Safari converter is missing because full Xcode is not selected');
}

const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
if (xcode.status === 0) {
  pass('Xcode build tool exists');
} else {
  warnings.push('Xcode build tool is unavailable because full Xcode is not selected');
}

const generatedProject = findGeneratedProject(join(root, 'Safari'));
if (generatedProject) {
  pass('Safari Xcode project exists');
} else {
  warnings.push('Safari Xcode project has not been generated on this machine');
}

for (const warning of warnings) console.log(`WARN ${warning}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else if (warnings.length) {
  console.log('SOURCE READY');
  console.log('APPLE TOOLCHAIN PENDING');
} else {
  console.log('LAUNCH AUDIT PASSED');
}

function runNodeTool(file) {
  const result = spawnSync('node', [file], { cwd: root, encoding: 'utf8' });
  if (result.status === 0) {
    pass(`${file} passes`);
  } else {
    failures.push(`${file} failed`);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

function expectFile(file) {
  expect(existsSync(join(root, file)), `${file} exists`);
}

function expectExecutable(file) {
  const mode = statSync(join(root, file)).mode;
  expect(Boolean(mode & 0o111), `${file} is executable`);
}

function expectNoLargeUnexpectedFiles() {
  const limit = 2 * 1024 * 1024;
  for (const file of walk(root)) {
    if (file.includes('/.git/')) continue;
    if (statSync(file).size > limit) failures.push(`${file} is larger than expected`);
  }
  pass('no large unexpected files found');
}

function expectOnlyStagedFiles() {
  const expected = new Set([
    'manifest.json',
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
  ]);
  const folder = join(root, 'Build', 'WebExtension');
  for (const file of walk(folder)) {
    const relative = file.slice(folder.length + 1);
    expect(expected.has(relative), `${relative} is an expected staged file`);
    expected.delete(relative);
  }
  expect(expected.size === 0, 'all expected files are staged');
}

function findGeneratedProject(folder) {
  if (!existsSync(folder)) return null;
  return walk(folder).find((file) => file.endsWith('.xcodeproj/project.pbxproj')) || null;
}

function walk(folder) {
  const files = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function expect(condition, message) {
  if (condition) {
    pass(message);
  } else {
    failures.push(message);
  }
}

function pass(message) {
  console.log(`PASS ${message}`);
}
