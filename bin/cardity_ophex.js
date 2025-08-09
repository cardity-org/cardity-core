#!/usr/bin/env node

const fs = require('fs');

function toHex(buf) {
  return Buffer.from(buf).toString('hex');
}

function main() {
  const [,, carcFile] = process.argv;
  if (!carcFile) {
    console.error('Usage: cardity_ophex <file.carc>');
    process.exit(1);
  }
  const buf = fs.readFileSync(carcFile);
  const hex = toHex(buf);
  console.log(hex);
}

if (require.main === module) main();


