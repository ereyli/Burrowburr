// Contract addresses on Starknet Sepolia
const BURR_TOKEN_ADDRESS = "0x0070ec81bb3e60c8dbc936880e234a0b6d529656aa18ebdfa8f497642bdb4e74";
const BURROW_GAME_ADDRESS = "0x02705d2fef722cc6fd96f3551290ac63f2fdda8172ebd045c96dd56395c9bdd8"; // Updated with new contract

// Multiple STRK contract addresses to try
const STRK_ADDRESSES = [
    "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", // Primary STRK
    "0x04718f5a0FC34cC1aF16A1cdee98fFB20c31f5cD61d6Ab07201858f4287c938D", // Alternative
    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH for testing
];

// Staking costs (in wei)
const STAKING_COSTS = {
    1: "12000000000000000000", // 12 STRK for Noob Beaver
    2: "30000000000000000000", // 30 STRK for Pro Beaver  
    3: "60000000000000000000"  // 60 STRK for Degen Beaver
};

// Large approve amount to avoid repeated approvals (1000 STRK)
const LARGE_APPROVE_AMOUNT = "1000000000000000000000"; 