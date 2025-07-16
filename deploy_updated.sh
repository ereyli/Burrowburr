#!/bin/bash

# Load environment variables
source .env

echo "🚀 Deploying Updated BurrowGame Contract (Bug Fix: Preserves Pending Rewards)"
echo "============================================================================="

# Compile the contract
echo "📦 Compiling contract..."
scarb build

# Declare the updated contract
echo "📋 Declaring updated contract..."
DECLARE_OUTPUT=$(sncast declare --contract-name BurrowGame --url $STARKNET_RPC_URL 2>&1)
echo "$DECLARE_OUTPUT"

# Extract class hash from declare output
CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -o 'class_hash: 0x[a-fA-F0-9]*' | cut -d' ' -f2)

if [ -z "$CLASS_HASH" ]; then
    echo "❌ Failed to get class hash from declare output"
    echo "Trying to extract from different format..."
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -o '0x[a-fA-F0-9]\{64\}' | head -1)
fi

if [ -z "$CLASS_HASH" ]; then
    echo "❌ Could not extract class hash. Please check the declare output above."
    exit 1
fi

echo "✅ Contract declared with class hash: $CLASS_HASH"

# Deploy the contract with owner address
echo "🚀 Deploying contract..."
DEPLOY_OUTPUT=$(sncast deploy --class-hash $CLASS_HASH --constructor-calldata $DEPLOYMENT_ACCOUNT_ADDRESS --url $STARKNET_RPC_URL 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o 'contract_address: 0x[a-fA-F0-9]*' | cut -d' ' -f2)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Failed to get contract address from deploy output"
    echo "Trying to extract from different format..."
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o '0x[a-fA-F0-9]\{64\}' | head -1)
fi

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Could not extract contract address. Please check the deploy output above."
    exit 1
fi

echo "✅ Contract deployed at address: $CONTRACT_ADDRESS"

# Set token addresses
echo "🔧 Setting BURR token address..."
sncast invoke --contract-address $CONTRACT_ADDRESS --function set_burr_token --calldata $BURR_TOKEN_ADDRESS --url $STARKNET_RPC_URL

echo "🔧 Setting STRK token address..."
sncast invoke --contract-address $CONTRACT_ADDRESS --function set_strk_token --calldata $STRK_TOKEN_ADDRESS --url $STARKNET_RPC_URL

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================="
echo "Updated Contract Address: $CONTRACT_ADDRESS"
echo "Class Hash: $CLASS_HASH"
echo "Owner: $DEPLOYMENT_ACCOUNT_ADDRESS"
echo "BURR Token: $BURR_TOKEN_ADDRESS"
echo "STRK Token: $STRK_TOKEN_ADDRESS"
echo ""
echo "🔥 BUG FIX: Users can now stake multiple beavers without losing pending rewards!"
echo ""
echo "⚠️  IMPORTANT: Update frontend CONTRACT_ADDRESSES.BURROW_GAME to: $CONTRACT_ADDRESS"
echo "" 