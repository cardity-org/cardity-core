#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));

function fail(message) {
  throw new Error(message);
}

function hasShebang(filePath) {
  return fs.readFileSync(filePath, 'utf8').startsWith('#!/usr/bin/env node');
}

const bin = packageJson.bin || {};

for (const [name, relativePath] of Object.entries(bin)) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`package.json bin ${name} points to missing file: ${relativePath}`);
  if (!hasShebang(absolutePath)) fail(`package.json bin ${name} is not executable: ${relativePath}`);
}

const executableBinFiles = fs.readdirSync(path.join(root, 'bin'))
  .filter((file) => file.endsWith('.js'))
  .filter((file) => hasShebang(path.join(root, 'bin', file)))
  .map((file) => `bin/${file}`)
  .sort();

const mappedBinFiles = Object.values(bin).sort();
for (const executable of executableBinFiles) {
  if (!mappedBinFiles.includes(executable)) {
    fail(`executable bin file is not exposed by package.json bin: ${executable}`);
  }
}

for (const requiredFile of [
  'README.md',
  'LICENSE',
  'CMakeLists.txt',
  'bin/cardity.js',
  'bin/cardity_agent.js',
  'bin/cardity_http_server.js',
  'bin/cardity_mcp_server.js',
  'schemas/registry.json',
  'registry/catalog.json',
  'registry/runtimes.json',
  'prompts/cardity_protocol_author.md',
  'templates/member_points/protocol.car',
  'examples/01_counter.car',
  'docs/conformance.md',
  'docs/system_architecture_ops_map.md',
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) fail(`required package file missing: ${requiredFile}`);
}

for (const requiredDirectory of [
  'bin/',
  'compiler/',
  'prompts/',
  'schemas/',
  'registry/',
  'scripts/',
  'templates/',
  'examples/',
  'docs/',
]) {
  if (!packageJson.files.includes(requiredDirectory)) {
    fail(`package.json files is missing ${requiredDirectory}`);
  }
}

if (packageJson.scripts?.prepublishOnly !== 'npm run build') {
  fail('prepublishOnly should build native binaries before npm publish');
}

console.log(`NPM package metadata verified: ${Object.keys(bin).length} executable bin(s), ${packageJson.files.length} package file entries`);
