# Troubleshooting Guide

Common issues and solutions for the Bittensor flow-based emissions testnet.

---

## Build Issues

### Error: "Cannot find module '@polkadot/api'"

**Symptom**:
```
Error: Cannot find module '@polkadot/api'
```

**Solution**:
```bash
cd /root/code/subtensor
npm install @polkadot/api @polkadot/keyring
```

### Error: Rust compiler version too old

**Symptom**:
```
error: package requires rustc 1.XX or newer
```

**Solution**:
```bash
rustup update stable
rustup default stable
```

### Error: Build fails with linker errors

**Symptom**:
```
error: linking with `cc` failed
```

**Solution**:
```bash
sudo apt-get install -y build-essential clang cmake pkg-config libssl-dev
```

---

## Node Issues

### Node won't start - Port already in use

**Symptom**:
```
Error binding to 0.0.0.0:9944
```

**Solution**:
```bash
# Find and kill process using port 9944
sudo lsof -ti:9944 | xargs kill -9

# Or use different port
./target/release/node-subtensor --dev --rpc-port 9945 ...
```

### Node crashes immediately

**Symptom**: Process exits right after starting

**Check logs**:
```bash
tail -50 /tmp/subtensor-logs/dev.log
```

**Common causes**:
1. **Database corruption**: Remove `/tmp/dev` and restart
   ```bash
   rm -rf /tmp/dev
   ./scripts/setup/04_start_node.sh
   ```

2. **Wrong binary**: Ensure built with pow-faucet
   ```bash
   cargo build --release --features pow-faucet -p node-subtensor
   ```

### Cannot connect to RPC

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:9944
```

**Solution**:
```bash
# Check node is running
ps aux | grep node-subtensor

# Check port is listening
netstat -tulpn | grep 9944

# Verify tmux session
tmux list-sessions

# If not running, restart
./scripts/setup/04_start_node.sh
```

---

## Subnet Registration Issues

### Error: "RateLimitExceeded" (Error code 6)

**Symptom**:
```
Custom error: 6
RateLimitExceeded
```

**Root Cause**: Rate limit not set to 0

**Solution**:
```bash
# Verify rate limit
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

# If not 0, rebuild with correct config
cd /root/code/subtensor
# Edit runtime/src/lib.rs - set SubtensorInitialNetworkRateLimit = 0
cargo clean
cargo build --release --features pow-faucet -p node-subtensor

# Restart with clean state
pkill node-subtensor
rm -rf /tmp/dev
./scripts/setup/04_start_node.sh
```

### Error: "CannotAffordLockCost"

**Symptom**:
```
subtensorModule.CannotAffordLockCost
```

**Root Cause**: Lock cost too high or growing exponentially

**Solution**:
```bash
# Check lock cost setting in runtime
grep SubtensorInitialMinLockCost /root/code/subtensor/runtime/src/lib.rs

# Should be: 1_000_000_000 (1 TAO)
# If not, edit and rebuild

# For testing with more subnets, may need to:
# 1. Give Alice more funds via sudo
# 2. Or modify lock cost growth algorithm
```

### Script times out during registration

**Symptom**: Registration script hangs or times out

**Solution**:
```bash
# Check how many subnets actually registered
node check_status.js

# If some registered, continue from where it stopped
# Or use the faster script
node register_remaining.js

# For consistent failures, register manually one by one:
node -e "
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  await api.tx.subtensorModule.registerNetwork(alice.address)
    .signAndSend(alice, ({ status }) => {
      if (status.isInBlock) {
        console.log('Registered!');
        process.exit(0);
      }
    });
})();
"
```

---

## Emission Issues

### Emissions not running (total_weights = 0)

**Symptom**:
```
run_coinbase: total_weights=0
```

**Root Cause**: `FirstEmissionBlockNumber` not set

**Solution**:
```bash
# Re-run emission enable script
node enable_emissions_batch.js

# Verify it worked
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  for (let i = 1; i < 5; i++) {
    const firstBlock = await api.query.subtensorModule.firstEmissionBlockNumber(i);
    console.log(\`Netuid \${i}: FirstEmissionBlock = \${firstBlock.toNumber()}\`);
  }

  await api.disconnect();
})();
"

# Should show block numbers, not 0
```

### Emissions unequal across subnets

**Symptom**: Some subnets get much more/less than ~5.26%

**Root Cause**: Prices have diverged due to swaps

**This is expected behavior!** Price-based emissions adjust based on trading activity.

**To verify**:
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  console.log('Moving prices:');
  for (let i = 1; i < 10; i++) {
    const price = await api.query.subtensorModule.subnetMovingPrice(i);
    console.log(\`Netuid \${i}: \${price.toString()}\`);
  }

  await api.disconnect();
})();
"
```

---

## Swap Issues

### Error: "SubtokenDisabled"

**Symptom**:
```
swap.SubtokenDisabled
```

**Solution**:
```bash
# Enable subtokens
node enable_subtokens.js

# Verify
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  for (let i = 1; i < 5; i++) {
    const enabled = await api.query.subtensorModule.subtokenEnabled(i);
    console.log(\`Netuid \${i}: \${enabled.toHuman()}\`);
  }

  await api.disconnect();
})();
"
```

### Swap times out

**Symptom**: Transaction never completes

**Solution**:
```bash
# Check node is producing blocks
tail -20 /tmp/subtensor-logs/dev.log | grep Imported

# If no new blocks, restart node
pkill node-subtensor
./scripts/setup/04_start_node.sh
```

### Error: "InsufficientBalance"

**Symptom**:
```
Error: InsufficientBalance
```

**Solution**:
```bash
# Check Alice's balance
node -e "
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const balance = await api.query.system.account(alice.address);
  const tao = balance.data.free.toNumber() / 1e9;
  console.log('Alice TAO:', tao);

  await api.disconnect();
})();
"

# Alice should have ~475k TAO in dev mode
# If depleted, restart with clean genesis
pkill node-subtensor
rm -rf /tmp/dev
./scripts/setup/04_start_node.sh
```

---

## Script Issues

### TypeError: api.query.subtensorModule.X is not a function

**Symptom**:
```
TypeError: api.query.subtensorModule.emissionValues is not a function
```

**Root Cause**: Wrong storage item name

**Solution**: Check available storage items:
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  const keys = Object.keys(api.query.subtensorModule);
  const keyword = 'emission'; // Change to search term
  const matches = keys.filter(k => k.toLowerCase().includes(keyword));

  console.log('Matching storage items:');
  matches.forEach(k => console.log(' ', k));

  await api.disconnect();
})();
"
```

Common correct names:
- ~~`emissionValues`~~ → `emission`
- ~~`subnetTaoIn`~~ → `subnetTAO`
- ~~`alphaPrices`~~ → Check with above script

### Connection warnings/errors

**Symptom**:
```
REGISTRY: Unknown signed extensions...
API/INIT: RPC methods not decorated...
```

**This is normal!** These are warnings, not errors. The API still works.

To suppress in scripts, pipe to grep:
```bash
node script.js 2>&1 | grep -v "REGISTRY\|API/INIT\|RPC methods"
```

---

## Performance Issues

### Build is very slow

**Normal**: First build takes 15-25 minutes

**Speed up**:
```bash
# Use more CPU cores
cargo build --release --features pow-faucet -p node-subtensor -j $(nproc)

# Or build only what changed
cargo build --release --features pow-faucet -p node-subtensor --keep-going
```

### Node uses too much CPU/RAM

**Normal behavior**: Substrate nodes can be resource-intensive

**Solutions**:
```bash
# Reduce verbosity
# Add --log error to node command

# Limit block history (add to node command)
--pruning archive  # Change to: --pruning 256

# Monitor resources
top
# Or: htop
```

---

## Data/State Issues

### Want to start completely fresh

**Solution**:
```bash
# 1. Stop node
pkill -9 node-subtensor

# 2. Clear all state
rm -rf /tmp/dev
rm -rf /tmp/subtensor-logs/*

# 3. Restart
cd /root/code/subtensor
./scripts/setup/04_start_node.sh

# 4. Re-initialize
sleep 10
node register_20_subnets.js
node enable_emissions_batch.js
node enable_subtokens.js
```

### Chain state corrupted

**Symptom**: Errors about storage or inconsistent state

**Solution**: Same as above - fresh start

---

## Flow-Based Emissions Testing Issues

### Cannot enable flow-based emissions

**Symptom**: Transaction fails or extrinsic not found

**Check**:
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  const hasExtrinsic = typeof api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled !== 'undefined';
  console.log('Flow-based extrinsic exists:', hasExtrinsic);

  await api.disconnect();
})();
"
```

If false, the runtime doesn't support it. This is expected - flow-based is a newer feature.

### Flow shows as 0 despite swaps

**Expected initially**: Flow is an EMA (exponential moving average) that builds up over time.

**Check**:
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });

  const netuid = 5;
  const flow = await api.query.subtensorModule.subnetFlowEMA(netuid);
  const taoIn = await api.query.subtensorModule.subnetTaoInEmission(netuid);

  console.log('Flow EMA:', flow.toString());
  console.log('TAO in emission:', taoIn.toString());

  await api.disconnect();
})();
"
```

---

## Getting Help

If you're stuck:

1. **Check logs**: `tail -100 /tmp/subtensor-logs/dev.log`
2. **Verify node state**: `node check_status.js`
3. **Search this file**: Ctrl+F for your error message
4. **Read the code**: Scripts are well-commented
5. **Start fresh**: Often fastest solution

---

## Debug Mode

To get more verbose output:

```bash
# Node logs
cd /root/code/subtensor
RUST_LOG=debug ./target/release/node-subtensor --dev ...

# Script logs
node --trace-warnings script.js
```

---

**Still having issues?** Check:
- Subtensor GitHub issues: https://github.com/opentensor/subtensor/issues
- Bittensor Discord: https://discord.gg/bittensor
