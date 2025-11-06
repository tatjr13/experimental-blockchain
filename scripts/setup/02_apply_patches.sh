#!/bin/bash
set -e

echo "========================================="
echo "Step 2: Applying Runtime Patches"
echo "========================================="

SUBTENSOR_DIR="/root/code/subtensor"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ ! -d "$SUBTENSOR_DIR" ]; then
    echo "❌ Error: Subtensor directory not found at $SUBTENSOR_DIR"
    echo "Run 01_clone_subtensor.sh first"
    exit 1
fi

cd "$SUBTENSOR_DIR"

# Apply patch for emission extrinsic
echo "Applying admin-utils patch..."
if git apply --check "$REPO_DIR/patches/admin-utils-emission-extrinsic.patch" 2>/dev/null; then
    git apply "$REPO_DIR/patches/admin-utils-emission-extrinsic.patch"
    echo "✓ Patch applied successfully"
else
    echo "⚠️  Patch may already be applied or conflicts exist"
    echo "Checking if extrinsic exists..."
    if grep -q "sudo_set_first_emission_block_for_subnet" pallets/admin-utils/src/lib.rs; then
        echo "✓ Extrinsic already present"
    else
        echo "❌ Error: Cannot apply patch and extrinsic not found"
        exit 1
    fi
fi

# Modify runtime constants
echo ""
echo "Modifying runtime constants..."

# Set rate limit to 0
if grep -q "pub const SubtensorInitialNetworkRateLimit: u64 = 0;" runtime/src/lib.rs; then
    echo "✓ Rate limit already set to 0"
else
    echo "Setting NetworkRateLimit = 0..."
    sed -i 's/pub const SubtensorInitialNetworkRateLimit: u64 = 7200;/pub const SubtensorInitialNetworkRateLimit: u64 = 0;/' runtime/src/lib.rs
    echo "✓ Rate limit set to 0"
fi

# Set lock cost to 1 TAO
if grep -q "pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000;" runtime/src/lib.rs; then
    echo "✓ Lock cost already set to 1 TAO"
else
    echo "Setting MinLockCost = 1 TAO..."
    sed -i 's/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000_000;/pub const SubtensorInitialMinLockCost: u64 = 1_000_000_000;/' runtime/src/lib.rs
    echo "✓ Lock cost set to 1 TAO"
fi

echo ""
echo "✓ All patches and modifications applied"
echo ""
echo "Verification:"
grep "SubtensorInitialNetworkRateLimit" runtime/src/lib.rs | grep -v "//"
grep "SubtensorInitialMinLockCost" runtime/src/lib.rs | grep -v "//"
echo ""
