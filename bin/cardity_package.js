#!/usr/bin/env node

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function listCarFiles(rootDir, explicitModules) {
  if (explicitModules && Array.isArray(explicitModules)) {
    return explicitModules.map(m => path.resolve(rootDir, m.path || m.file || m));
  }
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        // skip common build/output dirs
        if (entry === 'build' || entry === 'dist' || entry === 'node_modules') continue;
        walk(p);
      } else if (stat.isFile() && entry.endsWith('.car')) {
        files.push(p);
      }
    }
  }
  walk(rootDir);
  return files;
}

function compileCar(projectRoot, carFile, outDir) {
  fse.ensureDirSync(outDir);
  const base = path.basename(carFile, '.car');
  const outCarc = path.join(outDir, `${base}.carc`);
  const bin = path.join(projectRoot, 'build', 'cardityc');
  const args = [carFile, '--format', 'carc', '-o', outCarc];
  const res = spawnSync(bin, args, { stdio: 'pipe', encoding: 'utf-8' });
  if (res.status !== 0) {
    throw new Error(`Compile failed for ${carFile}:\n${res.stdout}\n${res.stderr}`);
  }
  const abiPath = outCarc.replace(/\.carc$/, '.abi.json');
  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI not found for ${carFile}: expected ${abiPath}`);
  }
  return { outCarc, abiPath, log: res.stdout };
}

function b64(filePath) {
  const buf = fs.readFileSync(filePath);
  return buf.toString('base64');
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function main() {
  const [,, targetDirArg, outFileArg, ...rest] = process.argv;
  if (!targetDirArg) {
    console.error('Usage: cardity_package <package_dir> [out.json] [--no-abi]');
    process.exit(1);
  }
  const repoRoot = path.resolve(__dirname, '..');
  const pkgDir = path.resolve(targetDirArg);
  const outFile = outFileArg ? path.resolve(outFileArg) : path.join(pkgDir, 'package.inscription.json');

  // Pre-check: run compiler built-in package check to enforce import/using semantics
  try {
    const cc = path.join(repoRoot, 'build', 'cardityc');
    const pre = spawnSync(cc, ['dummy.car', '--package-check', pkgDir], { encoding: 'utf-8' });
    if (pre.status !== 0) {
      console.error(pre.stdout || '');
      console.error(pre.stderr || '');
      throw new Error('Package import/using semantic check failed. Fix issues before packaging.');
    }
  } catch (e) {
    throw e;
  }

  // manifest optional
  let manifest = {};
  const manifestPath = path.join(pkgDir, 'cardity.json');
  if (fs.existsSync(manifestPath)) {
    try { manifest = readJson(manifestPath); } catch { manifest = {}; }
  }

  const name = manifest.name || path.basename(pkgDir);
  const version = manifest.version || '1.0.0';
  const moduleEntries = listCarFiles(pkgDir, manifest.modules);
  if (moduleEntries.length === 0) {
    console.error('No .car files found to package.');
    process.exit(2);
  }

  const tmpOut = path.join(pkgDir, '.cardity_pkg_build');
  fse.emptyDirSync(tmpOut);

  const modules = [];
  const packageAbi = {};
  const includeAbi = !rest.includes('--no-abi');
  for (const carFile of moduleEntries) {
    const { outCarc, abiPath } = compileCar(repoRoot, carFile, tmpOut);
    const abi = includeAbi ? readJson(abiPath) : undefined;
    const moduleName = (abi && abi.protocol) ? abi.protocol : path.basename(carFile, '.car');
    const mod = { name: moduleName, carc_b64: b64(outCarc) };
    if (includeAbi && abi) mod.abi = abi;
    modules.push(mod);
    if (includeAbi && abi) packageAbi[moduleName] = abi;
  }

  const inscription = {
    p: 'cardity',
    op: 'deploy_package',
    // indexer expects package_id; keep legacy 'package' for compatibility
    package_id: name,
    package: name,
    version,
    // provide package-level ABI as object (optional)
    ...(includeAbi ? { abi: packageAbi } : {}),
    modules,
    // keep legacy 'package_abi' for compatibility
    ...(includeAbi ? { package_abi: packageAbi } : {}),
  };

  fs.writeFileSync(outFile, JSON.stringify(inscription, null, 2));
  console.log(`✅ Package inscription generated: ${outFile}`);
}

if (require.main === module) main();


