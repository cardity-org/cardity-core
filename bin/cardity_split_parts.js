#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function toB64(buf) { return Buffer.from(buf).toString('base64'); }

function usage() {
  console.error('Usage: cardity_split_parts <file.carc> <package_id> <module_name> [--version 1.0.0] [--max-bytes 50000] [-o out_dir]');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 3) { usage(); process.exit(1); }
  const carcFile = path.resolve(argv[0]);
  const packageId = argv[1];
  const moduleName = argv[2];
  let version = '1.0.0';
  let maxBytes = 50000; // Dogecoin 50 KB
  let outDir = path.dirname(carcFile);
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--version' && i + 1 < argv.length) { version = argv[++i]; continue; }
    if (a === '--max-bytes' && i + 1 < argv.length) { maxBytes = parseInt(argv[++i], 10); continue; }
    if ((a === '-o' || a === '--out') && i + 1 < argv.length) { outDir = path.resolve(argv[++i]); continue; }
  }

  const buf = fs.readFileSync(carcFile);
  const total = Math.ceil(buf.length / maxBytes);
  const bundleId = `${packageId}-${moduleName}-${version}-${crypto.createHash('sha256').update(buf).digest('hex').slice(0,16)}`;

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let idx = 0; idx < total; idx++) {
    const start = idx * maxBytes;
    const end = Math.min(start + maxBytes, buf.length);
    const part = buf.slice(start, end);
    const envelope = {
      p: 'cardity',
      op: 'deploy_part',
      bundle_id: bundleId,
      idx: idx + 1,
      total,
      package_id: packageId,
      version,
      module: moduleName,
      abi: {}, // optional; recommended to include separately in first part if needed
      carc_b64: toB64(part),
    };
    const outPath = path.join(outDir, `${path.basename(carcFile)}.${idx+1}-of-${total}.part.json`);
    fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2));
    console.log(`✅ Wrote ${outPath} (${part.length} bytes)`);
  }
}

if (require.main === module) main();


