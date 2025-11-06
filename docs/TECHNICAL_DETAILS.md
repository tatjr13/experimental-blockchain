# Technical Details - Flow-Based Emissions Implementation

Deep dive into the technical implementation and modifications.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Local Dev Node                       │
│                  (Single Authority)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─ Root Network (netuid 0)
                 │
                 ├─ Subnet 1 (netuid 1)
                 ├─ Subnet 2 (netuid 2)
                 ├─ ...
                 └─ Subnet 19 (netuid 19)

Each subnet contains:
  - Alpha pool (subtoken)
  - TAO reserves
  - Neurons (validators/miners)
  - Emission configuration
```

---

## Emission Pipeline

### Per-Block (Coinbase)

**File**: `pallets/subtensor/src/coinbase/run_coinbase.rs`

**Function**: `run_coinbase(block_reward: U96F32)`

**Process**:
1. Calculate total weights from prices or flows
2. Distribute block reward proportionally
3. Add to `PendingEmission` for each subnet

**Code Flow**:
```rust
pub fn run_coinbase(block_reward: U96F32) {
    // Get all subnet prices or flows
    let weights = calculate_weights();
    let total_weights = weights.sum();

    // For each subnet
    for (netuid, weight) in weights {
        let subnet_emission = (weight / total_weights) * block_reward;
        PendingEmission[netuid] += subnet_emission;
    }
}
```

### Per-Epoch (Tempo-based)

**When**: Every `Tempo` blocks (default 360 = ~72 minutes)

**Function**: `epoch()` in subnet pallet

**Process**:
1. Take accumulated `PendingEmission`
2. Distribute to neurons based on weights
3. Run consensus mechanism (Yuma, etc.)

---

## Price-Based Emissions (Default)

### Weight Calculation

**Formula**:
```
weight[i] = subnet_moving_price[i] / sum(all_moving_prices)
```

**Moving Price Update**:
- Uses Exponential Moving Average (EMA)
- Updated every N blocks
- Reflects long-term price trends, not spot price

**Code**:
```rust
pub fn update_moving_price(netuid: NetUid) {
    let spot_price = AlphaPrices::<T>::get(netuid);
    let old_moving = SubnetMovingPrice::<T>::get(netuid);

    // EMA with alpha parameter
    let new_moving = alpha * spot_price + (1 - alpha) * old_moving;

    SubnetMovingPrice::<T>::set(netuid, new_moving);
}
```

### Why Moving Price?

- Prevents gaming via price manipulation
- Smooths out volatility
- Rewards sustained price increases, not pumps

---

## Flow-Based Emissions (Feature Being Tested)

### Weight Calculation

**Formula**:
```
weight[i] = max(flow_ema[i] * 0.9 + 0.1, 0.1)
```

Where:
- `flow_ema[i]` = Net TAO flow EMA for subnet i
- `0.9` = Flow weight factor (90% weight from flow)
- `0.1` = Base weight (10% minimum)

**Net TAO Flow**:
```
net_flow = sum(TAO_buys) - sum(TAO_sells)
```

**Why 10% minimum?**
- Ensures all subnets get some emissions
- Prevents zero emissions even with negative flow
- Maintains network stability

### Flow Tracking

**Storage Items**:
- `SubnetFlowEMA`: Current flow EMA per subnet
- `SubnetTaoInEmission`: TAO flowing in from buys
- `SubnetAlphaOutEmission`: Alpha flowing out (buys)

**Update Mechanism**:
```rust
pub fn swap_tao_for_alpha(netuid, tao_amount) {
    // ... perform swap ...

    // Track TAO flow
    SubnetTaoInEmission[netuid] += tao_amount;

    // Update flow EMA
    update_flow_ema(netuid);
}
```

---

## Swap Mechanics

### TAO → Alpha (Buy)

**Extrinsic**: `addStake(hotkey, netuid, tao_amount)`

**Process**:
1. Remove TAO from coldkey balance
2. Call `swap_tao_for_alpha()`
3. Update pool reserves (TAO up, Alpha down)
4. Calculate Alpha received via AMM formula
5. Add Alpha to hotkey stake
6. Track flow for emissions

**AMM Formula** (Uniswap v2 style):
```
alpha_out = (alpha_reserve * tao_in) / (tao_reserve + tao_in)
```

### Alpha → TAO (Sell)

**Extrinsic**: `removeStake(hotkey, netuid, alpha_amount)`

**Process**:
1. Remove Alpha from hotkey stake
2. Call `swap_alpha_for_tao()`
3. Update pool reserves (Alpha up, TAO down)
4. Calculate TAO received
5. Add TAO to coldkey balance
6. Track flow for emissions

---

## New Sudo Extrinsic

### Purpose

`register_network` extrinsic creates a subnet but **does not enable emissions**.

**Missing**:
- `FirstEmissionBlockNumber` not set
- Result: `total_weights` calculation skips subnet

### Implementation

**File**: `pallets/admin-utils/src/lib.rs`

**Function**: `sudo_set_first_emission_block_for_subnet()`

**Signature**:
```rust
#[pallet::call_index(81)]
pub fn sudo_set_first_emission_block_for_subnet(
    origin: OriginFor<T>,
    netuid: NetUid,
    first_emission_block: u64,
) -> DispatchResult {
    pallet_subtensor::Pallet::<T>::ensure_root_with_rate_limit(origin, netuid)?;
    pallet_subtensor::FirstEmissionBlockNumber::<T>::insert(netuid, first_emission_block);

    log::debug!(
        "FirstEmissionBlockNumber( netuid: {netuid:?}, first_emission_block: {first_emission_block:?} )"
    );
    Ok(())
}
```

**Why Needed**:
- Test helper functions (`add_network()`) set this automatically
- Production `register_network()` does not
- Must be set manually via sudo
- This extrinsic provides the interface

---

## Storage Schema

### Emission-Related

```rust
// When emissions start for this subnet
FirstEmissionBlockNumber<T>: map NetUid => u64

// Accumulated emissions pending distribution
PendingEmission<T>: map NetUid => u64

// Moving price for weight calculation
SubnetMovingPrice<T>: map NetUid => I96F32

// Flow-based emissions enabled?
FlowBasedEmissionsEnabled<T>: map NetUid => bool

// Current flow EMA
SubnetFlowEMA<T>: map NetUid => I96F32
```

### Pool-Related

```rust
// TAO in pool reserves
SubnetTAO<T>: map NetUid => TaoCurrency

// Alpha minted (in pool)
SubnetAlphaIn<T>: map NetUid => AlphaCurrency

// Alpha distributed/sold (out of pool)
SubnetAlphaOut<T>: map NetUid => AlphaCurrency

// Swaps enabled?
SubtokenEnabled<T>: map NetUid => bool
```

---

## Rate Limiting

### Global Rate Limit

**Type**: `NetworkRateLimit`

**Applies to**: All `register_network` calls across all accounts

**Storage**: Single global value

**Default**: 7200 blocks (~12 hours)

**Modified to**: 0 blocks (instant registration)

### How It Works

```rust
pub fn passes_rate_limit<T: Config>(&self, _account: &T::AccountId) -> bool {
    let last_registration = LastNetworkRegistrationBlock::<T>::get();
    let current_block = System::<T>::block_number();
    let rate_limit = NetworkRateLimit::<T>::get();

    current_block >= last_registration + rate_limit
}
```

**Note**: Account parameter ignored - it's truly global.

### Why Global?

Prevents spam creation of subnets on mainnet by making any registration affect all users.

---

## Lock Cost Economics

### Formula

```rust
fn get_network_lock_cost() -> TaoCurrency {
    let base_cost = SubtensorInitialMinLockCost::<T>::get();
    let last_lock = NetworkLastLock::<T>::get();
    let last_lock_block = NetworkLastLockBlock::<T>::get();
    let current_block = get_current_block();

    // Exponential growth based on time since last registration
    let growth_factor = calculate_growth(current_block - last_lock_block);

    base_cost * growth_factor
}
```

### Why Exponential?

- Discourages subnet spam on mainnet
- Cost resets slowly over time
- First subnet cheap, subsequent ones expensive

### Testing Impact

Even with 1 TAO base cost, exponential growth limits registrations to ~20 subnets before exceeding Alice's ~475k TAO.

**Solutions**:
1. Use 20 subnets (chosen approach)
2. Give Alice more funds via sudo
3. Modify growth algorithm

---

## Block Production

### Dev Mode

**Consensus**: Instant seal (no actual consensus)

**Block Time**: ~12 seconds (configurable)

**Finality**: Immediate (single authority)

**Storage**: RocksDB at `--base-path`

### Logs Format

```
🏆 Imported #1234 (0xabcd... → 0xef01...)
```

**Indicates**:
- Block number: 1234
- Parent hash: 0xabcd...
- Current hash: 0xef01...

---

## Testing Considerations

### Genesis State

**Created when**: First time node starts with empty `--base-path`

**Contains**:
- Root network (netuid 0)
- Network #1 (netuid 1) - auto-created
- Dev accounts (//Alice, //Bob) with balances

**Persistence**: Survives node restarts if `--base-path` kept

**Reset**: Delete `--base-path` directory

### Dev Accounts

**//Alice**:
- Address: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`
- Role: Sudo root
- Initial balance: ~500k TAO

**//Bob**:
- Address: `5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty`
- Role: Secondary test account
- Initial balance: ~500k TAO

### Reproducibility

**Same build + same base-path = same state**

For truly fresh start:
1. Delete `/tmp/dev`
2. Restart node
3. Genesis recreated identically

---

## Performance Characteristics

### Build Time

- Clean build: ~20 minutes
- Incremental: ~2-5 minutes
- Dependencies: ~15 minutes (first time)

### Runtime

- Block production: ~12s
- Swap transaction: ~12s (1 block)
- Emission distribution: Once per tempo
- CPU usage: Moderate (~20-40%)
- RAM usage: ~500MB-1GB

### Storage

- Binary: ~100MB
- Chain database: ~500MB (grows slowly)
- Logs: ~10MB/day (with default verbosity)

---

## Security Considerations

### Why This Is Unsafe for Production

1. **`--rpc-cors all`**: Allows any origin
2. **`--rpc-methods unsafe`**: Exposes dangerous RPCs
3. **`--rpc-external`**: Listens on 0.0.0.0
4. **Rate limit = 0**: No spam protection
5. **Lock cost = 1 TAO**: Trivial to create subnets
6. **Dev accounts**: Well-known private keys
7. **Single node**: No decentralization

### Safe for Testing Because

- Local only (not exposed to internet)
- No real value
- Temporary state
- Controlled environment

---

## Future Extensions

### Multi-Node Setup

For more realistic testing:
```bash
# Alice (validator)
./node-subtensor --alice --chain local --port 30334 --rpc-port 9944

# Bob (validator)
./node-subtensor --bob --chain local --port 30335 --rpc-port 9945 --bootnodes /ip4/127.0.0.1/tcp/30334/p2p/ALICE_PEER_ID
```

### Custom Genesis

Create `chain_spec.json` with predefined state:
- Pre-registered subnets
- Custom balances
- Configured parameters

### Automated Testing

Use substrate `test-runtime` for unit tests without full node:
```rust
#[test]
fn test_flow_based_emissions() {
    new_test_ext().execute_with(|| {
        // Test logic
    });
}
```

---

## References

- **Subtensor**: https://github.com/opentensor/subtensor
- **Substrate**: https://docs.substrate.io
- **Polkadot.js**: https://polkadot.js.org/docs/
- **Bittensor Docs**: https://docs.bittensor.com

---

**Document Version**: 1.0
**Last Updated**: November 6, 2025
**Tested On**: Subtensor commit `<hash>`
