#!/bin/bash
set -e

echo "========================================="
echo "RESET TESTNET"
echo "========================================="
echo "⚠️  This will clear all chain state and restart fresh"
echo ""

read -p "Are you sure? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled"
    exit 0
fi

SUBTENSOR_DIR="/root/code/subtensor"

# Stop node
echo "Stopping node..."
pkill -9 node-subtensor || true
sleep 2

# Kill tmux session
if tmux has-session -t subtensor 2>/dev/null; then
    tmux kill-session -t subtensor
fi

# Clear state
echo "Clearing chain state..."
rm -rf /tmp/dev
rm -rf /tmp/subtensor-logs/*
mkdir -p /tmp/subtensor-logs

echo "✓ State cleared"
echo ""

# Restart node
echo "Restarting node..."
cd "$SUBTENSOR_DIR"

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

echo "✓ Node restarted"
echo ""

# Wait for node
echo "Waiting for node to be ready..."
sleep 10

# Verify
if pgrep -f "node-subtensor.*--dev" > /dev/null; then
    echo "✓ Node is running"
else
    echo "❌ Error: Node failed to start"
    exit 1
fi

echo ""
echo "========================================="
echo "Testnet Reset Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. cd /root/code/subtensor"
echo "  2. node register_20_subnets.js"
echo "  3. node enable_emissions.js"
echo "  4. node enable_subtokens.js"
echo ""
echo "Or run the initialization scripts:"
echo "  cd /root/experimental-blockchain"
echo "  ./scripts/initialize/register_20_subnets.js"
echo "  ./scripts/initialize/enable_emissions.js"
echo "  ./scripts/initialize/enable_subtokens.js"
echo ""
