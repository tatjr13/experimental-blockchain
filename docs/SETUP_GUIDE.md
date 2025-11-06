# Complete Setup Guide - Bittensor Flow-Based Emissions Testnet

**For**: Claude Code and future developers
**Time Required**: ~30 minutes (mostly build time)
**Difficulty**: Intermediate

---

## Prerequisites

### System Requirements
- Ubuntu 20.04+ or similar Linux distribution
- 8GB+ RAM
- 50GB+ free disk space
- Internet connection for package installation

### Required Software
```bash
# Update system
sudo apt-get update

# Install build dependencies
sudo apt-get install -y \
    build-essential \
    git \
    curl \
    clang \
    cmake \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    tmux

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default stable
rustup update

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Node.js packages globally
npm install -g @polkadot/api @polkadot/keyring
```

---

## Step 1: Clone Subtensor Repository

```bash
cd /root/code  # Or your preferred directory
git clone https://github.com/opentensor/subtensor.git
cd subtensor

# Checkout specific version (optional, but recommended for reproducibility)
# git checkout <commit-hash>  # Use the commit that was tested
```

**Expected Result**: Subtensor repository cloned to `/root/code/subtensor`

---

## Step 2: Apply Runtime Modifications

### Apply the Patch
```bash
cd /root/code/subtensor
git apply /root/experimental-blockchain/patches/admin-utils-emission-extrinsic.patch
```

### Verify Patch Applied
```bash
grep -A 20 "sudo_set_first_emission_block_for_subnet" pallets/admin-utils/src/lib.rs
```

You should see the new extrinsic function definition.

### Modify Runtime Constants

Edit `runtime/src/lib.rs`:

```bash
# Line 1195: Change network rate limit to 0
sed -i 's/pub const SubtensorInitialNetworkRateLimit: u64 = 7200;/pub const SubtensorInitialNetworkRateLimit: u64 = 0;/' runtime/src/lib.rs

# Line 1191: Change lock cost from 1000 to 1 TAO
sed -i 's/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000_000;/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000;/' runtime/src/lib.rs
```

**Or manually edit**:
- Line 1195: `SubtensorInitialNetworkRateLimit: u64 = 0`
- Line 1191: `SubtensorInitialMinLockCost: u64 = 1_000_000_000`

### Verify Changes
```bash
grep "SubtensorInitialNetworkRateLimit" runtime/src/lib.rs
grep "SubtensorInitialMinLockCost" runtime/src/lib.rs
```

---

## Step 3: Build Runtime

```bash
cd /root/code/subtensor

# Clean any previous builds
cargo clean

# Build with pow-faucet feature (this takes ~20 minutes)
cargo build --release --features pow-faucet -p node-subtensor
```

**Build Monitoring**:
```bash
# In another terminal, monitor build progress
watch -n 5 'ps aux | grep cargo'
```

**Expected Result**: Binary at `target/release/node-subtensor`

**Verify**:
```bash
ls -lh target/release/node-subtensor
# Should see: -rwxr-xr-x ... node-subtensor
```

---

## Step 4: Install Node.js Dependencies

```bash
cd /root/code/subtensor

# Install @polkadot/api for scripts
npm install @polkadot/api @polkadot/keyring
```

**Verify**:
```bash
node -e "console.log(require('@polkadot/api').ApiPromise)"
# Should output: [Function: ApiPromise]
```

---

## Step 5: Start the Dev Node

### Create Log Directory
```bash
mkdir -p /tmp/subtensor-logs
```

### Start in tmux
```bash
cd /root/code/subtensor

tmux new-session -d -s subtensor \
  "./target/release/node-subtensor \
  --dev \
  --base-path /tmp/dev \
  --rpc-port 9944 \
  --rpc-cors all \
  --rpc-methods unsafe \
  --rpc-external \
  --allow-private-ipv4 \
  2>&1 | tee /tmp/subtensor-logs/dev.log"
```

### Verify Node is Running
```bash
# Check tmux session
tmux list-sessions | grep subtensor

# Check process
ps aux | grep node-subtensor | grep -v grep

# Check logs
tail -20 /tmp/subtensor-logs/dev.log
```

You should see block imports:
```
🏆 Imported #1 (0x...)
🏆 Imported #2 (0x...)
```

### Attach to Node (Optional)
```bash
tmux attach -t subtensor
# Detach: Ctrl+b then d
```

---

## Step 6: Copy Scripts to Subtensor Directory

```bash
cp /root/experimental-blockchain/scripts/initialize/*.js /root/code/subtensor/
cp /root/experimental-blockchain/scripts/testing/*.js /root/code/subtensor/
cp /root/experimental-blockchain/scripts/utils/*.js /root/code/subtensor/
chmod +x /root/code/subtensor/*.js
```

---

## Step 7: Initialize the Testnet

### Wait for Node to Start
```bash
# Wait 10 seconds for node to be ready
sleep 10
```

### Register 20 Subnets
```bash
cd /root/code/subtensor
node register_20_subnets.js
```

**Expected Output**:
```
Total networks: 20
✓ Registration complete
```

**Note**: If timeout occurs, subnets may still be registering. Check:
```bash
node check_status.js
```

### Enable Emissions
```bash
node enable_emissions_batch.js
```

**Expected Output**:
```
✓ All 20 subnets configured for emissions!
Emissions will start at block XXXX
```

### Enable Subtokens (for swaps)
```bash
node enable_subtokens.js
```

**Expected Output**:
```
✓ Subtokens enabled for all 20 networks!
```

---

## Step 8: Verify Setup

### Run Status Check
```bash
node check_status.js
```

**Expected Output**:
```
✅ Node running
✅ 20 networks registered
✅ Emissions active
✅ Subtokens enabled
✅ System ready
```

### Check Emissions in Logs
```bash
tail -100 /tmp/subtensor-logs/dev.log | grep total_weights
```

**Expected**: `total_weights` should be > 0

### Verify Equal Distribution
```bash
node verify_emissions.js
```

**Expected Output**:
```
✓ All 19 non-root subnets have EQUAL emissions
✓ Each subnet gets ~5.26% of total emissions
```

---

## Step 9: Test Swaps

### Perform Test Swap
```bash
node swap_test.js
```

**Expected Output**:
```
✓ Swap completed!
TAO added: +50.0000 TAO
Alpha bought: +XX.XXXX Alpha
Price change: +X.XX%
```

---

## Complete Setup Checklist

- [ ] Prerequisites installed (Rust, Node.js, build tools)
- [ ] Subtensor repository cloned
- [ ] Runtime patch applied successfully
- [ ] Runtime constants modified (rate limit, lock cost)
- [ ] Node binary built with pow-faucet feature
- [ ] Node.js dependencies installed
- [ ] Dev node started in tmux
- [ ] 20 subnets registered
- [ ] Emissions enabled for all subnets
- [ ] Subtokens enabled for all subnets
- [ ] Status check passes all verifications
- [ ] Emissions running (total_weights > 0)
- [ ] Test swap completed successfully

---

## Next Steps

After successful setup:
1. Read `/docs/SYSTEM_READY.md` for usage instructions
2. Try swap demos in `/scripts/testing/`
3. Enable flow-based emissions for testing
4. Compare flow-based vs price-based weights

---

## Troubleshooting

If something fails, see `/docs/TROUBLESHOOTING.md` for solutions.

Common issues:
- Build fails → Check Rust version, dependencies
- Node won't start → Check port 9944 not in use
- Scripts timeout → Node might still be syncing, wait longer
- Emissions not running → Check FirstEmissionBlockNumber is set

---

**Setup Complete! 🎉**

Your local Bittensor testnet is now ready for flow-based emissions testing.
