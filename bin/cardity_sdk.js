#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(p) {
  const txt = fs.readFileSync(p, 'utf-8');
  return JSON.parse(txt);
}

function toTsType(t) {
  if (!t) return 'string';
  const m = String(t).toLowerCase();
  if (m === 'int' || m === 'number') return 'number';
  if (m === 'bool' || m === 'boolean') return 'boolean';
  return 'string';
}

function sanitizeName(n) {
  return String(n || 'arg').replace(/[^a-zA-Z0-9_]/g, '_');
}

function generateTs(abi) {
  const protocol = abi.protocol || 'CardityProtocol';
  const version = abi.version || '';
  const methods = abi.methods || {};

  let out = '';
  out += `// Auto-generated SDK for ${protocol} ${version}\n`;
  out += `export type InvokePayload = { p: 'cardity'; op: 'invoke'; contract_id?: string; contract_ref?: string; method: string; args: any[] };\n`;
  out += `\nexport class ${sanitizeName(protocol)}Client {\n`;
  out += `  constructor(public contractId?: string) {}\n`;
  out += `  invoke(method: string, args: any[], contractRef?: string): InvokePayload {\n`;
  out += `    const payload: InvokePayload = { p: 'cardity', op: 'invoke', method, args };\n`;
  out += `    if (this.contractId) payload.contract_id = this.contractId;\n`;
  out += `    if (contractRef) payload.contract_ref = contractRef;\n`;
  out += `    return payload;\n`;
  out += `  }\n`;

  for (const [name, def] of Object.entries(methods)) {
    let params = def.params || [];
    // normalize params: array of strings or array of {name,type}
    const norm = params.map((p, idx) => {
      if (typeof p === 'string') return { name: p, type: 'string' };
      return { name: p.name || `arg${idx+1}`, type: p.type || 'string' };
    });
    const tsParamsSig = norm.map(p => `${sanitizeName(p.name)}: ${toTsType(p.type)}`).join(', ');
    const jsArgsArr = `[${norm.map(p => sanitizeName(p.name)).join(', ')}]`;
    out += `\n  ${sanitizeName(name)}(${tsParamsSig}${tsParamsSig ? ', ' : ''}opts?: { contractRef?: string }): InvokePayload {\n`;
    out += `    return this.invoke('${name}', ${jsArgsArr}, opts?.contractRef);\n`;
    out += `  }\n`;
  }

  out += `}\n`;
  return out;
}

function main() {
  const [,, abiPath, outFile] = process.argv;
  if (!abiPath || !outFile) {
    console.error('Usage: cardity_sdk <abi.json> <out.ts>');
    process.exit(1);
  }
  const abi = readJson(abiPath);
  const ts = generateTs(abi);
  fs.writeFileSync(outFile, ts);
  console.log(`✅ SDK generated: ${path.resolve(outFile)}`);
}

if (require.main === module) {
  main();
}


