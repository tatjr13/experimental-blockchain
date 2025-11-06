# Bittensor Local Testnet - READY FOR TESTING

**Date**: November 6, 2025
**Status**: ✅ **FULLY OPERATIONAL**

---

## 🎯 System Status

### ✅ Core Infrastructure
- **Dev Node**: Running in tmux session `subtensor`
- **Networks**: 20 subnets registered (netuid 0-19)
- **Runtime Features**: pow-faucet enabled, rate limit = 0
- **RPC Endpoint**: ws://127.0.0.1:9944

### ✅ Emissions System
- **Status**: RUNNING ✓
- **FirstEmissionBlockNumber**: Set for all 20 subnets
- **Distribution**: EQUAL across all non-root subnets (~5.26% each)
- **Moving Prices**: All equal (price-based emissions working)
- **Pending Emissions**: Accumulating correctly

### ✅ Swap/Trading System
- **SubtokenEnabled**: TRUE for all subnets
- **Swaps**: OPERATIONAL ✓
- **Available Operations**:
  - Buy Alpha: `addStake(hotkey, netuid, tao_amount)`
  - Sell Alpha: `removeStake(hotkey, netuid, alpha_amount)`

---

## 🚀 How to Access

### Connect to Node
```bash
# Attach to tmux session
tmux attach -t subtensor

# Detach (keep running)
# Press: Ctrl+b then d
```

### Check Logs
```bash
tail -f /tmp/subtensor-logs/dev.log
```

---

## 💱 How to Perform Swaps

### Buy Alpha (TAO → Alpha)
```javascript
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const api = await ApiPromise.create({
  provider: new WsProvider('ws://127.0.0.1:9944')
});
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

// Buy 100 TAO worth of Alpha on subnet 5
const netuid = 5;
const amount = 100_000_000_000; // 100 TAO (in Rao)

const tx = api.tx.subtensorModule.addStake(
  alice.address,  // hotkey
  netuid,         // subnet
  amount          // TAO amount
);

await tx.signAndSend(alice, ({ status }) => {
  if (status.isInBlock) {
    console.log('Swap completed!');
  }
});
```

### Sell Alpha (Alpha → TAO)
```javascript
// Sell 50 Alpha for TAO on subnet 5
const alphaAmount = 50_000_000_000; // 50 Alpha

const tx = api.tx.subtensorModule.removeStake(
  alice.address,   // hotkey
  netuid,          // subnet
  alphaAmount      // Alpha amount
);

await tx.signAndSend(alice, ({ status }) => {
  if (status.isInBlock) {
    console.log('Swap completed!');
  }
});
```

---

## 📊 How to Monitor State

### Check Pool Reserves
```javascript
const netuid = 5;

// TAO in pool
const taoIn = await api.query.subtensorModule.subnetTaoIn(netuid);
console.log('TAO:', taoIn.toNumber() / 1e9);

// Alpha out (sold/bought)
const alphaOut = await api.query.subtensorModule.subnetAlphaOut(netuid);
console.log('Alpha Out:', alphaOut.toNumber() / 1e9);

// Current price
const price = await api.query.subtensorModule.alphaPrices(netuid);
console.log('Price:', price.toNumber() / 1e18, 'TAO/Alpha');
```

### Check Emissions
```javascript
// Pending emissions
const pending = await api.query.subtensorModule.pendingEmission(netuid);
console.log('Pending:', pending.toNumber() / 1e9, 'Rao');

// Moving price (used for weight calculation)
const movingPrice = await api.query.subtensorModule.subnetMovingPrice(netuid);
console.log('Moving Price:', movingPrice.toString());

// Check if flow-based emissions enabled
const flowBased = await api.query.subtensorModule.flowBasedEmissionsEnabled(netuid);
console.log('Flow-based:', flowBased.toHuman());
```

---

## 🔬 Testing Flow-Based Emissions

### 1. Enable Flow-Based Emissions for a Subnet
```javascript
const netuid = 5;

// Use sudo to enable flow-based emissions
const tx = api.tx.sudo.sudo(
  api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled(netuid, true)
);

await tx.signAndSend(alice);
```

### 2. Generate TAO Flow
```javascript
// Buy Alpha (TAO flows IN)
await api.tx.subtensorModule.addStake(alice.address, netuid, 100e9).signAndSend(alice);

// Sell Alpha (TAO flows OUT)
await api.tx.subtensorModule.removeStake(alice.address, netuid, 50e9).signAndSend(alice);

// Net flow = buys - sells
```

### 3. Compare Emissions
```javascript
// Flow-based subnets will have different emission weights
// based on net TAO flow, not just price

const subnet5Flow = await api.query.subtensorModule.subnetFlowEMA(5);
const subnet6Flow = await api.query.subtensorModule.subnetFlowEMA(6);

console.log('Subnet 5 flow:', subnet5Flow.toString());
console.log('Subnet 6 flow:', subnet6Flow.toString());

// Higher flow = higher emission weight (with 10% floor)
```

---

## 📁 Useful Scripts

All scripts are in `/root/code/subtensor/`:

- **`check_extrinsic.js`** - Verify node is running and check network count
- **`enable_emissions_batch.js`** - Enable emissions for all subnets
- **`enable_subtokens.js`** - Enable subtokens/swaps for all subnets
- **`verify_equal_emissions.js`** - Verify equal emission distribution
- **`register_20_subnets_fast.js`** - Register subnets quickly

### Run a Script
```bash
cd /root/code/subtensor
node script_name.js
```

---

## 🎓 Key Concepts

### Price-Based Emissions (Currently Active)
- Emission weight = subnet_price / sum_of_all_prices
- All subnets have equal prices → equal emissions (~5.26% each)
- Price changes when swaps occur (supply/demand)

### Flow-Based Emissions (Available for Testing)
- Emission weight = max(net_TAO_flow * 0.9 + 0.1, 0.1)
- Net flow = TAO_in_from_buys - TAO_out_from_sells
- 10% minimum weight ensures all subnets get some emissions
- Rewards subnets with positive TAO inflow (buying pressure)

### How Swaps Affect Emissions

**Price-Based**:
- Buying Alpha → Price increases → Higher emission weight
- Selling Alpha → Price decreases → Lower emission weight

**Flow-Based**:
- Buying Alpha → TAO flows in → Positive net flow → Higher weight
- Selling Alpha → TAO flows out → Negative net flow → Lower weight (min 10%)

---

## 🔧 Admin Operations

### Enable Flow-Based for a Subnet
```bash
node -e "
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const netuid = 5;
  const tx = api.tx.sudo.sudo(
    api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled(netuid, true)
  );

  await tx.signAndSend(alice, ({ status }) => {
    if (status.isInBlock) {
      console.log('Flow-based emissions enabled for subnet', netuid);
      process.exit(0);
    }
  });
})();
"
```

### Reset Testnet (Start Fresh)
```bash
# Stop node
pkill -9 node-subtensor

# Clear state
rm -rf /tmp/dev

# Restart in tmux
cd /root/code/subtensor
tmux new-session -d -s subtensor "./target/release/node-subtensor --dev --base-path /tmp/dev --rpc-port 9944 --rpc-cors all --rpc-methods unsafe --rpc-external --allow-private-ipv4 2>&1 | tee /tmp/subtensor-logs/dev.log"

# Re-register subnets and enable features
node register_20_subnets_fast.js
node enable_emissions_batch.js
node enable_subtokens.js
```

---

## ✅ Verification Checklist

Use this to verify the system is working:

```bash
# 1. Node is running
tmux list-sessions | grep subtensor

# 2. 20 networks registered
node -e "const { ApiPromise, WsProvider } = require('@polkadot/api'); (async () => { const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') }); const t = await api.query.subtensorModule.totalNetworks(); console.log('Networks:', t.toNumber()); await api.disconnect(); })();" 2>&1 | grep Networks

# 3. Emissions running
tail -50 /tmp/subtensor-logs/dev.log | grep "total_weights" | tail -1

# 4. Subtokens enabled
node -e "const { ApiPromise, WsProvider } = require('@polkadot/api'); (async () => { const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') }); const e = await api.query.subtensorModule.subtokenEnabled(5); console.log('Subnet 5 subtokens:', e.toHuman()); await api.disconnect(); })();" 2>&1 | grep subtokens

# 5. Test a swap
node -e "const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api'); (async () => { const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') }); const keyring = new Keyring({ type: 'sr25519' }); const alice = keyring.addFromUri('//Alice'); await api.tx.subtensorModule.addStake(alice.address, 5, 1e9).signAndSend(alice, ({ status }) => { if (status.isInBlock) { console.log('Swap works!'); process.exit(0); } }); })();" 2>&1 | grep "Swap works"
```

If all checks pass: **✅ SYSTEM FULLY OPERATIONAL**

---

## 🎯 Next Steps

1. **Test Equal Emissions** ✅ VERIFIED
   - All 19 non-root subnets receiving ~5.26% each

2. **Test Price Changes from Swaps**
   - Perform buys/sells and observe price movements
   - Verify emission weights adjust accordingly

3. **Enable Flow-Based Emissions**
   - Enable for specific subnets
   - Generate net TAO flow through swaps
   - Compare emission weights vs price-based subnets

4. **Simulate Market Conditions**
   - Heavy buying on subnet A
   - Heavy selling on subnet B
   - Observe how emissions redistribute

---

## 📝 Important Notes

- **Alice Account**: Has ~475k TAO for testing
- **Dev Mode**: Chain state is temporary (resets on node restart unless using same base-path)
- **Block Time**: ~12 seconds
- **Tempo**: Emissions distribute at regular intervals (check subnet tempo)
- **Logs**: All output goes to `/tmp/subtensor-logs/dev.log`

---

## 🐛 Troubleshooting

### Node not responding
```bash
# Check if running
ps aux | grep node-subtensor

# Restart
pkill node-subtensor
tmux new-session -d -s subtensor "./target/release/node-subtensor --dev ..."
```

### Swap fails
```bash
# Check SubtokenEnabled
node -e "..." # (see verification checklist)

# Enable if needed
node enable_subtokens.js
```

### Emissions not running
```bash
# Check logs
tail -100 /tmp/subtensor-logs/dev.log | grep coinbase

# Should see: run_coinbase: total_weights=<non-zero>
```

---

**System Ready for Testing! 🚀**
