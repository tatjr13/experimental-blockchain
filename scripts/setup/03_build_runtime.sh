#!/bin/bash
set -e

echo "========================================="
echo "Step 3: Building Runtime"
echo "========================================="
echo "⚠️  This will take approximately 20 minutes"
echo ""

SUBTENSOR_DIR="/root/code/subtensor"

if [ ! -d "$SUBTENSOR_DIR" ]; then
    echo "❌ Error: Subtensor directory not found"
    exit 1
fi

cd "$SUBTENSOR_DIR"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: Rust not found"
    echo "Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo "Rust version: $(rustc --version)"
echo ""

# Clean previous builds
echo "Cleaning previous builds..."
cargo clean
echo "✓ Clean complete"
echo ""

# Build with pow-faucet feature
echo "Building node-subtensor with pow-faucet feature..."
echo "Started at: $(date)"
echo ""

START_TIME=$(date +%s)

cargo build --release --features pow-faucet -p node-subtensor

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "✓ Build complete!"
echo "Time taken: ${MINUTES}m ${SECONDS}s"
echo ""

# Verify binary exists
if [ -f "target/release/node-subtensor" ]; then
    echo "✓ Binary created: target/release/node-subtensor"
    ls -lh target/release/node-subtensor
else
    echo "❌ Error: Binary not found at target/release/node-subtensor"
    exit 1
fi

echo ""
echo "✓ Runtime build successful"
echo ""
