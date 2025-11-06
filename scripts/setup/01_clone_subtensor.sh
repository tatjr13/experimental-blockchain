#!/bin/bash
set -e

echo "========================================="
echo "Step 1: Cloning Subtensor Repository"
echo "========================================="

SUBTENSOR_DIR="/root/code/subtensor"

if [ -d "$SUBTENSOR_DIR" ]; then
    echo "⚠️  Subtensor already exists at $SUBTENSOR_DIR"
    read -p "Remove and re-clone? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$SUBTENSOR_DIR"
    else
        echo "✓ Using existing subtensor directory"
        exit 0
    fi
fi

# Create parent directory
mkdir -p /root/code

# Clone repository
cd /root/code
echo "Cloning subtensor repository..."
git clone https://github.com/opentensor/subtensor.git

cd subtensor

echo ""
echo "✓ Subtensor cloned to $SUBTENSOR_DIR"
echo "✓ Current commit: $(git rev-parse --short HEAD)"
echo ""
