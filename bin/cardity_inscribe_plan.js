#!/usr/bin/env node

// Generate an inscription plan compatible with dogeuni-sdk FileInscriptionRequest
// Usage: cardity_inscribe_plan <file.carc> <revealAddr> [--content-type application/cardity-carc]

const fs = require('fs');

function main() {
  const [,, carcPath, revealAddr, ...rest] = process.argv;
  if (!carcPath || !revealAddr) {
    console.error('Usage: cardity_inscribe_plan <file.carc> <revealAddr> [--content-type application/cardity-carc]');
    process.exit(1);
  }
  let contentType = 'application/cardity-carc';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--content-type' && i + 1 < rest.length) {
      contentType = rest[i+1]; i++;
    }
  }
  const buf = fs.readFileSync(carcPath);
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
        body: '',
        file_b64: buf.toString('base64'),
        revealAddr,
        repeat: 1
      }
    ]
  };
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main();


