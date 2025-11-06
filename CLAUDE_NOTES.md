# Notes for Future Claude Code Instances

Hey Claude! 👋 This document is specifically for you if you're helping a user set up this testnet.

---

## Quick Context

**What is this?**: A complete setup for testing Bittensor's flow-based emissions feature on a local blockchain.

**Time Investment**: ~30 minutes (mostly automated build time)

**Your Goal**: Help the user successfully set up a local testnet with 20 subnets where they can:
1. Perform TAO ↔ Alpha swaps
2. Monitor emission distribution
3. Test flow-based vs price-based emissions

---

## If User Says: "Set this up for me"

**Do this**:

1. **Check prerequisites** (don't assume they're installed):
```bash
# Check Rust
rustc --version || echo "Need to install Rust"

# Check Node.js
node --version || echo "Need to install Node.js"

# Check build tools
clang --version || echo "Need to install build-essential"
```

2. **Run setup scripts in order**:
```bash
cd experimental-blockchain
./scripts/setup/01_clone_subtensor.sh      # 1 min
./scripts/setup/02_apply_patches.sh         # 1 min
./scripts/setup/03_build_runtime.sh         # 20 min (show progress!)
./scripts/setup/04_start_node.sh            # 1 min
```

3. **Initialize testnet** (wait for node to start first!):
```bash
sleep 10  # Give node time to start
cd /root/code/subtensor
node scripts/initialize/register_20_subnets.js
node scripts/initialize/enable_emissions.js
node scripts/initialize/enable_subtokens.js
```

4. **Verify** everything worked:
```bash
node scripts/utils/check_status.js
```

If you see all ✅ checkmarks, setup is complete!

---

## Common User Requests

### "Show me how to swap"

```javascript
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const api = await ApiPromise.create({
  provider: new WsProvider('ws://127.0.0.1:9944')
});
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

// Buy 50 TAO worth of Alpha on subnet 5
await api.tx.subtensorModule.addStake(
  alice.address,  // hotkey
  5,              // netuid
  50_000_000_000  // 50 TAO in Rao
).signAndSend(alice, ({ status }) => {
  if (status.isInBlock) console.log('Swap done!');
});
```

### "Enable flow-based emissions"

```javascript
// Enable for subnet 5
await api.tx.sudo.sudo(
  api.tx.subtensorModule.sudoSetFlowBasedEmissionsEnabled(5, true)
).signAndSend(alice, ({ status }) => {
  if (status.isInBlock) console.log('Enabled!');
});
```

### "Compare flow vs price"

```bash
node scripts/testing/compare_flow_vs_price.js
```

---

## Key Files You'll Reference

**For setup help**:
- `docs/SETUP_GUIDE.md` - Step-by-step instructions
- `docs/TROUBLESHOOTING.md` - Error solutions

**For usage help**:
- `docs/SYSTEM_READY.md` - Post-setup guide
- `docs/TECHNICAL_DETAILS.md` - Deep technical info

**For debugging**:
- `/tmp/subtensor-logs/dev.log` - Node logs
- `scripts/utils/check_status.js` - Quick verification

---

## Troubleshooting Checklist

User says something isn't working? Check these:

**1. Is node actually running?**
```bash
ps aux | grep node-subtensor | grep -v grep
```

**2. Is it producing blocks?**
```bash
tail -20 /tmp/subtensor-logs/dev.log | grep Imported
```

**3. Are emissions running?**
```bash
tail -50 /tmp/subtensor-logs/dev.log | grep total_weights
# Should see non-zero values
```

**4. Are subtokens enabled?**
```bash
node -e "
const { ApiPromise, WsProvider } = require('@polkadot/api');
(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider('ws://127.0.0.1:9944')
  });
  const enabled = await api.query.subtensorModule.subtokenEnabled(5);
  console.log('Subnet 5 subtokens:', enabled.toHuman());
  await api.disconnect();
})();
"
```

**5. Can we connect to RPC?**
```bash
curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_health"}' http://localhost:9944
```

---

## Common Errors and Fixes

### "Cannot find module '@polkadot/api'"
```bash
cd /root/code/subtensor
npm install @polkadot/api @polkadot/keyring
```

### "RateLimitExceeded"
Rate limit not set to 0. Need to rebuild:
```bash
# Verify rate limit setting
grep SubtensorInitialNetworkRateLimit /root/code/subtensor/runtime/src/lib.rs
# Should show: = 0;

# If not, fix and rebuild
cd /root/code/subtensor
cargo clean
cargo build --release --features pow-faucet -p node-subtensor
```

### "total_weights=0" (Emissions not running)
`FirstEmissionBlockNumber` not set. Re-run:
```bash
node scripts/initialize/enable_emissions.js
```

### "SubtokenDisabled"
Re-run:
```bash
node scripts/initialize/enable_subtokens.js
```

---

## Understanding the User's Goal

Most users want to:

1. **Test flow-based emissions** - They want to see how net TAO flow affects emission weights

2. **Compare to price-based** - They want to see the difference between the two systems

3. **Simulate trading** - They want to generate swaps and see the effects

**Help them by**:
- Setting up a clean testnet
- Showing them how to perform swaps
- Helping them interpret results
- Explaining the differences between flow-based and price-based

---

## Important Reminders

### Don't Assume

- ❌ "The node should be running" → ✅ Actually check: `ps aux | grep node-subtensor`
- ❌ "Emissions are probably working" → ✅ Actually verify: `grep total_weights logs`
- ❌ "The build probably finished" → ✅ Check for binary: `ls target/release/node-subtensor`

### Be Proactive

If user says "it's not working":
1. Check logs immediately
2. Verify each component
3. Don't guess - actually test

### Communicate Clearly

- Tell them what you're doing: "Checking node status..."
- Tell them what you found: "Node is running, but emissions are 0"
- Tell them next steps: "We need to enable emissions"
- Tell them time estimates: "This will take ~20 minutes"

---

## Scripts Cheat Sheet

**Setup**:
```bash
./scripts/setup/01_clone_subtensor.sh
./scripts/setup/02_apply_patches.sh
./scripts/setup/03_build_runtime.sh
./scripts/setup/04_start_node.sh
```

**Initialize**:
```bash
node scripts/initialize/register_20_subnets.js
node scripts/initialize/enable_emissions.js
node scripts/initialize/enable_subtokens.js
```

**Test**:
```bash
node scripts/testing/swap_test.js
node scripts/testing/verify_emissions.js
node scripts/testing/compare_flow_vs_price.js
```

**Utilities**:
```bash
node scripts/utils/check_status.js
./scripts/utils/reset_testnet.sh
```

---

## Node Access

**Attach to tmux session**:
```bash
tmux attach -t subtensor
# Detach: Ctrl+b then d
```

**View logs**:
```bash
tail -f /tmp/subtensor-logs/dev.log
```

**Kill node**:
```bash
pkill -9 node-subtensor
```

---

## Success Criteria

Setup is successful when:

✅ Node running in tmux
✅ 20 networks registered
✅ Emissions active (total_weights > 0)
✅ Subtokens enabled
✅ Test swap completes successfully

Verify with: `node scripts/utils/check_status.js`

---

## What the User Can Do After Setup

1. **Perform swaps**:
   - Buy Alpha: `addStake(hotkey, netuid, tao_amount)`
   - Sell Alpha: `removeStake(hotkey, netuid, alpha_amount)`

2. **Monitor emissions**:
   - Check pending: `pendingEmission(netuid)`
   - Check moving price: `subnetMovingPrice(netuid)`
   - Compare subnets: `scripts/testing/compare_flow_vs_price.js`

3. **Test flow-based**:
   - Enable: `sudoSetFlowBasedEmissionsEnabled(netuid, true)`
   - Generate swaps to create flow
   - Compare emission weights vs price-based subnets

---

## Final Tips

1. **Read the docs first** - docs/SETUP_GUIDE.md has everything
2. **Check logs often** - /tmp/subtensor-logs/dev.log is your friend
3. **Scripts are well-commented** - Read them if confused
4. **Start fresh if stuck** - `./scripts/utils/reset_testnet.sh`
5. **Time estimates are accurate** - Trust them when telling user

---

## Need Help?

If you're stuck and the docs aren't helping:

1. Check `/docs/TROUBLESHOOTING.md`
2. Look at `/docs/TECHNICAL_DETAILS.md`
3. Read the actual script code - it's well-commented
4. Search subtensor repo: https://github.com/opentensor/subtensor

---

**Good luck!** You've got this. The setup is well-tested and the documentation is comprehensive. Trust the process and help the user get their testnet running! 🚀
