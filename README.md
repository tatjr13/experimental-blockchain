# Bittensor Flow-Based Emissions Testing Environment

**Purpose**: Complete setup for testing Bittensor's flow-based emissions feature on a local blockchain.

**Status**: ✅ Fully functional and tested (November 6, 2025)

---

## 📋 For Future Claude Code Instances

If you're Claude Code and need to set this up:

1. **Read this entire README first** - it contains all context
2. **Follow the Quick Start** below - takes ~30 minutes
3. **Reference `/docs/SETUP_GUIDE.md`** for detailed steps
4. **Use scripts in `/scripts/`** for automation
5. **Check `/docs/TROUBLESHOOTING.md`** if issues arise

**Key Context**: This repo enables testing of flow-based emissions vs price-based emissions on a local Bittensor testnet with 20 subnets.

---

## 🎯 What This Repo Contains

### Core Components
- **Runtime Modifications**: New sudo extrinsic for enabling emissions
- **Setup Scripts**: Automated subnet registration and configuration
- **Testing Scripts**: Swap/trade simulation and emission monitoring
- **Documentation**: Complete guides for setup and testing
- **Configuration**: Ready-to-use node configurations

### File Structure
```
experimental-blockchain/
├── README.md                    # This file
├── docs/
│   ├── SETUP_GUIDE.md          # Detailed setup instructions
│   ├── SYSTEM_READY.md         # Post-setup verification & usage
│   ├── TROUBLESHOOTING.md      # Common issues & solutions
│   └── TECHNICAL_DETAILS.md    # Deep dive into changes
├── patches/
│   └── admin-utils-emission-extrinsic.patch  # Runtime modification
├── scripts/
│   ├── setup/
│   │   ├── 01_clone_subtensor.sh
│   │   ├── 02_apply_patches.sh
│   │   ├── 03_build_runtime.sh
│   │   └── 04_start_node.sh
│   ├── initialize/
│   │   ├── register_20_subnets.js
│   │   ├── enable_emissions.js
│   │   └── enable_subtokens.js
│   ├── testing/
│   │   ├── swap_demo.js
│   │   ├── verify_emissions.js
│   │   └── compare_flow_vs_price.js
│   └── utils/
│       ├── check_status.js
│       └── reset_testnet.sh
└── config/
    ├── node_config.toml
    └── runtime_constants.md
```

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y build-essential git curl clang cmake pkg-config \
    libssl-dev protobuf-compiler tmux nodejs npm

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js packages
npm install -g @polkadot/api @polkadot/keyring
```

### Setup (30 minutes)
```bash
# 1. Clone this repo (already done if you're reading this)
git clone git@github.com:tatjr13/experimental-blockchain.git
cd experimental-blockchain

# 2. Run setup scripts in order
./scripts/setup/01_clone_subtensor.sh
./scripts/setup/02_apply_patches.sh
./scripts/setup/03_build_runtime.sh      # Takes ~20 minutes
./scripts/setup/04_start_node.sh

# 3. Initialize the testnet (wait for node to start)
sleep 10
./scripts/initialize/register_20_subnets.js
./scripts/initialize/enable_emissions.js
./scripts/initialize/enable_subtokens.js

# 4. Verify everything works
node scripts/utils/check_status.js
```

### Verification
If setup succeeded, you should see:
```
✅ Node running in tmux
✅ 20 networks registered
✅ Emissions active (total_weights > 0)
✅ Subtokens enabled
✅ Swaps functional
```

---

## 📊 What You Can Do Now

### Perform Swaps (TAO ↔ Alpha)
```bash
node scripts/testing/swap_demo.js
```

### Monitor Emissions
```bash
node scripts/testing/verify_emissions.js
```

### Compare Flow vs Price Emissions
```bash
# Enable flow-based for subnet 5
node scripts/testing/enable_flow_based.js --netuid 5

# Generate trading activity
node scripts/testing/swap_demo.js --netuid 5 --amount 100

# Compare emission weights
node scripts/testing/compare_flow_vs_price.js
```

### Access Node
```bash
# Attach to tmux session
tmux attach -t subtensor

# Detach: Ctrl+b then d

# View logs
tail -f /tmp/subtensor-logs/dev.log
```

---

## 🔑 Key Changes Made

### 1. New Sudo Extrinsic
**File**: `pallets/admin-utils/src/lib.rs`

Added `sudo_set_first_emission_block_for_subnet()` at call index 81.

**Why**: `register_network` doesn't automatically enable emissions. This extrinsic allows setting `FirstEmissionBlockNumber` which is mandatory for emissions to run.

**Patch**: See `patches/admin-utils-emission-extrinsic.patch`

### 2. Runtime Constants Modified
**File**: `runtime/src/lib.rs`

- Line 1195: `SubtensorInitialNetworkRateLimit: u64 = 0` (was 7200)
- Line 1191: `SubtensorInitialMinLockCost: u64 = 1_000_000_000` (was 1_000_000_000_000)

**Why**: Enable rapid subnet registration for testing (remove 12-hour rate limit, reduce lock cost from 1000 to 1 TAO)

### 3. Build Feature
Built with `--features pow-faucet` to disable rate limits completely.

---

## 🧪 Testing Flow-Based Emissions

### Concept
**Price-Based** (default):
- Weight = subnet_price / sum(all_prices)
- Price changes via supply/demand
- All subnets currently have equal prices → equal emissions

**Flow-Based** (what we're testing):
- Weight = max(net_tao_flow * 0.9 + 0.1, 0.1)
- Net flow = TAO_in_from_buys - TAO_out_from_sells
- Rewards positive TAO inflow
- 10% minimum ensures all subnets get some emissions

### Test Scenario
```bash
# 1. Enable flow-based for subnet 5
node -e "
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  await api.tx.sudo.sudo(
    api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled(5, true)
  ).signAndSend(alice, ({ status }) => {
    if (status.isInBlock) {
      console.log('Flow-based enabled for subnet 5');
      process.exit(0);
    }
  });
})();
"

# 2. Generate heavy buying on subnet 5
for i in {1..10}; do
  node -e "
  const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
  (async () => {
    const api = await ApiPromise.create({
      provider: new WsProvider('ws://127.0.0.1:9944')
    });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    await api.tx.subtensorModule.addStake(
      alice.address,
      5,
      50_000_000_000  // 50 TAO
    ).signAndSend(alice, ({ status }) => {
      if (status.isInBlock) {
        console.log('Buy completed');
        process.exit(0);
      }
    });
  })();
  "
  sleep 15
done

# 3. Compare emissions
node scripts/testing/compare_flow_vs_price.js
# Subnet 5 should have higher emission weight due to positive flow
```

---

## 📝 Important Notes for Claude Code

### If You Need to Rebuild
```bash
cd /root/code/subtensor
cargo clean
cargo build --release --features pow-faucet -p node-subtensor
# Takes ~20 minutes

# Restart with clean state
pkill -9 node-subtensor
rm -rf /tmp/dev
./scripts/setup/04_start_node.sh

# Re-initialize
./scripts/initialize/register_20_subnets.js
./scripts/initialize/enable_emissions.js
./scripts/initialize/enable_subtokens.js
```

### Common Issues

**"Cannot find module '@polkadot/api'"**
```bash
cd /root/code/subtensor
npm install @polkadot/api @polkadot/keyring
```

**"Transaction timeout"**
- Scripts are designed for slow queries
- Node might be syncing blocks
- Wait 30 seconds and retry

**"Rate limit exceeded"**
- Verify `pow-faucet` feature was used in build
- Check `NetworkRateLimit` storage: should be 0
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });
  const rate = await api.query.subtensorModule.networkRateLimit();
  console.log('Rate limit:', rate.toNumber());
  await api.disconnect();
})();
"
```

**"Emissions not running"**
```bash
# Check logs
tail -100 /tmp/subtensor-logs/dev.log | grep total_weights

# Should see: run_coinbase: total_weights=<non-zero>
# If all zeros, FirstEmissionBlockNumber not set correctly
```

### Architecture Notes

**Emission Pipeline**:
1. Coinbase runs every block: `run_coinbase()`
2. Calculates weights from prices or flows
3. Distributes to `PendingEmission` storage
4. Epoch (tempo-based) distributes to neurons

**Swap Mechanics**:
- `addStake()` → TAO to Alpha (buy)
- `removeStake()` → Alpha to TAO (sell)
- Both update pool reserves
- Price adjusts automatically
- Flow tracking happens in `swap_tao_for_alpha()` / `swap_alpha_for_tao()`

**Storage Items**:
- `SubnetTAO`: TAO in pool
- `SubnetAlphaIn/Out`: Alpha amounts
- `FirstEmissionBlockNumber`: When emissions start
- `SubtokenEnabled`: Must be true for swaps
- `FlowBasedEmissionsEnabled`: Per-subnet flag
- `SubnetFlowEMA`: Tracked net TAO flow

---

## 🎓 Learning Resources

- **Subtensor Repo**: https://github.com/opentensor/subtensor
- **Bittensor Docs**: https://docs.bittensor.com
- **Flow-Based Emissions Design**: Check subtensor codebase at `pallets/subtensor/src/coinbase/run_coinbase.rs`

---

## 🤝 Contributing

If you improve this setup:
1. Test thoroughly on fresh environment
2. Update documentation
3. Add notes for future Claude instances
4. Commit with clear messages

---

## ⚠️ Disclaimer

This is a **local testnet for development/testing only**.

- Not connected to mainnet
- Uses dev accounts (//Alice)
- Chain state is temporary
- Do not use for production

---

**Last Updated**: November 6, 2025
**Tested By**: Claude Code
**Status**: ✅ Fully Operational
