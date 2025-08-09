#!/usr/bin/env node

// Generate an inscription plan compatible with dogeuni-sdk FileInscriptionRequest
// Usage: cardity_inscribe_plan <file.carc> <revealAddr> [--content-type application/cardity-carc]
//        [--op deploy|deploy_package|deploy_part] [--protocol <name>] [--package-id <id>] [--module <name>] [--version <v>]

const fs = require('fs');

function main() {
  const [,, carcPath, revealAddr, ...rest] = process.argv;
  if (!carcPath || !revealAddr) {
    console.error('Usage: cardity_inscribe_plan <file.carc> <revealAddr> [--content-type application/cardity-carc]');
    process.exit(1);
  }
  let contentType = 'application/cardity-carc';
  let op = '';
  let protocol = '';
  let packageId = '';
  let moduleName = '';
  let version = '';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--content-type' && i + 1 < rest.length) {
      contentType = rest[i+1]; i++;
    } else if (rest[i] === '--op' && i + 1 < rest.length) {
      op = rest[i+1]; i++;
    } else if (rest[i] === '--protocol' && i + 1 < rest.length) {
      protocol = rest[i+1]; i++;
    } else if (rest[i] === '--package-id' && i + 1 < rest.length) {
      packageId = rest[i+1]; i++;
    } else if (rest[i] === '--module' && i + 1 < rest.length) {
      moduleName = rest[i+1]; i++;
    } else if (rest[i] === '--version' && i + 1 < rest.length) {
      version = rest[i+1]; i++;
    }
  }
  const buf = fs.readFileSync(carcPath);
  // Optional minimal envelope to embed in body for indexer parsing
  let bodyObj = undefined;
  if (op) {
    bodyObj = { p: 'cardity', op };
    if (protocol) bodyObj.protocol = protocol;
    if (packageId) bodyObj.package_id = packageId;
    if (moduleName) bodyObj.module = moduleName;
    if (version) bodyObj.version = version;
  }
  const out = {
    // Fill these in your environment using dogeuni-sdk before broadcasting
    commitTxPrevOutputList: [],
    commitFeeRate: 1,
    revealFeeRate: 1,
    changeAddress: '',
    amountToFeeAddress: 0,
    needServiceFee: false,
    // Core data for inscription
    inscriptionDataList: [
      {
        contentType,
        body: bodyObj ? JSON.stringify(bodyObj) : '',
        file_b64: buf.toString('base64'),
        revealAddr,
        repeat: 1
      }
    ]
  };
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main();


