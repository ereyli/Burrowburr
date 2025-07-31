const { RpcProvider, Contract } = require('starknet');

// Contract addresses
const GAME_CONTRACT_ADDRESS = "0x0138cb7150f311b40163cf4cb4e1be38b795c232ef27c50cdf30b166bec36c27";
const BURR_TOKEN_ADDRESS = "0x01bc7c8ce3b8fe74e4870adc2965df850d429048e83fad93f3140f52ecb74add";

// ABI for testing
const GAME_ABI = [
    {
        "name": "get_user_beavers",
        "type": "function",
        "inputs": [{"name": "owner", "type": "felt"}],
        "outputs": [{"name": "beaver_ids", "type": "felt*"}],
        "stateMutability": "view"
    },
    {
        "name": "get_beaver",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "felt"},
            {"name": "beaver_id", "type": "felt"}
        ],
        "outputs": [
            {"name": "id", "type": "felt"},
            {"name": "beaver_type", "type": "felt"},
            {"name": "level", "type": "felt"},
            {"name": "last_claim_time", "type": "felt"},
            {"name": "owner", "type": "felt"}
        ],
        "stateMutability": "view"
    },
    {
        "name": "calculate_pending_rewards",
        "type": "function",
        "inputs": [{"name": "owner", "type": "felt"}],
        "outputs": [{"name": "rewards", "type": "Uint256"}],
        "stateMutability": "view"
    }
];

// Provider
const provider = new RpcProvider({
    nodeUrl: "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/YOUR_API_KEY_HERE"
});

async function testBeaverImport(userAddress) {
    try {
        console.log("🧪 Testing beaver import for address:", userAddress);
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Test 1: Check if user has any beavers
        console.log("📋 Testing get_user_beavers...");
        const beaverIds = await gameContract.get_user_beavers(userAddress);
        console.log("📋 User beaver IDs:", beaverIds);
        
        // Test 2: Check specific beaver IDs that should be imported
        const testBeaverIds = [1, 2, 3, 4, 5]; // Common beaver IDs to test
        
        for (const testId of testBeaverIds) {
            try {
                console.log(`📋 Testing beaver ${testId}...`);
                const beaverDetails = await gameContract.get_beaver(userAddress, testId);
                console.log(`📋 Beaver ${testId} details:`, beaverDetails);
            } catch (error) {
                console.log(`📋 Beaver ${testId} not found or error:`, error.message);
            }
        }
        
        // Test 3: Check pending rewards
        console.log("📋 Testing calculate_pending_rewards...");
        const pendingRewards = await gameContract.calculate_pending_rewards(userAddress);
        console.log("📋 Pending rewards:", pendingRewards);
        
        return {
            beaverIds: beaverIds,
            pendingRewards: pendingRewards
        };
        
    } catch (error) {
        console.error("❌ Test error:", error);
        return { error: error.message };
    }
}

// Test with a specific user address
const testAddress = "0x01cc223b9d2cd8e69f441f89c0c002ec2d13caf519aeb3fa584bd9e7f7f2321d"; // Owner address

testBeaverImport(testAddress)
    .then(result => {
        console.log("✅ Test completed:", result);
    })
    .catch(error => {
        console.error("❌ Test failed:", error);
    }); 