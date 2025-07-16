#!/bin/bash

# Deployment script for BurrowGame contracts

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📁 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env file not found!"
fi

# Check if environment variables are set
if [ -z "$STARKNET_ACCOUNT_ADDRESS" ] || [ -z "$STARKNET_PRIVATE_KEY" ] || [ -z "$STARKNET_RPC_URL" ]; then
    echo "❌ Please set the following environment variables in .env file:"
    echo "STARKNET_ACCOUNT_ADDRESS=your_account_address"
    echo "STARKNET_PRIVATE_KEY=your_private_key"
    echo "STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/EXk1VtDVCaeNBRAWsi7WA"
    exit 1
fi

echo "🚀 Starting BurrowGame contract deployment..."
echo "Account: $STARKNET_ACCOUNT_ADDRESS"
echo "RPC: $STARKNET_RPC_URL"

# Step 1: Declare BurrowGame contract
echo "📋 Declaring BurrowGame contract..."
BURROW_GAME_CLASS_HASH=$(starkli declare target/dev/burrowgame_BurrowGame.contract_class.json \
    --account $STARKNET_ACCOUNT_ADDRESS \
    --private-key $STARKNET_PRIVATE_KEY \
    --rpc $STARKNET_RPC_URL \
    2>/dev/null | grep "Class hash declared:" | awk '{print $4}')

if [ -z "$BURROW_GAME_CLASS_HASH" ]; then
    echo "❌ Failed to declare BurrowGame contract"
    exit 1
fi

echo "✅ BurrowGame declared with class hash: $BURROW_GAME_CLASS_HASH"

# Step 2: Deploy BurrowGame contract
echo "🏗️ Deploying BurrowGame contract..."
BURROW_GAME_ADDRESS=$(starkli deploy $BURROW_GAME_CLASS_HASH \
    --account $STARKNET_ACCOUNT_ADDRESS \
    --private-key $STARKNET_PRIVATE_KEY \
    --rpc $STARKNET_RPC_URL \
    2>/dev/null | grep "Contract deployed:" | awk '{print $3}')

if [ -z "$BURROW_GAME_ADDRESS" ]; then
    echo "❌ Failed to deploy BurrowGame contract"
    exit 1
fi

echo "✅ BurrowGame deployed at: $BURROW_GAME_ADDRESS"

# Step 3: Configuration
echo "⚙️ Configuring contracts..."

# Set BURR token address in BurrowGame
echo "Setting BURR token address..."
starkli invoke $BURROW_GAME_ADDRESS set_burr_token 0x0070ec81bb3e60c8dbc936880e234a0b6d529656aa18ebdfa8f497642bdb4e74 \
    --account $STARKNET_ACCOUNT_ADDRESS \
    --private-key $STARKNET_PRIVATE_KEY \
    --rpc $STARKNET_RPC_URL

# Set STRK token address in BurrowGame  
echo "Setting STRK token address..."
starkli invoke $BURROW_GAME_ADDRESS set_strk_token 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d \
    --account $STARKNET_ACCOUNT_ADDRESS \
    --private-key $STARKNET_PRIVATE_KEY \
    --rpc $STARKNET_RPC_URL

# Authorize BurrowGame as minter in BURR token
echo "Authorizing BurrowGame as BURR minter..."
starkli invoke 0x0070ec81bb3e60c8dbc936880e234a0b6d529656aa18ebdfa8f497642bdb4e74 authorize_minter $BURROW_GAME_ADDRESS \
    --account $STARKNET_ACCOUNT_ADDRESS \
    --private-key $STARKNET_PRIVATE_KEY \
    --rpc $STARKNET_RPC_URL

echo "🎉 Deployment completed successfully!"
echo "📋 Contract Addresses:"
echo "BURR Token: 0x0070ec81bb3e60c8dbc936880e234a0b6d529656aa18ebdfa8f497642bdb4e74"
echo "BurrowGame: $BURROW_GAME_ADDRESS"
echo ""
echo "💡 Don't forget to update frontend/js/app.js with the new BurrowGame address!"

