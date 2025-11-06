#!/usr/bin/env node

const { ApiPromise, WsProvider } = require('@polkadot/api');

(async () => {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });

  // Check if new extrinsic exists
  const hasExtrinsic = api.tx.adminUtils.sudoSetFirstEmissionBlockForSubnet ? true : false;
  console.log('New extrinsic available:', hasExtrinsic);

  // Check total networks
  const total = await api.query.subtensorModule.totalNetworks();
  console.log('Total networks:', total.toNumber());

  await api.disconnect();
})().catch(console.error);
