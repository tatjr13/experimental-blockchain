#!/usr/bin/env node

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const totalNets = await api.query.subtensorModule.totalNetworks();
  const header = await api.rpc.chain.getHeader();
  const currentBlock = header.number.toNumber();
  const firstEmissionBlock = currentBlock + 10; // Start in 10 blocks

  console.log(`Total networks: ${totalNets.toNumber()}`);
  console.log(`Current block: ${currentBlock}`);
  console.log(`First emission block: ${firstEmissionBlock}\n`);

  // Build batch call for all subnets
  const calls = [];
  for (let netuid = 0; netuid < totalNets.toNumber(); netuid++) {
    const exists = await api.query.subtensorModule.networksAdded(netuid);
    if (exists.toHuman()) {
      calls.push(
        api.tx.adminUtils.sudoSetFirstEmissionBlockForSubnet(netuid, firstEmissionBlock)
      );
      console.log(`Added netuid ${netuid} to batch`);
    }
  }

  console.log(`\nSubmitting batch of ${calls.length} transactions...`);

  // Use sudo batch call
  const batchCall = api.tx.utility.batchAll(calls);
  const sudoBatch = api.tx.sudo.sudo(batchCall);

  await new Promise((resolve, reject) => {
    sudoBatch.signAndSend(alice, ({ status, dispatchError }) => {
      console.log(`Status: ${status.type}`);

      if (status.isInBlock) {
        console.log(`Included in block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            console.log(`✗ Failed: ${decoded.section}.${decoded.name}: ${decoded.docs}`);
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

  console.log(`\n✓ All ${calls.length} subnets configured for emissions!`);
  console.log(`Emissions will start at block ${firstEmissionBlock}`);

  await api.disconnect();
}

main().catch(console.error);
