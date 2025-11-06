#!/bin/bash
set -e

echo "========================================="
echo "Step 4: Starting Dev Node"
echo "========================================="

SUBTENSOR_DIR="/root/code/subtensor"

if [ ! -f "$SUBTENSOR_DIR/target/release/node-subtensor" ]; then
    echo "❌ Error: Node binary not found"
    echo "Run 03_build_runtime.sh first"
    exit 1
fi

# Create log directory
mkdir -p /tmp/subtensor-logs

# Check if node is already running
if pgrep -f "node-subtensor.*--dev" > /dev/null; then
    echo "⚠️  Node already running"
    read -p "Kill and restart? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing node..."
        pkill -9 node-subtensor || true
        sleep 2
    else
        echo "Keeping existing node"
        exit 0
    fi
fi

# Check if tmux session exists
if tmux has-session -t subtensor 2>/dev/null; then
    echo "Killing existing tmux session..."
    tmux kill-session -t subtensor
fi

cd "$SUBTENSOR_DIR"

# Start node in tmux
echo "Starting node in tmux session 'subtensor'..."
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

echo "✓ Node started in tmux session"
echo ""

# Wait for node to be ready
echo "Waiting for node to start..."
sleep 5

# Verify node is running
if pgrep -f "node-subtensor.*--dev" > /dev/null; then
    echo "✓ Node is running (PID: $(pgrep -f 'node-subtensor.*--dev'))"
else
    echo "❌ Error: Node failed to start"
    echo "Check logs: tail -50 /tmp/subtensor-logs/dev.log"
    exit 1
fi

# Check for block production
echo ""
echo "Checking for block production..."
sleep 3
if tail -20 /tmp/subtensor-logs/dev.log | grep -q "Imported"; then
    echo "✓ Node producing blocks"
else
    echo "⚠️  No blocks seen yet (this may be normal, give it more time)"
fi

echo ""
echo "========================================="
echo "Node Started Successfully!"
echo "========================================="
echo ""
echo "Access the node:"
echo "  tmux attach -t subtensor"
echo "  (detach with Ctrl+b then d)"
echo ""
echo "View logs:"
echo "  tail -f /tmp/subtensor-logs/dev.log"
echo ""
echo "RPC endpoint: ws://127.0.0.1:9944"
echo ""
