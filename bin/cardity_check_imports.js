#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function listCarFiles(rootDir) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        if (entry === 'build' || entry === 'dist' || entry === 'node_modules' || entry.startsWith('.')) continue;
        walk(p);
      } else if (st.isFile() && entry.endsWith('.car')) {
        files.push(p);
      }
    }
  }
  walk(rootDir);
  return files;
}

function runCompilerJson(repoRoot, carFile, outDir) {
  const bin = path.join(repoRoot, 'build', 'cardityc');
  const outJson = path.join(outDir, path.basename(carFile, '.car') + '.json');
  const res = spawnSync(bin, [carFile, '--format', 'json', '-o', outJson], { encoding: 'utf-8' });
  if (res.status !== 0) {
    throw new Error(`Compile to JSON failed for ${carFile}:\n${res.stdout}\n${res.stderr}`);
  }
  return outJson;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function parseAliases(sourceText) {
  const lines = sourceText.split(/\r?\n/);
  const aliases = new Map();
  for (const line of lines) {
    // using Module as alias;
    let m = line.match(/^\s*using\s+([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*;\s*$/);
    if (m) { aliases.set(m[2], m[1]); continue; }
    // using Module;
    m = line.match(/^\s*using\s+([A-Za-z_][A-Za-z0-9_]*)\s*;\s*$/);
    if (m) { aliases.set(m[1], m[1]); continue; }
  }
  return aliases;
}

function findExternalCalls(logic) {
  const calls = [];
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m;
  while ((m = re.exec(logic)) !== null) {
    const start = m.index + m[0].length - 1; // at '('
    // parse balanced parentheses with string handling
    let depth = 0; let i = start; let end = -1; let inStr=false; let strCh='';
    while (i < logic.length) {
      const ch = logic[i++];
      if (!inStr && (ch==='"' || ch==="'")) { inStr=true; strCh=ch; continue; }
      if (inStr) { if (ch===strCh) inStr=false; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') { if (depth===1) { end = i; break; } depth--; }
    }
    const argSlice = end > 0 ? logic.slice(start+1, end-1) : '';
    const args = [];
    let cur = ''; let d=0; inStr=false; strCh='';
    for (let j=0;j<argSlice.length;j++){
      const c = argSlice[j];
      if (!inStr && (c==='"' || c==="'")) { inStr=true; strCh=c; cur+=c; continue; }
      if (inStr) { cur+=c; if (c===strCh) inStr=false; continue; }
      if (c==='(') { d++; cur+=c; }
      else if (c===')') { d--; cur+=c; }
      else if (c===',' && d===0) { if (cur.trim()) args.push(cur.trim()); cur=''; }
      else cur+=c;
    }
    if (cur.trim()) args.push(cur.trim());
    calls.push({ alias: m[1], method: m[2], argCount: args.length, args });
  }
  return calls;
}

function normalizeType(t) {
  const s = String(t||'').toLowerCase();
  if (!s) return '';
  if (s === 'number') return 'int';
  if (s === 'integer') return 'int';
  if (s === 'bool') return 'bool';
  if (s === 'boolean') return 'bool';
  if (s === 'address') return 'address';
  if (s === 'string') return 'string';
  if (s === 'map') return 'map';
  return s;
}

function inferArgType(arg, localParamTypes) {
  const a = arg.trim();
  if (/^".*"$/.test(a) || /^'.*'$/.test(a)) return 'string';
  if (/^[0-9]+$/.test(a)) return 'int';
  if (/^(true|false)$/.test(a)) return 'bool';
  if (/^ctx\s*\.\s*sender$/.test(a)) return 'address';
  const m = a.match(/^params\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)$/);
  if (m) {
    const p = m[1];
    const t = localParamTypes.get(p) || '';
    return normalizeType(t);
  }
  // unknown/complex
  return '';
}

function main() {
  const [,, packageDirArg] = process.argv;
  if (!packageDirArg) {
    console.error('Usage: cardity_check_imports <package_dir>');
    process.exit(1);
  }
  const repoRoot = path.resolve(__dirname, '..');
  const pkgDir = path.resolve(packageDirArg);
  const tmpOut = path.join(pkgDir, '.cardity_check_build');
  fs.mkdirSync(tmpOut, { recursive: true });

  const carFiles = listCarFiles(pkgDir);
  if (carFiles.length === 0) {
    console.error('No .car files found');
    process.exit(2);
  }

  // Build module registry: moduleName -> { methods: {name: {paramCount, paramTypes[]}} }
  const moduleRegistry = new Map();
  const fileToModule = new Map();
  const fileToJson = new Map();
  for (const f of carFiles) {
    const jsonPath = runCompilerJson(repoRoot, f, tmpOut);
    fileToJson.set(f, jsonPath);
    const car = readJson(jsonPath);
    const moduleName = car.protocol || path.basename(f, '.car');
    fileToModule.set(f, moduleName);
    const methods = {};
    const m = car.cpl?.methods || {};
    for (const [mn, def] of Object.entries(m)) {
      const params = Array.isArray(def.params) ? def.params : [];
      const types = Array.isArray(def.param_types) ? def.param_types : [];
      methods[mn] = { paramCount: params.length, paramTypes: types };
    }
    moduleRegistry.set(moduleName, { methods });
  }

  const errors = [];
  for (const f of carFiles) {
    const src = fs.readFileSync(f, 'utf-8');
    const aliases = parseAliases(src);
    const car = readJson(fileToJson.get(f));
    const methods = car.cpl?.methods || {};
    for (const [mn, def] of Object.entries(methods)) {
      const logic = typeof def.logic === 'string' ? def.logic : (Array.isArray(def.logic) ? def.logic.join('\n') : '');
      if (!logic) continue;
      const calls = findExternalCalls(logic);
      for (const call of calls) {
        const moduleName = aliases.get(call.alias) || call.alias;
        if (!moduleRegistry.has(moduleName)) {
          errors.push(`${path.basename(f)}:${mn}: Unknown module alias '${call.alias}' → '${moduleName}'`);
          continue;
        }
        const reg = moduleRegistry.get(moduleName);
        if (!reg.methods[call.method]) {
          errors.push(`${path.basename(f)}:${mn}: Unknown method '${moduleName}.${call.method}'`);
          continue;
        }
        const sig = reg.methods[call.method];
        const expected = sig.paramCount;
        if (expected !== call.argCount) {
          errors.push(`${path.basename(f)}:${mn}: Argument count mismatch for '${moduleName}.${call.method}' (expected ${expected}, got ${call.argCount})`);
          continue;
        }
        // Basic type compatibility check when param_types available (skip if empty)
        if (Array.isArray(sig.paramTypes) && sig.paramTypes.length === expected) {
          const localParamTypes = new Map();
          const names = Array.isArray(def.params) ? def.params : [];
          const types = Array.isArray(def.param_types) ? def.param_types : [];
          for (let i=0;i<names.length;i++) localParamTypes.set(names[i], types[i]||'');
          for (let i=0;i<expected;i++) {
            const want = normalizeType(sig.paramTypes[i]||'');
            if (!want) continue;
            const have = normalizeType(inferArgType(call.args[i], localParamTypes));
            if (have && want && have !== want) {
              errors.push(`${path.basename(f)}:${mn}: Type mismatch for '${moduleName}.${call.method}' arg${i+1} (expected ${want}, got ${have})`);
            }
          }
        }
      }
    }
  }

  if (errors.length) {
    console.error('❌ Import/using semantic check failed:');
    for (const e of errors) console.error(' - ' + e);
    process.exit(3);
  }
  console.log('✅ Import/using semantic check passed');
}

if (require.main === module) main();


