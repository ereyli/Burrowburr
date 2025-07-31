const { RpcProvider, Contract } = require('starknet');

// Contract addresses
const GAME_CONTRACT_ADDRESS = "0x0138cb7150f311b40163cf4cb4e1be38b795c232ef27c50cdf30b166bec36c27";
const BURR_TOKEN_ADDRESS = "0x01bc7c8ce3b8fe74e4870adc2965df850d429048e83fad93f3140f52ecb74add";

// ABI for testing (minimal for debug)
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
    nodeUrl: "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/EXk1VtDVCaeNBRAWsi7WA"
});

async function testBeaverImport(userAddress) {
    try {
        console.log("🧪 Testing beaver import for address:", userAddress);

        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);

        // Test 1: Check if user has any beavers
        console.log("📋 Testing get_user_beavers...");
        const beaverResponse = await gameContract.get_user_beavers(userAddress);
        console.log("📋 Raw beaver response:", beaverResponse);
        
        // Parse beaver IDs from response
        let beaverIds = [];
        if (beaverResponse && beaverResponse.beaver_ids) {
            beaverIds = beaverResponse.beaver_ids;
        } else if (Array.isArray(beaverResponse)) {
            beaverIds = beaverResponse;
        } else if (typeof beaverResponse === 'object') {
            // Extract numeric values from object
            for (let key in beaverResponse) {
                const value = beaverResponse[key];
                if (typeof value === 'string' && /^[0-9a-fA-F]+$/.test(value)) {
                    const numValue = parseInt(value, 16);
                    if (numValue > 0) {
                        beaverIds.push(numValue);
                    }
                } else if (typeof value === 'number' && value > 0) {
                    beaverIds.push(value);
                }
            }
        }
        
        console.log("📋 Parsed beaver IDs:", beaverIds);
        console.log("📋 Number of beavers:", beaverIds.length);

        if (beaverIds.length === 0) {
            console.log("❌ No beavers found for this address");
            return { error: "No beavers found" };
        }

        // Test 2: Check each beaver individually
        const successfulBeavers = [];
        const failedBeavers = [];

        for (const beaverId of beaverIds) {
            try {
                console.log(`📋 Testing beaver ${beaverId}...`);
                const beaverDetails = await gameContract.get_beaver(userAddress, beaverId);
                console.log(`📋 Beaver ${beaverId} details:`, beaverDetails);
                successfulBeavers.push(beaverId);
            } catch (error) {
                console.log(`❌ Beaver ${beaverId} failed:`, error.message);
                failedBeavers.push(beaverId);
            }
        }

        console.log("✅ Successful beavers:", successfulBeavers);
        console.log("❌ Failed beavers:", failedBeavers);
        console.log("📊 Summary: Total:", beaverIds.length, "Success:", successfulBeavers.length, "Failed:", failedBeavers.length);

        // Test 3: Check pending rewards
        console.log("📋 Testing calculate_pending_rewards...");
        const pendingRewards = await gameContract.calculate_pending_rewards(userAddress);
        console.log("📋 Pending rewards:", pendingRewards);

        return {
            beaverIds: beaverIds,
            successfulBeavers: successfulBeavers,
            failedBeavers: failedBeavers,
            pendingRewards: pendingRewards
        };

    } catch (error) {
        console.error("❌ Test error:", error);
        return { error: error.message };
    }
}

// Test with different address formats
const testAddresses = [
    "0x02ffbd13c38e9524cae9097b740d2a9da35fe933dffcc9e18cfad15386f4d171", // Correct address with 0x02
    "0x2ffbd13c38e9524cae9097b740d2a9da35fe933dffcc9e18cfad15386f4d171", // Without 0x02
    "0x45c23c47a18577e67d485d5b634d95", // Short format from image
    "0x045c23c47a18577e67d485d5b634d95", // With leading 0
    "0x00045c23c47a18577e67d485d5b634d95" // Full format
];

async function testAllAddresses() {
    for (const address of testAddresses) {
        console.log(`\n🧪 Testing address: ${address}`);
        const result = await testBeaverImport(address);
        console.log(`Result for ${address}:`, result);
    }
}

testAllAddresses(); 