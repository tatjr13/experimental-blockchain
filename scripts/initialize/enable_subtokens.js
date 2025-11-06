#!/usr/bin/env node

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const totalNets = await api.query.subtensorModule.totalNetworks();
  console.log(`Enabling subtokens for ${totalNets.toNumber()} networks...\n`);

  // Build batch call
  const calls = [];
  for (let netuid = 0; netuid < totalNets.toNumber(); netuid++) {
    calls.push(api.tx.adminUtils.sudoSetSubtokenEnabled(netuid, true));
  }

  console.log(`Submitting batch of ${calls.length} transactions...`);

  const batchCall = api.tx.utility.batchAll(calls);
  const sudoBatch = api.tx.sudo.sudo(batchCall);

  await new Promise((resolve, reject) => {
    sudoBatch.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isInBlock) {
        console.log(`Included in block`);
      }
      if (status.isFinalized) {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            console.log(`✗ Failed: ${decoded.section}.${decoded.name}`);
          } else {
            console.log(`✗ Failed: ${dispatchError.toString()}`);
          }
          reject(dispatchError);
        } else {
          console.log(`✓ Batch executed successfully!`);
          resolve();
        }
      }
    }).catch(reject);
  });

  console.log(`\n✓ Subtokens enabled for all ${calls.length} networks!`);
  console.log('✓ Swaps are now possible!');

  await api.disconnect();
}

main().catch(console.error);
