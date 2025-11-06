#!/usr/bin/env node

const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main() {
  console.log('Connecting...\n');
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });

  const totalNets = await api.query.subtensorModule.totalNetworks();
  console.log(`Total networks: ${totalNets.toNumber()}\n`);

  const emissions = [];
  for (let netuid = 0; netuid < totalNets.toNumber(); netuid++) {
    const exists = await api.query.subtensorModule.networksAdded(netuid);
    if (!exists.toHuman()) continue;

    const emissionValues = await api.query.subtensorModule.emissionValues(netuid);
    const pending = await api.query.subtensorModule.pendingEmission(netuid);
    const taoIn = await api.query.subtensorModule.subnetTaoIn(netuid);
    const alphaOut = await api.query.subtensorModule.subnetAlphaOut(netuid);
    const alphaPrices = await api.query.subtensorModule.alphaPrices(netuid);
    const movingPrice = await api.query.subtensorModule.subnetMovingPrice(netuid);

    emissions.push({
      netuid,
      emissionValues: emissionValues.toNumber(),
      pending: pending.toNumber(),
      taoIn: taoIn.toNumber() / 1e9,
      alphaOut: alphaOut.toNumber() / 1e9,
      price: alphaPrices.toNumber() / 1e18,
      movingPrice: movingPrice.toString()
    });
  }

  console.log('═'.repeat(80));
  console.log('SUBNET EMISSION STATUS');
  console.log('═'.repeat(80));

  emissions.forEach(e => {
    console.log(`\nNetuid ${e.netuid}:`);
    console.log(`  Emission values: ${e.emissionValues.toLocaleString()}`);
    console.log(`  Pending: ${e.pending.toLocaleString()}`);
    console.log(`  TAO in pool: ${e.taoIn.toFixed(4)} TAO`);
    console.log(`  Alpha out: ${e.alphaOut.toFixed(4)} Alpha`);
    console.log(`  Price: ${e.price.toFixed(6)}`);
    console.log(`  Moving price: ${e.movingPrice}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('EMISSION DISTRIBUTION ANALYSIS');
  console.log('═'.repeat(80));

  // Check if all non-root subnets have equal emissions
  const nonRootEmissions = emissions.filter(e => e.netuid !== 0).map(e => e.emissionValues);
  const allEqual = nonRootEmissions.every((v, i, arr) => v === arr[0]);
  const allZero = nonRootEmissions.every(v => v === 0);

  if (allZero) {
    console.log('⚠️  All subnets have 0 emission values');
    console.log('   This might be normal if emissions just started.');
    console.log('   Wait a few more blocks for emissions to distribute.');
  } else if (allEqual) {
    const share = (1 / nonRootEmissions.length * 100).toFixed(2);
    console.log(`✓ All ${nonRootEmissions.length} non-root subnets have EQUAL emission values`);
    console.log(`✓ Each subnet gets ~${share}% of emissions`);
    console.log(`✓ Emission value per subnet: ${nonRootEmissions[0].toLocaleString()}`);
  } else {
    console.log('✗ Emissions are NOT equal:');
    const uniqueValues = [...new Set(nonRootEmissions)];
    uniqueValues.forEach(val => {
      const count = nonRootEmissions.filter(v => v === val).length;
      console.log(`   ${count} subnets with value ${val.toLocaleString()}`);
    });
  }

  // Check moving prices
  console.log('\n' + '─'.repeat(80));
  console.log('MOVING PRICE ANALYSIS');
  console.log('─'.repeat(80));

  const nonRootPrices = emissions.filter(e => e.netuid !== 0).map(e => e.movingPrice);
  const priceSet = new Set(nonRootPrices);

  if (priceSet.size === 1) {
    console.log(`✓ All ${nonRootPrices.length} non-root subnets have EQUAL moving prices`);
    console.log(`✓ Moving price: ${nonRootPrices[0]}`);
  } else {
    console.log(`⚠️  Moving prices vary (${priceSet.size} unique values)`);
  }

  await api.disconnect();
}

main().catch(console.error);
