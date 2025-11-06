#!/usr/bin/env node

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

async function main() {
  console.log('Connecting to localnet...');
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });

  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  console.log(`Using Alice: ${alice.address}`);
  console.log('Target: Register 20 subnets (netuids 2-21, root=0 exists by default)\n');

  // Verify rate limit is 0
  const rateLimit = await api.query.subtensorModule.networkRateLimit();
  console.log(`Network rate limit: ${rateLimit.toNumber()} blocks\n`);

  const results = [];
  const TARGET_COUNT = 20;

  for (let i = 1; i <= TARGET_COUNT; i++) {
    try {
      console.log(`[${i}/${TARGET_COUNT}] Registering subnet ${i}...`);

      const tx = api.tx.subtensorModule.registerNetwork(alice.address);

      // Submit without waiting for finalization - much faster!
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

        tx.signAndSend(alice, ({ status, dispatchError, events }) => {
          if (status.isInBlock) {
            clearTimeout(timeout);
            if (dispatchError) {
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                const errorMsg = `${decoded.section}.${decoded.name}`;
                console.log(`   ✗ Failed: ${errorMsg}`);
                results.push({ subnet: i, success: false, error: errorMsg });
              } else {
                console.log(`   ✗ Failed: ${dispatchError.toString()}`);
                results.push({ subnet: i, success: false, error: dispatchError.toString() });
              }
            } else {
              const networkAddedEvent = events.find(
                ({ event }) => api.events.subtensorModule.NetworkAdded.is(event)
              );

              if (networkAddedEvent) {
                const [assignedNetuid] = networkAddedEvent.event.data;
                console.log(`   ✓ Registered netuid ${assignedNetuid.toNumber()}`);
                results.push({ subnet: i, netuid: assignedNetuid.toNumber(), success: true });
              } else {
                console.log(`   ✓ Success`);
                results.push({ subnet: i, success: true });
              }
            }
            resolve();
          }
        }).catch(reject);
      }).catch(e => {
        console.log(`   ✗ Error: ${e.message}`);
        results.push({ subnet: i, success: false, error: e.message });
      });

      // Small delay to avoid overwhelming the node
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
      results.push({ subnet: i, success: false, error: error.message });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log('REGISTRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total attempted: ${TARGET_COUNT}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed registrations:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  Subnet ${r.subnet}: ${r.error}`);
    });
  }

  // Verify final count
  const totalNets = await api.query.subtensorModule.totalNetworks();
  console.log(`\nTotal networks on chain: ${totalNets.toNumber()}`);

  await api.disconnect();
}

main().catch(console.error);
