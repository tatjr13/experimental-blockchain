# Runtime Constants Configuration

These constants in `runtime/src/lib.rs` have been modified for testing purposes.

---

## Modified Constants

### SubtensorInitialNetworkRateLimit

**Location**: `runtime/src/lib.rs` line ~1195

**Original Value**: `7200` (blocks, ~12 hours)

**Modified Value**: `0` (no rate limit)

**Purpose**:
- Default rate limit prevents rapid subnet registration on mainnet (anti-spam)
- For testing, we need to register 20+ subnets quickly
- Setting to 0 allows immediate consecutive registrations

**Code**:
```rust
pub const SubtensorInitialNetworkRateLimit: u64 = 0;
```

---

### SubtensorInitialMinLockCost

**Location**: `runtime/src/lib.rs` line ~1191

**Original Value**: `1_000_000_000_000` (1000 TAO)

**Modified Value**: `1_000_000_000` (1 TAO)

**Purpose**:
- Lock cost is amount locked when registering a subnet
- Original 1000 TAO would require 20,000 TAO for 20 subnets
- Dev Alice account has ~500k TAO but lock cost grows exponentially
- Reducing to 1 TAO makes testing feasible

**Note**: Even at 1 TAO, exponential growth limits us to ~20 subnets before Alice runs out of funds.

**Code**:
```rust
pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000; // 1 TAO in Rao
```

---

## Build Features

### pow-faucet

**Usage**: `cargo build --release --features pow-faucet`

**Effect**:
- Disables various rate limits completely
- Enables faucet extrinsic for getting test TAO
- Sets `DefaultNetworkRateLimit()` to return 0

**Code Reference**: `pallets/subtensor/src/lib.rs` lines ~556-561
```rust
pub fn DefaultNetworkRateLimit<T: Config>() -> u64 {
    if cfg!(feature = "pow-faucet") {
        return 0;  // Disable in test mode
    }
    T::InitialNetworkRateLimit::get()
}
```

---

## Other Relevant Constants (Not Modified)

### DefaultTempo
- Default: 360 blocks (~72 minutes)
- Determines emission epoch duration
- Each subnet can have custom tempo

### SubnetLimit
- Default: 128
- Maximum number of subnets (excluding root)
- We register 20 for testing

### MaxAllowedUids
- Default: 4096 per subnet
- Maximum neurons per subnet
- Not relevant for our testing

---

## Reverting Changes

To revert to mainnet-safe values:

```bash
cd /root/code/subtensor

# Revert rate limit
sed -i 's/pub const SubtensorInitialNetworkRateLimit: u64 = 0;/pub const SubtensorInitialNetworkRateLimit: u64 = 7200;/' runtime/src/lib.rs

# Revert lock cost
sed -i 's/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000;/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000_000;/' runtime/src/lib.rs

# Rebuild without pow-faucet
cargo clean
cargo build --release -p node-subtensor
```

---

## Why These Changes Are Safe for Testing

1. **Local testnet only** - Not connected to mainnet
2. **Dev account** - Using //Alice with unlimited funds
3. **Temporary state** - Chain state cleared on restart
4. **No real value** - TAO has no real-world value in dev mode

**⚠️ NEVER use these modifications on mainnet or testnet!**

---

## Additional Configuration

### Node Startup Flags

Used in `scripts/setup/04_start_node.sh`:

```bash
--dev                     # Development mode (local, single-node)
--base-path /tmp/dev      # Chain database location
--rpc-port 9944           # WebSocket RPC port
--rpc-cors all            # Allow all CORS (unsafe, dev only)
--rpc-methods unsafe      # Enable all RPC methods
--rpc-external            # Listen on 0.0.0.0
--allow-private-ipv4      # Allow local connections
```

These flags are **extremely insecure** and should **never** be used in production.

---

## Emission Configuration

Set per-subnet after registration:

- `FirstEmissionBlockNumber`: Block when emissions start (required)
- `SubtokenEnabled`: Enable swaps (required for trading)
- `FlowBasedEmissionsEnabled`: Use flow-based instead of price-based

These are set via scripts in `scripts/initialize/`.
