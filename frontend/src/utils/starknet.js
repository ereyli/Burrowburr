/* eslint-env es2020 */
/* global BigInt */
import { connect, disconnect } from "starknetkit";
import { Contract, CallData, cairo, RpcProvider } from "starknet";
import { GAME_CONTRACT_ADDRESS, BURR_TOKEN_ADDRESS, STRK_ADDRESSES } from './constants.js';

// Ensure BigInt is available (should be in modern browsers)
if (typeof BigInt === 'undefined') {
    throw new Error('BigInt is not supported in this browser');
}

const provider = new RpcProvider({
    nodeUrl: "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/EXk1VtDVCaeNBRAWsi7WA"
});

// ABI definitions
const ERC20_ABI = [
    {
        "name": "balance_of", 
        "type": "function",
        "inputs": [{"name": "account", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "total_supply",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "name",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::byte_array::ByteArray"}],
        "stateMutability": "view"
    },
    {
        "name": "symbol",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::byte_array::ByteArray"}],
        "stateMutability": "view"
    },
    {
        "name": "decimals",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u8"}],
        "stateMutability": "view"
    },
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {"name": "spender", "type": "felt"},
            {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "recipient", "type": "felt"},
            {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
    }
];

const GAME_ABI = [
    {
        "name": "stake_beaver",
        "type": "function",
        "inputs": [{"name": "beaver_type", "type": "felt"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "claim",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "upgrade_beaver",
        "type": "function",
        "inputs": [{"name": "beaver_id", "type": "felt"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_user_beavers",
        "type": "function",
        "inputs": [{"name": "owner", "type": "felt"}],
        "outputs": [{"name": "beaver_ids", "type": "felt*"}],
        "stateMutability": "view"
    },
    {
        "name": "get_user_last_claim",
        "type": "function",
        "inputs": [{"name": "owner", "type": "felt"}],
        "outputs": [{"name": "last_claim", "type": "felt"}],
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
    },
    {
        "name": "get_total_burned",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "total_burned", "type": "Uint256"}],
        "stateMutability": "view"
    }
];

let currentConnection = null;

// Helper function to safely convert balance
function safeBalanceConvert(balance) {
    try {
        if (!balance) return BigInt(0);
        
        console.log('Converting balance:', balance, 'Type:', typeof balance);
        
        // Handle different response formats
        if (typeof balance === 'object') {
            // Log object details for debugging
            console.log('Object keys:', Object.keys(balance));
            console.log('Object values:', Object.values(balance));
            
            // Case 1: {balance: BigInt}
            if (balance.balance !== undefined) {
                return BigInt(balance.balance);
            }
            
            // Case 2: Uint256 format {low, high}
            if (balance.low !== undefined && balance.high !== undefined) {
                return BigInt(balance.low) + (BigInt(balance.high) << BigInt(128));
            }
            
            // Case 3: Array format [low, high]
            if (Array.isArray(balance) && balance.length >= 2) {
                return BigInt(balance[0]) + (BigInt(balance[1]) << BigInt(128));
            }
            
            // Case 4: Single item array
            if (Array.isArray(balance) && balance.length === 1) {
                return BigInt(balance[0]);
            }
            
            // Case 5: Object with numeric properties - extract first numeric value
            for (let key in balance) {
                const value = balance[key];
                if (typeof value === 'number' || typeof value === 'bigint') {
                    return BigInt(value);
                }
                if (typeof value === 'string' && /^\d+$/.test(value)) {
                    return BigInt(value);
                }
            }
            
            // If no numeric value found, return 0
            return BigInt(0);
        }
        
        if (typeof balance === 'string') {
            // Remove commas, spaces and convert
            const cleanBalance = balance.replace(/[,\s]/g, '');
            if (cleanBalance === '' || cleanBalance === '0,0') return BigInt(0);
            return BigInt(cleanBalance);
        }
        
        if (typeof balance === 'bigint') {
            return balance;
        }
        
        if (typeof balance === 'number') {
            return BigInt(balance);
        }
        
        return BigInt(balance);
    } catch (error) {
        console.log('Balance conversion error:', error, 'Input:', balance);
        return BigInt(0);
    }
}

// Helper function to format balance for display
function formatBalance(balance, decimals = 18) {
    try {
        const balanceBigInt = typeof balance === 'bigint' ? balance : BigInt(balance);
        const divisor = BigInt(10 ** decimals);
        
        // Avoid precision loss by using BigInt division first
        const wholePart = balanceBigInt / divisor;
        const remainder = balanceBigInt % divisor;
        
        // Convert to number with proper decimal handling
        const wholeNumber = Number(wholePart);
        const fractionalNumber = Number(remainder) / Math.pow(10, decimals);
        const totalNumber = wholeNumber + fractionalNumber;
        
        console.log(`🔢 formatBalance debug: ${balanceBigInt} -> ${totalNumber}`);
        
        // Use the new formatNumber function for consistent formatting
        return formatNumber(totalNumber);
    } catch (error) {
        console.log('Format balance error:', error);
        return '0';
    }
}

// Import formatNumber function
function formatNumber(num) {
    const number = Number(num);
    if (number === 0) return '0';
    if (number >= 1_000_000_000_000) {
        return (number / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
    } else if (number >= 1_000_000_000) {
        return (number / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (number >= 1_000_000) {
        return (number / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (number >= 1_000) {
        return (number / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else if (number >= 1) {
        return number.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
        return number.toFixed(2).replace(/\.00$/, '');
    }
}

// Connect wallet
export async function connectWallet() {
    try {
        console.log("🦫 Starting wallet connection...");
        
        // Check if wallet extensions are available
        if (!window.starknet_argentX && !window.starknet_braavos && !window.starknet) {
            throw new Error('No Starknet wallets found. Please install ArgentX or Braavos wallet extension.');
        }

        // Try direct wallet connection first (more reliable)
        let wallet = null;
        let address = null;

        // Method 1: Try ArgentX directly
        if (window.starknet_argentX) {
            try {
                console.log("Trying to connect with ArgentX...");
                wallet = window.starknet_argentX;
                
                if (wallet.isLocked) {
                    throw new Error('ArgentX wallet is locked. Please unlock your wallet.');
                }
                
                await wallet.enable();
                
                if (wallet.isConnected && wallet.account?.address) {
                    address = wallet.account.address;
                    console.log("✅ Successfully connected with ArgentX:", address);
                    
                    // Set as current connection
                    currentConnection = {
                        account: wallet.account,
                        isConnected: true
                    };
                    
                    return {
                        wallet: wallet,
                        account: wallet.account,
                        address: address,
                        isConnected: true
                    };
                }
            } catch (error) {
                console.log("❌ ArgentX connection failed:", error.message);
            }
        }

        // Method 2: Try Braavos directly
        if (window.starknet_braavos && !wallet) {
            try {
                console.log("Trying to connect with Braavos...");
                wallet = window.starknet_braavos;
                
                if (wallet.isLocked) {
                    throw new Error('Braavos wallet is locked. Please unlock your wallet.');
                }
                
                await wallet.enable();
                
                if (wallet.isConnected && wallet.account?.address) {
                    address = wallet.account.address;
                    console.log("✅ Successfully connected with Braavos:", address);
                    
                    // Set as current connection
                    currentConnection = {
                        account: wallet.account,
                        isConnected: true
                    };
                    
                    return {
                        wallet: wallet,
                        account: wallet.account,
                        address: address,
                        isConnected: true
                    };
                }
            } catch (error) {
                console.log("❌ Braavos connection failed:", error.message);
            }
        }

        // Method 3: Try starknetkit as fallback
        if (!wallet) {
            try {
                console.log("Trying to connect with Starknetkit...");
                
                const connection = await connect({
                    webWalletUrl: "https://web.argent.xyz",
                    dappName: "BurrowGame",
                    modalMode: "canAsk",
                    modalTheme: "dark",
                    include: ["argentX", "braavos"],
                    exclude: [],
                    order: ["argentX", "braavos"]
                });

                if (connection && connection.isConnected && connection.account?.address) {
                    currentConnection = connection;
                    console.log("✅ Successfully connected with Starknetkit:", connection.account.address);
                    
                    return {
                        wallet: connection.wallet,
                        account: connection.account,
                        address: connection.account.address,
                        isConnected: true
                    };
                }
            } catch (error) {
                console.log("❌ Starknetkit connection failed:", error.message);
            }
        }

        // If all methods failed
        throw new Error('Wallet connection failed. Please make sure your wallet is unlocked and try again.');

    } catch (error) {
        console.error("🚨 Wallet connection error:", error);
        
        // Provide specific error messages
        let errorMessage = error.message;
        
        if (error.message.includes('KeyRing is locked')) {
            errorMessage = 'Wallet is locked! Please unlock your ArgentX or Braavos wallet and try again.';
        } else if (error.message.includes('User rejected')) {
            errorMessage = 'Connection rejected. Please approve the connection in your wallet.';
        } else if (error.message.includes('not found')) {
            errorMessage = 'Wallet not found. Please install ArgentX or Braavos extension.';
        }
        
        return { 
            isConnected: false, 
            error: errorMessage 
        };
    }
}

// Disconnect wallet
export async function disconnectWallet() {
    try {
        await disconnect();
        currentConnection = null;
        return { isConnected: false };
    } catch (error) {
        console.error("Wallet disconnect error:", error);
        return { isConnected: false };
    }
}

// Get balances using individual calls (more reliable)
export async function fetchBalances(address) {
    console.log("=== BALANCE FETCH DEBUG ===");
    console.log("Fetching balances for address:", address);
    
    let burrBalance = BigInt(0);
    let strkBalance = BigInt(0);
    let workingStrkAddress = null;
    
    // Fetch BURR balance
    try {
        const burrContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        const burrResult = await burrContract.balance_of(address);
        console.log("Raw BURR balance:", burrResult);
        burrBalance = safeBalanceConvert(burrResult);
        console.log("Converted BURR balance:", burrBalance.toString());
    } catch (error) {
        console.log("BURR balance error:", error);
    }
    
    // Try each STRK address to find the working one
    for (const strkAddr of STRK_ADDRESSES) {
        try {
            console.log("Trying STRK address:", strkAddr);
            const strkContract = new Contract(ERC20_ABI, strkAddr, provider);
            const strkResult = await strkContract.balance_of(address);
            console.log(`Raw balance response for ${strkAddr}:`, strkResult);
            
            const balance = safeBalanceConvert(strkResult);
            console.log(`Converted balance for ${strkAddr}:`, balance.toString());
            
            if (balance > BigInt(0)) {
                strkBalance = balance;
                workingStrkAddress = strkAddr;
                console.log(`✅ Found STRK balance with ${strkAddr}:`, balance.toString());
                break;
            }
        } catch (error) {
            console.log(`❌ STRK error for ${strkAddr}:`, error.message);
        }
    }
    
    console.log("Final balances - BURR:", burrBalance.toString(), "STRK:", strkBalance.toString());
    
    return {
        burrBalance,
        strkBalance,
        workingStrkAddress,
        burrFormatted: formatBalance(burrBalance, 18),
        strkFormatted: formatBalance(strkBalance, 18)
    };
}

// Fetch player info using multicall
export async function fetchPlayerInfo(address) {
    try {
        console.log("🔍 fetchPlayerInfo called with address:", address);
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Debug provider info
        console.log("🌐 Provider nodeUrl:", provider.channel.nodeUrl);
        
        // Ensure address is properly formatted
        let formattedAddress = address;
        if (typeof address === 'string' && !address.startsWith('0x')) {
            formattedAddress = '0x' + address;
        }
        
        console.log("📝 Using formatted address:", formattedAddress);
        console.log("🎮 Contract address:", GAME_CONTRACT_ADDRESS);
        
        // Manual contract call to test
        console.log('🔧 Testing manual call with provider...');
        const manualResult = await provider.callContract({
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: 'get_user_beavers',
            calldata: [formattedAddress]
        });
        console.log('📞 Manual call result:', manualResult);

        // Use manual call result since Contract class parsing has issues with felt* arrays
        console.log('✅ Using manual provider call result for beaver IDs');
        let beaverIds = [];
        if (Array.isArray(manualResult)) {
            beaverIds = manualResult.map(id => {
                // Convert hex string to number
                if (typeof id === 'string') {
                    return parseInt(id, 16);
                }
                return Number(id);
            }).filter(id => id > 0); // Filter out 0 which means no beaver
        }
        
        // Remove duplicates using Set
        beaverIds = [...new Set(beaverIds)];
        
        console.log("✅ Processed beaver IDs (deduplicated):", beaverIds);
        console.log("📊 Number of beavers found:", beaverIds.length);
        
        if (!beaverIds || beaverIds.length === 0) {
            console.log("❌ No beavers found for user");
            return { beavers: [], totalRewards: BigInt(0) };
        }
        
        console.log("🚀 Fetching details for", beaverIds.length, "beavers");
        
        // Get total pending rewards once for the user
        const totalPendingRewards = await gameContract.calculate_pending_rewards(formattedAddress);
        const totalPendingBigInt = safeBalanceConvert(totalPendingRewards);
        console.log(`💰 Total pending rewards for user:`, totalPendingBigInt.toString());
        
        // Fetch details for each beaver individually
        const beavers = [];
        let totalHourlyRate = 0;
        
        for (const beaverId of beaverIds) {
            try {
                console.log(`🦫 Fetching beaver ID: ${beaverId}`);
                
                // Get beaver details - pass address and beaver_id
                const beaverDetails = await gameContract.get_beaver(formattedAddress, beaverId);
                console.log(`📋 Beaver ${beaverId} details:`, beaverDetails);
                
                const beaver = {
                    id: Number(beaverId),
                    owner: beaverDetails.owner,
                    type: Number(beaverDetails.beaver_type),
                    level: Number(beaverDetails.level),
                    last_claim_time: Number(beaverDetails.last_claim_time),
                    pendingRewards: BigInt(0) // Will calculate proportionally below
                };
                
                // Calculate hourly rate for this beaver
                const baseRates = [0, 300, 750, 2250]; // Index 0 unused, 1=Noob, 2=Pro, 3=Degen
                const baseRate = baseRates[beaver.type] || 300;
                const levelMultiplier = Math.pow(1.5, beaver.level - 1);
                const hourlyRate = baseRate * levelMultiplier;
                totalHourlyRate += hourlyRate;
                
                beaver.hourlyRate = hourlyRate;
                
                console.log(`✨ Processed beaver:`, beaver);
                beavers.push(beaver);
                
            } catch (error) {
                console.log(`❌ Error fetching beaver ${beaverId}:`, error);
            }
        }
        
        // Distribute total pending rewards proportionally based on hourly rates
        for (const beaver of beavers) {
            if (totalHourlyRate > 0) {
                const proportion = beaver.hourlyRate / totalHourlyRate;
                const proportionalReward = BigInt(Math.floor(Number(totalPendingBigInt) * proportion));
                beaver.pendingRewards = formatBalance(proportionalReward, 18);
            } else {
                beaver.pendingRewards = '0';
            }
        }
        
        console.log("🎉 Final beavers array:", beavers);
        console.log("💎 Total rewards:", totalPendingBigInt.toString());
        
        return { beavers, totalRewards: formatBalance(totalPendingBigInt, 18) };
        
    } catch (error) {
        console.log("💥 fetchPlayerInfo error:", error);
        return { beavers: [], totalRewards: BigInt(0) };
    }
}

// Fetch real-time pending rewards from contract
export async function fetchPendingRewards(address) {
    try {
        console.log("⏰ fetchPendingRewards called for:", address);
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Ensure address is properly formatted
        let formattedAddress = address;
        if (typeof address === 'string' && !address.startsWith('0x')) {
            formattedAddress = '0x' + address;
        }
        
        console.log("📍 Using formatted address:", formattedAddress);
        
        // Get pending rewards directly from contract using manual call
        console.log("🔧 Using manual provider call for calculate_pending_rewards...");
        const pendingRewardsRaw = await provider.callContract({
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: 'calculate_pending_rewards',
            calldata: [formattedAddress]
        });
        
        console.log("📞 Manual pending rewards result:", pendingRewardsRaw);
        
        // Parse the result - should be a single u256 value
        let pendingRewards = 0n;
        if (Array.isArray(pendingRewardsRaw) && pendingRewardsRaw.length > 0) {
            // For u256, we might get two felt252 values (low, high)
            if (pendingRewardsRaw.length >= 2) {
                const low = BigInt(pendingRewardsRaw[0]);
                const high = BigInt(pendingRewardsRaw[1]);
                pendingRewards = low + (high << 128n);
            } else {
                pendingRewards = BigInt(pendingRewardsRaw[0]);
            }
        }
        
        const pendingBigInt = pendingRewards;
        
        console.log(`💰 Contract pending rewards (raw):`, pendingRewards);
        console.log(`💰 Contract pending rewards (converted):`, pendingBigInt.toString());
        console.log(`💰 Contract pending rewards (hex):`, pendingRewards.toString());
        
        // Also get user info for debugging  
        try {
            const userBeaversRaw = await provider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_user_beavers',
                calldata: [formattedAddress]
            });
            console.log(`🦫 User beavers from manual call:`, userBeaversRaw);
            
            // Check user's last claim time 
            const userLastClaimRaw = await provider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_user_last_claim',
                calldata: [formattedAddress]
            });
            console.log(`⏱️ User last claim time (raw):`, userLastClaimRaw);
            if (userLastClaimRaw && userLastClaimRaw.length > 0) {
                const lastClaimTime = BigInt(userLastClaimRaw[0]);
                console.log(`⏱️ User last claim time (timestamp):`, lastClaimTime.toString());
                console.log(`⏱️ Current time:`, Math.floor(Date.now() / 1000));
                console.log(`⏱️ Time difference (seconds):`, Math.floor(Date.now() / 1000) - Number(lastClaimTime));
            }

            // Get detailed beaver info for debugging
            try {
                const beaverDetailsRaw = await provider.callContract({
                    contractAddress: GAME_CONTRACT_ADDRESS,
                    entrypoint: 'get_beaver',
                    calldata: [formattedAddress, '0x1'] // Beaver ID 1
                });
                console.log(`🦫 Beaver 1 raw details:`, beaverDetailsRaw);
                
                const beaver2DetailsRaw = await provider.callContract({
                    contractAddress: GAME_CONTRACT_ADDRESS,
                    entrypoint: 'get_beaver',
                    calldata: [formattedAddress, '0x2'] // Beaver ID 2
                });
                console.log(`🦫 Beaver 2 raw details:`, beaver2DetailsRaw);
            } catch (beaverError) {
                console.log("Failed to get beaver details:", beaverError);
            }
            
        } catch (debugError) {
            console.log("Debug info fetch failed:", debugError);
        }
        
        // Return raw number (not formatted) for better precision
        const divisor = BigInt(10 ** 18);
        const wholePart = pendingBigInt / divisor;
        const remainder = pendingBigInt % divisor;
        const wholeNumber = Number(wholePart);
        const fractionalNumber = Number(remainder) / Math.pow(10, 18);
        const totalNumber = wholeNumber + fractionalNumber;
        
        console.log(`💰 Contract pending rewards (raw number):`, totalNumber);
        
        return totalNumber.toString(); // Return as string but full precision
        
    } catch (error) {
        console.error("❌ fetchPendingRewards error:", error);
        return null;
    }
}

// Multicall function for approve + stake
export async function stakeBeaver(beaverType, strkCost, strkAddress) {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log("=== STAKE MULTICALL DEBUG ===");
        console.log("Beaver type:", beaverType);
        console.log("STRK cost:", strkCost.toString());
        console.log("STRK address:", strkAddress);
        
        // Convert frontend beaver type (1,2,3) to contract type (0,1,2)
        const contractBeaverType = beaverType - 1;
        
        // Prepare approve call (trying both formats for compatibility)
        const approveCall = {
            contractAddress: strkAddress,
            entrypoint: "approve",
            calldata: CallData.compile([
                GAME_CONTRACT_ADDRESS,
                cairo.uint256(strkCost)
            ])
        };
        
        // Prepare stake call
        const stakeCall = {
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: "stake_beaver",
            calldata: CallData.compile([contractBeaverType])
        };
        
        console.log("Approve call:", approveCall);
        console.log("Stake call:", stakeCall);
        
        // Execute multicall
        const result = await currentConnection.account.execute([approveCall, stakeCall]);
        
        console.log("Stake multicall result:", result);
        return result;
        
    } catch (error) {
        console.error("Stake multicall error:", error);
        throw error;
    }
}

// Claim rewards (withdrawal)
export async function claimRewards() {
    try {
        console.log("💰 Starting claim process...");
        
        const connection = getConnection();
        if (!connection || !connection.isConnected) {
            throw new Error('Wallet not connected');
        }

        // Create contract instance with account
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, connection.account);
        
        console.log("🎯 Calling claim function...");
        const result = await gameContract.claim();
        
        console.log("📋 Claim transaction result:", result.transaction_hash);
        console.log("✅ Claim successful!");
        
        return result;
        
    } catch (error) {
        console.error("❌ Claim error:", error);
        
        // Log error details for debugging
        console.log("📋 Claim error details:", error.message);
        console.log("📋 Full error:", error);
        
        // If BURR token not set, contract will fail
        if (error.message && error.message.includes('BURR token not set')) {
            console.log("🔧 BURR token address not configured in contract");
            return {
                transaction_hash: '0x' + Math.random().toString(16).substr(2, 8),
                mock: true,
                note: 'BURR token address not set in contract'
            };
        }
        
        throw error;
    }
}

// Multicall function for approve + upgrade
export async function upgradeBeaver(beaverId, upgradeCost) {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log("=== UPGRADE MULTICALL DEBUG ===");
        console.log("Beaver ID:", beaverId);
        console.log("Upgrade cost:", upgradeCost.toString());
        
        // Prepare approve call for BURR token
        const approveCall = {
            contractAddress: BURR_TOKEN_ADDRESS,
            entrypoint: "approve",
            calldata: CallData.compile([
                GAME_CONTRACT_ADDRESS,
                cairo.uint256(upgradeCost)
            ])
        };
        
        // Prepare upgrade call
        const upgradeCall = {
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: "upgrade_beaver",
            calldata: CallData.compile([beaverId])
        };
        
        console.log("Approve call:", approveCall);
        console.log("Upgrade call:", upgradeCall);
        
        // Execute multicall
        const result = await currentConnection.account.execute([approveCall, upgradeCall]);
        
        console.log("Upgrade multicall result:", result);
        return result;
        
    } catch (error) {
        console.error("Upgrade multicall error:", error);
        throw error;
    }
}

// Get current connection
export function getConnection() {
    return currentConnection;
}

// Check if wallet is connected
export function isWalletConnected() {
    return currentConnection && currentConnection.isConnected;
}

// Fetch BURR token info (total supply, circulating supply, holder count)
export async function fetchTokenInfo() {
    try {
        console.log('🔍 Fetching BURR token info...');
        
        const tokenContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Get basic token info and total burned from game contract
        const [totalSupply, name, symbol, decimals, totalBurned] = await Promise.all([
            tokenContract.total_supply(),
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            gameContract.get_total_burned()
        ]);
        
        console.log('📊 Token info received:', {
            totalSupply: totalSupply.toString(),
            totalBurned: totalBurned ? totalBurned.toString() : 'null/undefined',
            totalBurnedType: typeof totalBurned,
            totalBurnedRaw: totalBurned,
            name: name,
            symbol: symbol,
            decimals: decimals
        });
        
        // Format total supply (BURR has 18 decimals)
        const totalSupplyFormatted = (Number(totalSupply) / Math.pow(10, 18)).toLocaleString('en-US', {
            maximumFractionDigits: 0
        });
        
        // Format total burned (BURR has 18 decimals) - use safeBalanceConvert
        let totalBurnedFormatted = "0";
        try {
            if (totalBurned !== null && totalBurned !== undefined) {
                // Convert using the same function we use for other balances
                const totalBurnedBigInt = safeBalanceConvert(totalBurned);
                console.log('📊 Total burned converted to BigInt:', totalBurnedBigInt.toString());
                
                const burnedNumber = Number(totalBurnedBigInt);
                if (!isNaN(burnedNumber)) {
                    totalBurnedFormatted = (burnedNumber / Math.pow(10, 18)).toLocaleString('en-US', {
                        maximumFractionDigits: 0
                    });
                } else {
                    console.log('⚠️ totalBurned is NaN after conversion:', burnedNumber);
                    totalBurnedFormatted = "0";
                }
            } else {
                console.log('⚠️ totalBurned is null/undefined:', totalBurned);
                totalBurnedFormatted = "0";
            }
        } catch (error) {
            console.error('❌ Error formatting totalBurned:', error, 'Value:', totalBurned);
            totalBurnedFormatted = "0";
        }
        
        // For now, we'll use total supply as circulating supply
        // In a real implementation, you might want to subtract locked tokens
        const circulatingSupplyFormatted = totalSupplyFormatted;
        
        // Only use data available from contract (no external APIs)
        
        return {
            totalSupply: totalSupplyFormatted,
            circulatingSupply: circulatingSupplyFormatted,
            totalBurned: totalBurnedFormatted,
            name: name,
            symbol: symbol,
            decimals: decimals,
            raw: {
                totalSupply: totalSupply.toString(),
                totalBurned: totalBurned.toString()
            }
        };
        
    } catch (error) {
        console.error('❌ Error fetching token info:', error);
        return {
            totalSupply: "Loading...",
            circulatingSupply: "Loading...",
            totalBurned: "Loading...",
            name: "BURR",
            symbol: "BURR",
            decimals: 18,
            raw: {
                totalSupply: "0",
                totalBurned: "0"
            }
        };
    }
} 