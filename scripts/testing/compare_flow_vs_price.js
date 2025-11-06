#!/usr/bin/env node

const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });

  console.log('═'.repeat(70));
  console.log('FLOW-BASED vs PRICE-BASED EMISSIONS COMPARISON');
  console.log('═'.repeat(70));
  console.log();

  const totalNets = await api.query.subtensorModule.totalNetworks();

  const subnets = [];
  for (let netuid = 1; netuid < totalNets.toNumber(); netuid++) {
    const exists = await api.query.subtensorModule.networksAdded(netuid);
    if (!exists.toHuman()) continue;

    const flowBasedEnabled = await api.query.subtensorModule.flowBasedEmissionsEnabled(netuid);
    const pending = await api.query.subtensorModule.pendingEmission(netuid);
    const movingPrice = await api.query.subtensorModule.subnetMovingPrice(netuid);

    let flow = null;
    try {
      const flowEMA = await api.query.subtensorModule.subnetFlowEMA(netuid);
      flow = flowEMA.toString();
    } catch (e) {
      // Flow tracking may not be available in all versions
    }

    subnets.push({
      netuid,
      flowBased: flowBasedEnabled.toHuman(),
      pending: pending.toNumber() / 1e9,
      movingPrice: movingPrice.toString(),
      flow
    });
  }

  // Group by type
  const flowBasedSubnets = subnets.filter(s => s.flowBased);
  const priceBasedSubnets = subnets.filter(s => !s.flowBased);

  console.log(`Total subnets: ${subnets.length}`);
  console.log(`  Price-based: ${priceBasedSubnets.length}`);
  console.log(`  Flow-based: ${flowBasedSubnets.length}`);
  console.log();

  if (priceBasedSubnets.length > 0) {
    console.log('PRICE-BASED SUBNETS:');
    console.log('─'.repeat(70));
    priceBasedSubnets.forEach(s => {
      console.log(`Netuid ${s.netuid}:`);
      console.log(`  Pending emission: ${s.pending.toFixed(4)} TAO`);
      console.log(`  Moving price: ${s.movingPrice}`);
    });
    console.log();
  }

  if (flowBasedSubnets.length > 0) {
    console.log('FLOW-BASED SUBNETS:');
    console.log('─'.repeat(70));
    flowBasedSubnets.forEach(s => {
      console.log(`Netuid ${s.netuid}:`);
      console.log(`  Pending emission: ${s.pending.toFixed(4)} TAO`);
      console.log(`  Flow EMA: ${s.flow || 'N/A'}`);
      console.log(`  Moving price: ${s.movingPrice} (for reference)`);
    });
    console.log();
  } else {
    console.log('⚠️  No flow-based subnets enabled');
    console.log();
    console.log('To enable flow-based for a subnet:');
    console.log('  node -e "');
    console.log('  const { ApiPromise, WsProvider, Keyring } = require(\'@polkadot/api\');');
    console.log('  (async () => {');
    console.log('    const api = await ApiPromise.create({');
    console.log('      provider: new WsProvider(\'ws://127.0.0.1:9944\')');
    console.log('    });');
    console.log('    const keyring = new Keyring({ type: \'sr25519\' });');
    console.log('    const alice = keyring.addFromUri(\'//Alice\');');
    console.log('    await api.tx.sudo.sudo(');
    console.log('      api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled(5, true)');
    console.log('    ).signAndSend(alice, ({ status }) => {');
    console.log('      if (status.isInBlock) {');
    console.log('        console.log(\'Enabled!\');');
    console.log('        process.exit(0);');
    console.log('      }');
    console.log('    });');
    console.log('  })();');
    console.log('  "');
    console.log();
  }

  // Analysis
  if (flowBasedSubnets.length > 0 && priceBasedSubnets.length > 0) {
    console.log('═'.repeat(70));
    console.log('ANALYSIS');
    console.log('═'.repeat(70));

    const avgFlowPending = flowBasedSubnets.reduce((a, b) => a + b.pending, 0) / flowBasedSubnets.length;
    const avgPricePending = priceBasedSubnets.reduce((a, b) => a + b.pending, 0) / priceBasedSubnets.length;

    console.log(`Average pending (flow-based): ${avgFlowPending.toFixed(4)} TAO`);
    console.log(`Average pending (price-based): ${avgPricePending.toFixed(4)} TAO`);
    console.log();

    const difference = ((avgFlowPending - avgPricePending) / avgPricePending * 100);
    if (Math.abs(difference) > 5) {
      console.log(`Flow-based subnets receiving ${difference > 0 ? 'MORE' : 'LESS'} emissions`);
      console.log(`Difference: ${Math.abs(difference).toFixed(2)}%`);
      console.log();
      console.log('This indicates flow-based weighting is having an effect!');
    } else {
      console.log('Emissions are roughly equal between both types.');
      console.log('Generate more trading activity to see flow-based effects.');
    }
  }

  await api.disconnect();
}

main().catch(console.error);
