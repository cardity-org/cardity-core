#!/usr/bin/env node

const fs = require('fs');

function encodeUtf8Hex(s) {
  return Buffer.from(s, 'utf8').toString('hex');
}

function main() {
  const [,, method, argsJson] = process.argv;
  if (!method) {
    console.error('Usage: cardity_encode_invoke <methodOrModule.method> [argsJsonArray]');
    process.exit(1);
  }
  let args;
  try { args = argsJson ? JSON.parse(argsJson) : []; } catch {
    console.error('Invalid args JSON');
    process.exit(1);
  }
  // Minimal encoding: hex( JSON.stringify({method, args}) )
  const payload = JSON.stringify({ method, args });
  const hex = encodeUtf8Hex(payload);
  console.log(hex);
}

if (require.main === module) main();


