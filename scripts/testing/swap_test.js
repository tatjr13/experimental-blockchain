#!/usr/bin/env node

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

async function getPoolState(api, netuid) {
  const taoIn = await api.query.subtensorModule.subnetTaoIn(netuid);
  const alphaIn = await api.query.subtensorModule.subnetAlphaIn(netuid);
  const alphaOut = await api.query.subtensorModule.subnetAlphaOut(netuid);
  const price = await api.query.subtensorModule.alphaPrices(netuid);

  return {
    taoIn: taoIn.toNumber() / 1e9,
    alphaIn: alphaIn.toNumber() / 1e9,
    alphaOut: alphaOut.toNumber() / 1e9,
    price: price.toNumber() / 1e18
  };
}

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const netuid = 5;
  const amountTAO = 50; // 50 TAO

  console.log('═'.repeat(70));
  console.log(`SWAP TEST: Buy Alpha on Subnet ${netuid}`);
  console.log('═'.repeat(70));

  // Get BEFORE state
  console.log('\nPool State BEFORE:');
  const before = await getPoolState(api, netuid);
  console.log(`  TAO in pool: ${before.taoIn.toFixed(4)} TAO`);
  console.log(`  Alpha out: ${before.alphaOut.toFixed(4)} Alpha`);
  console.log(`  Price: ${before.price.toFixed(6)} TAO/Alpha`);

  // Perform swap
  console.log(`\nSwapping ${amountTAO} TAO for Alpha...`);
  const tx = api.tx.subtensorModule.addStake(alice.address, netuid, amountTAO * 1e9);

  await new Promise((resolve, reject) => {
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isInBlock) {
        if (dispatchError) {
          reject(new Error('Swap failed'));
        } else {
          console.log('✓ Swap completed!');
          resolve();
        }
      }
    }).catch(reject);
  });

  // Get AFTER state
  console.log('\nPool State AFTER:');
  const after = await getPoolState(api, netuid);
  console.log(`  TAO in pool: ${after.taoIn.toFixed(4)} TAO`);
  console.log(`  Alpha out: ${after.alphaOut.toFixed(4)} Alpha`);
  console.log(`  Price: ${after.price.toFixed(6)} TAO/Alpha`);

  // Show changes
  console.log('\nChanges:');
  console.log(`  TAO added: +${(after.taoIn - before.taoIn).toFixed(4)} TAO`);
  console.log(`  Alpha bought: +${(after.alphaOut - before.alphaOut).toFixed(4)} Alpha`);
  console.log(`  Price change: ${((after.price - before.price) / before.price * 100).toFixed(2)}%`);

  console.log('\n' + '═'.repeat(70));
  console.log('✓ TAO flow increased! This affects flow-based emissions.');
  console.log('═'.repeat(70));

  await api.disconnect();
}

main().catch(console.error);
