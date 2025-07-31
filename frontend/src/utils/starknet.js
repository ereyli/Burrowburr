/* eslint-env es2020 */
/* global BigInt */
import { connect, disconnect } from "starknetkit";
import { Contract, CallData, cairo, RpcProvider } from "starknet";
import { GAME_CONTRACT_ADDRESS, BURR_TOKEN_ADDRESS, STRK_ADDRESSES, CURRENT_NETWORK, NETWORKS } from './constants.js';

// Ensure BigInt is available (should be in modern browsers)
if (typeof BigInt === 'undefined') {
    throw new Error('BigInt is not supported in this browser');
}

// RPC URLs for different networks
const RPC_URLS = {
    [NETWORKS.MAINNET]: process.env.REACT_APP_ALCHEMY_RPC_URL || "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/YOUR_API_KEY_HERE"
};

// Get current network RPC URL
const getCurrentRpcUrl = () => {
    return RPC_URLS[NETWORKS.MAINNET];
};

const provider = new RpcProvider({
    nodeUrl: getCurrentRpcUrl()
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
        "inputs": [{"name": "beaver_type", "type": "core::integer::u8"}],
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
        "inputs": [{"name": "beaver_id", "type": "core::integer::u64"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "burn_remaining",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "import_beaver",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "beaver_id", "type": "core::integer::u64"},
            {"name": "beaver_type", "type": "core::integer::u8"},
            {"name": "last_claim_time", "type": "core::integer::u64"}
        ],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_user_beavers",
        "type": "function",
        "inputs": [{"name": "owner", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::array::Array::<core::integer::u64>"}],
        "stateMutability": "view"
    },
    {
        "name": "get_user_last_claim",
        "type": "function",
        "inputs": [{"name": "owner", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::integer::u64"}],
        "stateMutability": "view"
    },
    {
        "name": "get_beaver",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "beaver_id", "type": "core::integer::u64"}
        ],
        "outputs": [{"type": "burrow_verify::BurrowGame::Beaver"}],
        "stateMutability": "view"
    },
    {
        "name": "calculate_pending_rewards",
        "type": "function",
        "inputs": [{"name": "owner", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_game_info",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "burrow_verify::BurrowGame::GameInfo"}],
        "stateMutability": "view"
    },
    {
        "name": "is_game_ended",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::bool"}],
        "stateMutability": "view"
    },
    {
        "name": "set_burr_token",
        "type": "function",
        "inputs": [{"name": "token_address", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_burr_token",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::starknet::contract_address::ContractAddress"}],
        "stateMutability": "view"
    },
    {
        "name": "set_strk_token",
        "type": "function",
        "inputs": [{"name": "token_address", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_strk_token",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::starknet::contract_address::ContractAddress"}],
        "stateMutability": "view"
    },
    {
        "name": "get_staking_costs",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "burrow_verify::BurrowGame::StakingCosts"}],
        "stateMutability": "view"
    },
    {
        "name": "withdraw_strk",
        "type": "function",
        "inputs": [{"name": "amount", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "withdraw_burr",
        "type": "function",
        "inputs": [{"name": "amount", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_contract_balances",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "(core::integer::u256, core::integer::u256)"}],
        "stateMutability": "view"
    },
    {
        "name": "fund_burr_pool",
        "type": "function",
        "inputs": [{"name": "amount", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_total_burned",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_game_analytics",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "burrow_verify::BurrowGame::GameAnalytics"}],
        "stateMutability": "view"
    },
    {
        "name": "get_user_stats",
        "type": "function",
        "inputs": [{"name": "user", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "burrow_verify::BurrowGame::UserStats"}],
        "stateMutability": "view"
    },
    {
        "name": "get_beaver_type_stats",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "(core::integer::u64, core::integer::u64, core::integer::u64)"}],
        "stateMutability": "view"
    },
    {
        "name": "get_total_claimed_burr",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_active_users_count",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u64"}],
        "stateMutability": "view"
    },
    {
        "name": "emergency_pause",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "emergency_unpause",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_emergency_status",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::bool"}],
        "stateMutability": "view"
    },
    {
        "name": "upgrade_max_pool",
        "type": "function",
        "inputs": [{"name": "new_max_pool", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_max_pool",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    }
];

let currentConnection = null;

// LocalStorage keys for wallet persistence
const WALLET_STORAGE_KEY = 'burrow_wallet_connection';
const WALLET_ADDRESS_KEY = 'burrow_wallet_address';

// Save wallet connection to localStorage
function saveWalletConnection(connection) {
    try {
        if (connection && connection.isConnected && connection.account?.address) {
            localStorage.setItem(WALLET_STORAGE_KEY, 'true');
            localStorage.setItem(WALLET_ADDRESS_KEY, connection.account.address);
            console.log('💾 Wallet connection saved to localStorage');
        }
    } catch (error) {
        console.log('❌ Failed to save wallet connection:', error);
    }
}

// Clear wallet connection from localStorage
function clearWalletConnection() {
    try {
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(WALLET_ADDRESS_KEY);
        console.log('🗑️ Wallet connection cleared from localStorage');
    } catch (error) {
        console.log('❌ Failed to clear wallet connection:', error);
    }
}

// Check if user was previously connected
export function wasWalletConnected() {
    try {
        return localStorage.getItem(WALLET_STORAGE_KEY) === 'true';
    } catch (error) {
        return false;
    }
}

// Get saved wallet address
export function getSavedWalletAddress() {
    try {
        return localStorage.getItem(WALLET_ADDRESS_KEY);
    } catch (error) {
        return null;
    }
}

// Auto-reconnect wallet on page load
export async function autoReconnectWallet() {
    console.log('🔄 Attempting auto-reconnect...');
    
    if (!wasWalletConnected()) {
        console.log('⏭️ No previous connection found, skipping auto-reconnect');
        return { isConnected: false, autoReconnect: false };
    }

    // Wait for wallet extensions to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // Check if wallet extensions are available after waiting
        if (!window.starknet_argentX && !window.starknet_braavos && !window.starknet) {
            console.log('❌ No wallet extensions found during auto-reconnect');
            
            // Wait a bit more and try again
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!window.starknet_argentX && !window.starknet_braavos && !window.starknet) {
                console.log('❌ Still no wallet extensions, clearing connection');
                clearWalletConnection();
                return { isConnected: false, autoReconnect: false };
            }
        }

        // Try ArgentX first (most common)
        if (window.starknet_argentX) {
            try {
                const wallet = window.starknet_argentX;
                
                // Wait for wallet to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try to enable the wallet first
                if (!wallet.isConnected) {
                    await wallet.enable({ showModal: false });
                }
                
                // Check if wallet is unlocked and connected
                if (!wallet.isLocked && wallet.isConnected && wallet.account?.address) {
                    console.log('✅ ArgentX auto-reconnected:', wallet.account.address);
                    
                    currentConnection = {
                        account: wallet.account,
                        wallet: wallet,
                        isConnected: true
                    };
                    
                    // Save the successful connection
                    saveWalletConnection(currentConnection);
                    
                    return {
                        wallet: wallet,
                        account: wallet.account,
                        address: wallet.account.address,
                        isConnected: true,
                        autoReconnect: true
                    };
                }
            } catch (error) {
                console.log('⚠️ ArgentX auto-reconnect failed:', error.message);
            }
        }

        // Try Braavos if ArgentX failed
        if (window.starknet_braavos) {
            try {
                const wallet = window.starknet_braavos;
                
                // Wait for wallet to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try to enable the wallet first
                if (!wallet.isConnected) {
                    await wallet.enable({ showModal: false });
                }
                
                // Check if wallet is unlocked and connected
                if (!wallet.isLocked && wallet.isConnected && wallet.account?.address) {
                    console.log('✅ Braavos auto-reconnected:', wallet.account.address);
                    
                    currentConnection = {
                        account: wallet.account,
                        wallet: wallet,
                        isConnected: true
                    };
                    
                    // Save the successful connection
                    saveWalletConnection(currentConnection);
                    
                    return {
                        wallet: wallet,
                        account: wallet.account,
                        address: wallet.account.address,
                        isConnected: true,
                        autoReconnect: true
                    };
                }
            } catch (error) {
                console.log('⚠️ Braavos auto-reconnect failed:', error.message);
            }
        }

        // Try Starknetkit silent connection
        try {
            const connection = await connect({
                webWalletUrl: "https://web.argent.xyz",
                dappName: "BurrowGame",
                modalMode: "neverAsk", // Don't show modal during auto-reconnect
                modalTheme: "dark",
                include: ["argentX", "braavos"],
                exclude: [],
                order: ["argentX", "braavos"]
            });

            if (connection && connection.isConnected && connection.account?.address) {
                currentConnection = connection;
                console.log("✅ Starknetkit auto-reconnected:", connection.account.address);
                
                return {
                    wallet: connection.wallet,
                    account: connection.account,
                    address: connection.account.address,
                    isConnected: true,
                    autoReconnect: true
                };
            }
        } catch (error) {
            console.log("⚠️ Starknetkit auto-reconnect failed:", error.message);
        }

        // If all auto-reconnect attempts failed, clear storage
        console.log('⚠️ Auto-reconnect failed, clearing saved connection');
        clearWalletConnection();
        return { isConnected: false, autoReconnect: false };

    } catch (error) {
        console.error('❌ Auto-reconnect error:', error);
        clearWalletConnection();
        return { isConnected: false, autoReconnect: false };
    }
}

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
        console.log("Starting wallet connection...");
        
        // Check if wallet extensions are available
        if (!window.starknet_argentX && !window.starknet_braavos && !window.starknet) {
            throw new Error('No Starknet wallets found. Please install ArgentX or Braavos wallet extension.');
        }

        // Method 1: Use Starknetkit modal first (better UX)
        try {
            console.log("Opening wallet selection modal...");
            
            const connection = await connect({
                webWalletUrl: "https://web.argent.xyz",
                dappName: "BurrowGame",
                modalMode: "alwaysAsk", // Always show modal for wallet selection
                modalTheme: "dark",
                include: ["argentX", "braavos"],
                exclude: [],
                order: ["argentX", "braavos"]
            });

            if (connection && connection.isConnected && connection.account?.address) {
                currentConnection = connection;
                console.log("✅ Successfully connected with Starknetkit:", connection.account.address);
                
                // Save connection to localStorage
                saveWalletConnection(connection);
                
                return {
                    wallet: connection.wallet,
                    account: connection.account,
                    address: connection.account.address,
                    isConnected: true
                };
            }
        } catch (error) {
            console.log("❌ Starknetkit modal failed or cancelled:", error.message);
            
            // Check for specific wallet lock errors
            if (error.message && (
                error.message.includes('KeyRing is locked') ||
                error.message.includes('wallet is locked') ||
                error.message.includes('chrome-extension')
            )) {
                return { 
                    isConnected: false, 
                    error: 'Wallet is locked! Please unlock your ArgentX or Braavos wallet and try again.' 
                };
            }
            
            // If modal was cancelled or failed, try direct connections silently
        }

        // Method 2: Try ArgentX directly (fallback, silent)
        if (window.starknet_argentX) {
            try {
                console.log("Trying direct ArgentX connection...");
                const wallet = window.starknet_argentX;
                
                // Skip silently if locked
                if (!wallet.isLocked) {
                    await wallet.enable();
                    
                    if (wallet.isConnected && wallet.account?.address) {
                        console.log("✅ Successfully connected with ArgentX directly:", wallet.account.address);
                        
                        currentConnection = {
                            account: wallet.account,
                            wallet: wallet,
                            isConnected: true
                        };
                        
                        // Save connection to localStorage
                        saveWalletConnection(currentConnection);
                        
                        return {
                            wallet: wallet,
                            account: wallet.account,
                            address: wallet.account.address,
                            isConnected: true
                        };
                    }
                }
            } catch (error) {
                console.log("❌ Direct ArgentX connection failed:", error.message);
                
                // Check for wallet locked errors
                if (error.message && (
                    error.message.includes('KeyRing is locked') ||
                    error.message.includes('wallet is locked') ||
                    error.message.includes('chrome-extension')
                )) {
                    return { 
                        isConnected: false, 
                        error: 'ArgentX wallet is locked! Please unlock your wallet and try again.' 
                    };
                }
            }
        }

        // Method 3: Try Braavos directly (fallback, silent)
        if (window.starknet_braavos) {
            try {
                console.log("Trying direct Braavos connection...");
                const wallet = window.starknet_braavos;
                
                // Skip silently if locked  
                if (!wallet.isLocked) {
                    await wallet.enable();
                    
                    if (wallet.isConnected && wallet.account?.address) {
                        console.log("✅ Successfully connected with Braavos directly:", wallet.account.address);
                        
                        currentConnection = {
                            account: wallet.account,
                            wallet: wallet,
                            isConnected: true
                        };
                        
                        // Save connection to localStorage
                        saveWalletConnection(currentConnection);
                        
                        return {
                            wallet: wallet,
                            account: wallet.account,
                            address: wallet.account.address,
                            isConnected: true
                        };
                    }
                }
            } catch (error) {
                console.log("❌ Direct Braavos connection failed:", error.message);
                
                // Check for wallet locked errors
                if (error.message && (
                    error.message.includes('KeyRing is locked') ||
                    error.message.includes('wallet is locked') ||
                    error.message.includes('chrome-extension')
                )) {
                    return { 
                        isConnected: false, 
                        error: 'Braavos wallet is locked! Please unlock your wallet and try again.' 
                    };
                }
            }
        }

        // Check if wallets exist
        let hasWallets = false;
        
        if (window.starknet_argentX) {
            hasWallets = true;
        }
        
        if (window.starknet_braavos) {
            hasWallets = true;
        }
        
        // Only throw error if no wallets are found
        if (!hasWallets) {
            throw new Error('No Starknet wallets found. Please install ArgentX or Braavos wallet extension.');
        } else {
            // If wallets exist but connection failed (maybe locked), return silent failure
            console.log("⚠️ No wallets could be connected (possibly locked or user cancelled)");
            return { 
                isConnected: false, 
                error: null // Silent failure - no error message to user
            };
        }

    } catch (error) {
        console.error("🚨 Wallet connection error:", error);
        
        // Don't propagate uncaught errors - return controlled error response
        let errorMessage = error.message;
        
        if (error.message.includes('KeyRing is locked') || error.message.includes('locked')) {
            errorMessage = 'Wallet is locked! Please unlock your ArgentX or Braavos wallet and try again.';
        } else if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            errorMessage = 'Connection rejected. Please approve the connection in your wallet.';
        } else if (error.message.includes('not found') || error.message.includes('install')) {
            errorMessage = 'Wallet not found. Please install ArgentX or Braavos extension.';
        } else if (error.message.includes('Failed to connect to MetaMask')) {
            errorMessage = 'Wallet connection failed. Please make sure your wallet is unlocked and try again.';
        }
        
        // Return error response instead of throwing
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
        
        // Clear saved connection from localStorage
        clearWalletConnection();
        
        return { isConnected: false };
    } catch (error) {
        console.error("Wallet disconnect error:", error);
        
        // Clear saved connection even on error
        clearWalletConnection();
        
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
        
        // Ensure address is properly formatted
        let formattedAddress = address;
        if (typeof address === 'string' && !address.startsWith('0x')) {
            formattedAddress = '0x' + address;
        }
        
        console.log("📋 Formatted address:", formattedAddress);
        
        // Try contract method first, fallback to manual call
        let manualResult;
        try {
            console.log("📋 Trying contract method get_user_beavers...");
            manualResult = await gameContract.get_user_beavers(formattedAddress);
            console.log("📋 Contract method result:", manualResult);
        } catch (contractError) {
            console.log("📋 Contract method failed, trying manual call...", contractError.message);
            // Fallback to manual contract call
            manualResult = await provider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_user_beavers',
                calldata: [formattedAddress]
            });
            console.log("📋 Manual call result:", manualResult);
        }

        // Parse the result - handle different response formats
        let beaverIds = [];
        
        console.log("📋 Manual result type:", typeof manualResult);
        console.log("📋 Manual result keys:", manualResult ? Object.keys(manualResult) : 'null');
        
        // Case 1: Direct array response (most common for felt*)
        if (Array.isArray(manualResult)) {
            console.log("📋 Processing as array");
            beaverIds = manualResult.map(id => {
                // Handle different data types: string, number, BigInt
                if (typeof id === 'string') {
                    let numValue;
                    // If it starts with 0x, it's hex
                    if (id.startsWith('0x')) {
                        numValue = parseInt(id, 16);
                    } else {
                        // Try decimal first
                        numValue = parseInt(id, 10);
                        // If decimal parsing fails or gives 0/NaN, try hex
                        if (isNaN(numValue) || numValue === 0) {
                            numValue = parseInt(id, 16);
                        }
                    }
                    console.log(`📋 Converting string ${id} to number ${numValue}`);
                    return numValue;
                } else if (typeof id === 'bigint') {
                    const numValue = Number(id);
                    console.log(`📋 Converting BigInt ${id} to number ${numValue}`);
                    return numValue;
                } else {
                    console.log(`📋 Using number directly: ${id}`);
                    return Number(id);
                }
            }).filter(id => id > 0); // Filter out 0 which means no beaver
        }
        // Case 2: Object with beaver_ids property
        else if (manualResult && manualResult.beaver_ids) {
            console.log("📋 Processing as object with beaver_ids");
            if (Array.isArray(manualResult.beaver_ids)) {
                beaverIds = manualResult.beaver_ids.map(id => {
                    if (typeof id === 'string') {
                        // If it starts with 0x, it's hex
                        if (id.startsWith('0x')) {
                            return parseInt(id, 16);
                        } else {
                            // Try decimal first
                            const numValue = parseInt(id, 10);
                            return isNaN(numValue) ? parseInt(id, 16) : numValue;
                        }
                    }
                    return Number(id);
                }).filter(id => id > 0);
            }
        }
        // Case 3: Object with numeric keys (felt* format)
        else if (manualResult && typeof manualResult === 'object') {
            console.log("📋 Processing as object with numeric keys");
            // Try to extract numeric values from object
            for (let key in manualResult) {
                const value = manualResult[key];
                console.log(`📋 Key: ${key}, Value: ${value}, Type: ${typeof value}`);
                
                if (typeof value === 'string' && /^[0-9a-fA-F]+$/.test(value)) {
                    const numValue = parseInt(value, 16);
                    console.log(`📋 Converting hex string ${value} to number ${numValue}`);
                    if (numValue > 0) {
                        beaverIds.push(numValue);
                    }
                } else if (typeof value === 'number' && value > 0) {
                    console.log(`📋 Adding number directly: ${value}`);
                    beaverIds.push(value);
                } else if (typeof value === 'string' && /^\d+$/.test(value)) {
                    const numValue = parseInt(value, 10);
                    console.log(`📋 Converting decimal string ${value} to number ${numValue}`);
                    if (numValue > 0) {
                        beaverIds.push(numValue);
                    }
                }
            }
        }
        // Case 4: Single value (if only one beaver)
        else if (manualResult && (typeof manualResult === 'string' || typeof manualResult === 'number')) {
            console.log("📋 Processing as single value");
            let numValue;
            if (typeof manualResult === 'string') {
                // If it starts with 0x, it's hex
                if (manualResult.startsWith('0x')) {
                    numValue = parseInt(manualResult, 16);
                } else {
                    // Try decimal first
                    numValue = parseInt(manualResult, 10);
                    if (isNaN(numValue)) {
                        numValue = parseInt(manualResult, 16);
                    }
                }
            } else {
                numValue = Number(manualResult);
            }
            if (numValue > 0) {
                beaverIds.push(numValue);
            }
        }
        
        console.log("📋 Parsed beaver IDs:", beaverIds);
        
        // Remove duplicates and filter valid IDs
        beaverIds = [...new Set(beaverIds)].filter(id => {
            const isValid = id > 0 && id < 1000000; // Reasonable range
            if (!isValid) {
                console.log(`📋 Filtering out invalid beaver ID: ${id}`);
            }
            return isValid;
        });
        
        console.log("📋 Final beaver IDs (after deduplication and filtering):", beaverIds);
        console.log("📋 User address:", formattedAddress);
        console.log("📋 Number of beavers found:", beaverIds.length);
        
        if (!beaverIds || beaverIds.length === 0) {
            console.log("📋 No beavers found for user");
            return { beavers: [], totalRewards: BigInt(0) };
        }
        
        // Get total pending rewards once for the user
        const totalPendingRewards = await gameContract.calculate_pending_rewards(formattedAddress);
        const totalPendingBigInt = safeBalanceConvert(totalPendingRewards);
        
        console.log("📋 Total pending rewards:", totalPendingBigInt.toString());
        
        // Fetch details for each beaver individually
        const beavers = [];
        let totalHourlyRate = 0;
        
        for (const beaverId of beaverIds) {
            try {
                console.log(`📋 Fetching details for beaver ${beaverId}...`);
                
                // Get beaver details - pass address and beaver_id
                let beaverDetails;
                try {
                    beaverDetails = await gameContract.get_beaver(formattedAddress, beaverId);
                    console.log(`📋 Beaver ${beaverId} details (contract method):`, beaverDetails);
                } catch (contractError) {
                    console.log(`📋 Contract method failed for beaver ${beaverId}, trying manual call...`);
                    
                    // Check if it's a "Not beaver owner" error from contract method
                    if (contractError.message && contractError.message.includes('Not beaver owner')) {
                        console.log(`📋 Skipping beaver ${beaverId} - not owned by user (from contract method)`);
                        continue; // Skip this beaver entirely
                    }
                    
                    // Try manual call
                    try {
                        const manualBeaverResult = await provider.callContract({
                            contractAddress: GAME_CONTRACT_ADDRESS,
                            entrypoint: 'get_beaver',
                            calldata: [formattedAddress, beaverId.toString()]
                        });
                        console.log(`📋 Manual beaver ${beaverId} result:`, manualBeaverResult);
                        
                        // Convert manual result to expected format
                        if (Array.isArray(manualBeaverResult) && manualBeaverResult.length >= 5) {
                            beaverDetails = {
                                id: manualBeaverResult[0],
                                beaver_type: manualBeaverResult[1],
                                level: manualBeaverResult[2],
                                last_claim_time: manualBeaverResult[3],
                                owner: manualBeaverResult[4]
                            };
                        } else {
                            // If manual result is not in expected format, try to parse it differently
                            console.log(`📋 Manual result format unexpected, trying alternative parsing...`);
                            beaverDetails = {
                                id: beaverId,
                                beaver_type: 0,
                                level: 1,
                                last_claim_time: 0,
                                owner: formattedAddress
                            };
                        }
                    } catch (manualError) {
                        console.error(`❌ Manual beaver ${beaverId} error:`, manualError);
                        
                        // Check if it's a "Not beaver owner" error
                        if (manualError.message && manualError.message.includes('Not beaver owner')) {
                            console.log(`📋 Skipping beaver ${beaverId} - not owned by user (from manual call)`);
                            continue; // Skip this beaver entirely
                        }
                        
                        // Use default values only for other types of errors
                        beaverDetails = {
                            id: beaverId,
                            beaver_type: 0,
                            level: 1,
                            last_claim_time: 0,
                            owner: formattedAddress
                        };
                        console.log(`📋 Using default values for beaver ${beaverId}:`, beaverDetails);
                    }
                }
                
                // Handle different response formats
                let beaver = {
                    id: Number(beaverId),
                    owner: '',
                    type: 0,
                    level: 1,
                    last_claim_time: 0,
                    pendingRewards: BigInt(0) // Will calculate proportionally below
                };
                
                // Case 1: Direct object response
                if (beaverDetails && typeof beaverDetails === 'object') {
                    beaver.owner = beaverDetails.owner || '';
                    beaver.type = Number(beaverDetails.beaver_type || 0);
                    beaver.level = Number(beaverDetails.level || 1);
                    beaver.last_claim_time = Number(beaverDetails.last_claim_time || 0);
                }
                // Case 2: Array response [id, type, level, last_claim_time, owner]
                else if (Array.isArray(beaverDetails) && beaverDetails.length >= 5) {
                    beaver.type = Number(beaverDetails[1] || 0);
                    beaver.level = Number(beaverDetails[2] || 1);
                    beaver.last_claim_time = Number(beaverDetails[3] || 0);
                    beaver.owner = beaverDetails[4] || '';
                }
                // Case 3: Manual call if contract method fails
                else {
                    try {
                        const manualBeaverResult = await provider.callContract({
                            contractAddress: GAME_CONTRACT_ADDRESS,
                            entrypoint: 'get_beaver',
                            calldata: [formattedAddress, beaverId.toString()]
                        });
                        console.log(`📋 Manual beaver ${beaverId} result:`, manualBeaverResult);
                        
                        if (Array.isArray(manualBeaverResult) && manualBeaverResult.length >= 5) {
                            beaver.type = Number(manualBeaverResult[1] || 0);
                            beaver.level = Number(manualBeaverResult[2] || 1);
                            beaver.last_claim_time = Number(manualBeaverResult[3] || 0);
                            beaver.owner = manualBeaverResult[4] || '';
                        }
                    } catch (manualError) {
                        console.error(`❌ Manual beaver ${beaverId} error:`, manualError);
                        // Skip this beaver if it's not owned by the user
                        continue;
                    }
                }
                
                // Verify beaver ownership - but be more flexible
                const beaverOwner = beaver.owner || '';
                const isOwnedByUser = beaverOwner === formattedAddress || beaverOwner === '' || !beaverOwner;
                
                console.log(`📋 Beaver ${beaverId} owner: ${beaverOwner}, User: ${formattedAddress}, IsOwned: ${isOwnedByUser}`);
                
                if (!isOwnedByUser) {
                    console.log(`📋 Skipping beaver ${beaverId} - not owned by user`);
                    continue;
                }
                
                console.log(`📋 Processing beaver ${beaverId} for user ${formattedAddress}`);
                console.log(`📋 Beaver details:`, beaver);
                
                // Calculate hourly rate for this beaver (matching contract logic)
                const baseRates = [300, 750, 2250]; // Noob=0, Pro=1, Degen=2
                const baseRate = baseRates[beaver.type] || 300;
                
                // Level multipliers matching contract (basis points)
                const levelMultipliers = [1000, 1500, 2250, 3375, 5062]; // Level 1-5
                const levelMultiplier = levelMultipliers[beaver.level - 1] || 1000;
                
                const hourlyRate = (baseRate * levelMultiplier) / 1000; // Convert from basis points
                totalHourlyRate += hourlyRate;
                
                beaver.hourlyRate = hourlyRate;
                
                console.log(`📋 Beaver ${beaverId} processed:`, beaver);
                
                beavers.push(beaver);
                
            } catch (error) {
                console.error(`❌ Error fetching beaver ${beaverId}:`, error);
                // Skip this beaver if there's an error (likely "Not beaver owner")
                continue;
            }
        }
        
        console.log("📋 Total hourly rate:", totalHourlyRate);
        
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
        
        console.log("📋 Final beavers array:", beavers);
        
        return { beavers, totalRewards: formatBalance(totalPendingBigInt, 18) };
        
    } catch (error) {
        console.log("💥 fetchPlayerInfo error:", error);
        return { beavers: [], totalRewards: BigInt(0) };
    }
}

// Fetch real-time pending rewards from contract
export async function fetchPendingRewards(address) {
    try {
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Ensure address is properly formatted
        let formattedAddress = address;
        if (typeof address === 'string' && !address.startsWith('0x')) {
            formattedAddress = '0x' + address;
        }
        
        // Get pending rewards directly from contract using manual call
        const pendingRewardsRaw = await provider.callContract({
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: 'calculate_pending_rewards',
            calldata: [formattedAddress]
        });
        
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
        
        // Return raw number (not formatted) for better precision
        const divisor = BigInt(10 ** 18);
        const wholePart = pendingBigInt / divisor;
        const remainder = pendingBigInt % divisor;
        const wholeNumber = Number(wholePart);
        const fractionalNumber = Number(remainder) / Math.pow(10, 18);
        const totalNumber = wholeNumber + fractionalNumber;
        
        return totalNumber;
        
    } catch (error) {
        console.error('❌ Error fetching pending rewards:', error);
        return 0;
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
        console.log("Starting claim process...");
        
        const connection = getConnection();
        if (!connection || !connection.isConnected) {
            throw new Error('Wallet not connected');
        }

        // Create contract instance with account
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, connection.account);
        
        console.log("Calling claim function...");
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
        
        // Execute multicall
        const result = await currentConnection.account.execute([approveCall, upgradeCall]);
        
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

// Monitor wallet connection changes
let connectionMonitor = null;

// Start monitoring wallet connection
export function startConnectionMonitor(onDisconnect) {
    if (connectionMonitor) {
        clearInterval(connectionMonitor);
    }
    
    connectionMonitor = setInterval(async () => {
        if (currentConnection && currentConnection.isConnected) {
            try {
                // Check ArgentX
                if (window.starknet_argentX && currentConnection.wallet === window.starknet_argentX) {
                    if (window.starknet_argentX.isLocked || !window.starknet_argentX.isConnected) {
                        console.log('⚠️ ArgentX connection lost');
                        currentConnection = null;
                        clearWalletConnection();
                        if (onDisconnect) onDisconnect();
                        return;
                    }
                }
                
                // Check Braavos
                if (window.starknet_braavos && currentConnection.wallet === window.starknet_braavos) {
                    if (window.starknet_braavos.isLocked || !window.starknet_braavos.isConnected) {
                        console.log('⚠️ Braavos connection lost');
                        currentConnection = null;
                        clearWalletConnection();
                        if (onDisconnect) onDisconnect();
                        return;
                    }
                }
            } catch (error) {
                console.log('❌ Connection monitor error:', error);
            }
        }
    }, 5000); // Check every 5 seconds
}

// Stop monitoring wallet connection
export function stopConnectionMonitor() {
    if (connectionMonitor) {
        clearInterval(connectionMonitor);
        connectionMonitor = null;
    }
}

// Enhanced connection persistence
export function maintainConnection() {
    // Listen for wallet events
    if (window.starknet_argentX) {
        try {
            window.starknet_argentX.on('accountsChanged', (accounts) => {
                console.log('ArgentX accounts changed:', accounts);
                if (!accounts || accounts.length === 0) {
                    currentConnection = null;
                    clearWalletConnection();
                }
            });
            
            window.starknet_argentX.on('networkChanged', (network) => {
                console.log('ArgentX network changed:', network);
            });
        } catch (error) {
            console.log('⚠️ Could not set up ArgentX listeners:', error);
        }
    }
    
    if (window.starknet_braavos) {
        try {
            window.starknet_braavos.on('accountsChanged', (accounts) => {
                console.log('Braavos accounts changed:', accounts);
                if (!accounts || accounts.length === 0) {
                    currentConnection = null;
                    clearWalletConnection();
                }
            });
            
            window.starknet_braavos.on('networkChanged', (network) => {
                console.log('Braavos network changed:', network);
            });
        } catch (error) {
            console.log('⚠️ Could not set up Braavos listeners:', error);
        }
    }
}

// Test function to check beaver import status
export async function testBeaverImport(address) {
    try {
        console.log("🧪 Testing beaver import for address:", address);
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Ensure address is properly formatted
        let formattedAddress = address;
        if (typeof address === 'string' && !address.startsWith('0x')) {
            formattedAddress = '0x' + address;
        }
        
        console.log("🧪 Testing with address:", formattedAddress);
        console.log("🧪 Contract address:", GAME_CONTRACT_ADDRESS);
        
        // Test 1: Check if user has any beavers using manual call
        try {
            const manualResult = await provider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_user_beavers',
                calldata: [formattedAddress]
            });
            console.log("🧪 Manual get_user_beavers result:", manualResult);
        } catch (error) {
            console.log("🧪 Manual get_user_beavers error:", error.message);
        }
        
        // Test 2: Try contract method
        try {
            const beaverIds = await gameContract.get_user_beavers(formattedAddress);
            console.log("🧪 Contract get_user_beavers result:", beaverIds);
        } catch (error) {
            console.log("🧪 Contract get_user_beavers error:", error.message);
        }
        
        // Test 3: Check specific beaver IDs that should be imported
        const testBeaverIds = [1, 2, 3, 4, 5]; // Common beaver IDs to test
        
        for (const testId of testBeaverIds) {
            try {
                const beaverDetails = await gameContract.get_beaver(formattedAddress, testId);
                console.log(`🧪 Beaver ${testId} details:`, beaverDetails);
            } catch (error) {
                console.log(`🧪 Beaver ${testId} not found or error:`, error.message);
            }
        }
        
        // Test 4: Check pending rewards
        try {
            const pendingRewards = await gameContract.calculate_pending_rewards(formattedAddress);
            console.log("🧪 Pending rewards:", pendingRewards);
        } catch (error) {
            console.log("🧪 Pending rewards error:", error.message);
        }
        
        // Test 5: Check game info
        try {
            const gameInfo = await gameContract.get_game_info();
            console.log("🧪 Game info:", gameInfo);
        } catch (error) {
            console.log("🧪 Game info error:", error.message);
        }
        
        return {
            success: true,
            message: "Test completed - check console for details"
        };
        
    } catch (error) {
        console.error("🧪 Test error:", error);
        return { error: error.message };
    }
}

// Fetch BURR token info (total supply, circulating supply, holder count)
export async function fetchTokenInfo() {
    try {
        console.log('🔍 Fetching BURR token info...');
        
        const tokenContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        
        // Get basic token info and total burned from game contract
        const [actualTotalSupply, name, symbol, decimals, totalBurned] = await Promise.all([
            tokenContract.total_supply(),
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            gameContract.get_total_burned()
        ]);
        
        console.log('📊 Token info received:', {
            actualTotalSupply: actualTotalSupply.toString(),
            totalBurned: totalBurned ? totalBurned.toString() : 'null/undefined',
            totalBurnedType: typeof totalBurned,
            totalBurnedRaw: totalBurned,
            name: name,
            symbol: symbol,
            decimals: decimals
        });
        
        // Fixed total supply: 2.1 billion BURR (always constant)
        const FIXED_TOTAL_SUPPLY = "2,100,000,000";
        
        // Format total burned (BURR has 18 decimals) - use safeBalanceConvert
        let totalBurnedFormatted = "0";
        let totalBurnedNumber = 0;
        
        try {
            if (totalBurned !== null && totalBurned !== undefined) {
                // Convert using the same function we use for other balances
                const totalBurnedBigInt = safeBalanceConvert(totalBurned);
                console.log('📊 Total burned converted to BigInt:', totalBurnedBigInt.toString());
                
                totalBurnedNumber = Number(totalBurnedBigInt) / Math.pow(10, 18);
                if (!isNaN(totalBurnedNumber)) {
                    totalBurnedFormatted = totalBurnedNumber.toLocaleString('en-US', {
                        maximumFractionDigits: 0
                    });
                } else {
                    console.log('⚠️ totalBurned is NaN after conversion:', totalBurnedNumber);
                    totalBurnedFormatted = "0";
                    totalBurnedNumber = 0;
                }
            } else {
                console.log('⚠️ totalBurned is null/undefined:', totalBurned);
                totalBurnedFormatted = "0";
                totalBurnedNumber = 0;
            }
        } catch (error) {
            console.error('❌ Error formatting totalBurned:', error, 'Value:', totalBurned);
            totalBurnedFormatted = "0";
            totalBurnedNumber = 0;
        }
        
        // Circulating supply: Actual minted tokens from contract
        const actualTotalSupplyNumber = Number(actualTotalSupply) / Math.pow(10, 18);
        const circulatingSupplyFormatted = actualTotalSupplyNumber.toLocaleString('en-US', {
            maximumFractionDigits: 0
        });
        
        // Only use data available from contract (no external APIs)
        
        return {
            totalSupply: FIXED_TOTAL_SUPPLY,
            circulatingSupply: circulatingSupplyFormatted,
            totalBurned: totalBurnedFormatted,
            name: name,
            symbol: symbol,
            decimals: decimals,
            raw: {
                totalSupply: "2100000000000000000000000000", // 2.1B max supply in wei
                actualTotalSupply: actualTotalSupply.toString(), // Actual minted supply
                totalBurned: totalBurned?.toString() || "0"
            }
        };
        
    } catch (error) {
        console.error('❌ Error fetching token info:', error);
        return {
            totalSupply: "2,100,000,000",
            circulatingSupply: "Loading...",
            totalBurned: "Loading...",
            name: "BURR",
            symbol: "BURR",
            decimals: 18,
            raw: {
                totalSupply: "2100000000000000000000000000", // 2.1B max supply in wei
                actualTotalSupply: "0", // Actual minted supply
                totalBurned: "0"
            }
        };
    }
} 