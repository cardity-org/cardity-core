#!/usr/bin/env node

// Minimal inscriber: reads a plan JSON (cardity_inscribe_plan) and hits JSON-RPC to fund/sign/broadcast
// This avoids pulling full dogeuni-sdk, while providing an end-to-end flow.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function rpcCall({url, user, pass}, method, params){
  return new Promise((resolve,reject)=>{
    const u = new URL(url);
    const payload = JSON.stringify({ jsonrpc:'1.0', id:'cardity', method, params });
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      auth: `${user}:${pass}`,
      headers: { 'Content-Type':'text/plain', 'Content-Length': Buffer.byteLength(payload) }
    };
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(opts, res=>{
      let data='';
      res.on('data', d=> data += d);
      res.on('end', ()=>{
        try{ const j = JSON.parse(data); if (j.error) reject(new Error(j.error.message||'rpc error')); else resolve(j.result); }
        catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main(){
  const [,, planPath] = process.argv;
  if (!planPath) {
    console.error('Usage: cardity_inscribe <plan.json>');
    process.exit(1);
  }
  const plan = readJson(planPath);
  // env for RPC
  const url = process.env.DOGE_RPC_URL || process.env.DOGECOIN_RPC_HOST || '';
  const user = process.env.DOGE_RPC_USER || process.env.DOGECOIN_RPC_USER || '';
  const pass = process.env.DOGE_RPC_PASS || process.env.DOGECOIN_RPC_PASS || '';
  if (!url || !user || !pass) {
    console.error('Missing DOGE RPC env. Provide DOGE_RPC_URL/USER/PASS or DOGECOIN_RPC_HOST/USER/PASS');
    process.exit(2);
  }

  // Build a minimal OP_RETURN tx using fundrawtransaction (plan carries whole file in base64)
  const b64 = plan.inscriptionDataList?.[0]?.file_b64;
  if (!b64) { console.error('plan.inscriptionDataList[0].file_b64 missing'); process.exit(3); }

  const hex = Buffer.from(b64, 'base64').toString('hex');
  const raw = await rpcCall({url,user,pass}, 'createrawtransaction', [[], [{ data: hex }]]);
  const funded = await rpcCall({url,user,pass}, 'fundrawtransaction', [raw, { changeAddress: plan.changeAddress || undefined }]);
  const signed = await rpcCall({url,user,pass}, 'signrawtransactionwithwallet', [funded.hex]);
  const txid = await rpcCall({url,user,pass}, 'sendrawtransaction', [signed.hex]);
  console.log(JSON.stringify({ txid }, null, 2));
}

if (require.main === module) main().catch(e=>{ console.error(e.message||String(e)); process.exit(1); });


