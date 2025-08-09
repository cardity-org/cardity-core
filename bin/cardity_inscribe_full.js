#!/usr/bin/env node

// Full commit/reveal inscription using dogeuni-sdk (as an internal dependency if present)
// Usage: cardity_inscribe_full <plan.json> [--utxos utxos.json] [--change <addr>] \
//        [--commit-fee <sat/vB>] [--reveal-fee <sat/vB>] [--network mainnet|testnet]

const fs = require('fs');

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function main(){
  const [,, planPath, ...rest] = process.argv;
  if (!planPath) {
    console.error('Usage: cardity_inscribe_full <plan.json> [--utxos utxos.json] [--change <addr>] [--commit-fee N] [--reveal-fee N] [--network mainnet|testnet]');
    process.exit(1);
  }

  let utxosPath = '';
  let changeAddress = '';
  let commitFeeRate = 1;
  let revealFeeRate = 1;
  let networkName = 'mainnet';
  for (let i=0;i<rest.length;i++){
    const a = rest[i];
    if (a === '--utxos' && i+1 < rest.length) { utxosPath = rest[++i]; continue; }
    if (a === '--change' && i+1 < rest.length) { changeAddress = rest[++i]; continue; }
    if (a === '--commit-fee' && i+1 < rest.length) { commitFeeRate = parseFloat(rest[++i]); continue; }
    if (a === '--reveal-fee' && i+1 < rest.length) { revealFeeRate = parseFloat(rest[++i]); continue; }
    if (a === '--network' && i+1 < rest.length) { networkName = rest[++i]; continue; }
  }

  let sdk;
  try {
    sdk = require('@dogeuni-org/coin-dogecoin');
  } catch {
    console.error('Missing dependency @dogeuni-org/coin-dogecoin. Install it: npm i @dogeuni-org/coin-dogecoin');
    process.exit(2);
  }
  const { inscribeFile, networks } = sdk;
  const network = networks?.bitcoin || networks;
  const requestPlan = readJson(planPath);
  const inscription = requestPlan.inscriptionDataList?.[0];
  if (!inscription || !inscription.file_b64 || !inscription.revealAddr) {
    console.error('Invalid plan: expected inscriptionDataList[0].file_b64 and revealAddr');
    process.exit(3);
  }
  const commitTxPrevOutputList = utxosPath ? readJson(utxosPath) : (requestPlan.commitTxPrevOutputList || []);
  if (!Array.isArray(commitTxPrevOutputList) || commitTxPrevOutputList.length === 0) {
    console.error('No UTXOs provided. Pass --utxos utxos.json (array of {txId,vOut,amount,address,privateKey})');
    process.exit(4);
  }

  const req = {
    commitTxPrevOutputList,
    commitFeeRate: requestPlan.commitFeeRate || commitFeeRate,
    revealFeeRate: requestPlan.revealFeeRate || revealFeeRate,
    changeAddress: requestPlan.changeAddress || changeAddress,
    amountToFeeAddress: requestPlan.amountToFeeAddress || 0,
    needServiceFee: !!requestPlan.needServiceFee,
    inscriptionDataList: [
      {
        contentType: inscription.contentType || 'application/cardity-carc',
        body: inscription.body || '',
        file: Buffer.from(inscription.file_b64, 'base64'),
        revealAddr: inscription.revealAddr,
        repeat: inscription.repeat || 1,
      }
    ]
  };

  const result = inscribeFile(network, req);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main();


