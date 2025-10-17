/* eslint-env es2020 */
/* global BigInt */
import { connect, disconnect } from "starknetkit";
import { Contract, CallData, cairo, RpcProvider, CairoUint256 } from "starknet";
import { GAME_CONTRACT_ADDRESS, BURR_TOKEN_ADDRESS, BURR_STAKING_ADDRESS, STRK_ADDRESSES, CURRENT_NETWORK, NETWORKS } from './constants.js';

// Ensure BigInt is available (should be in modern browsers)
if (typeof BigInt === 'undefined') {
    throw new Error('BigInt is not supported in this browser');
}

// RPC URLs for different networks
const RPC_URLS = {
    [NETWORKS.MAINNET]: [
        "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/EXk1VtDVCaeNBRAWsi7WA"
    ],
    [NETWORKS.SEPOLIA]: [
        "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/EXk1VtDVCaeNBRAWsi7WA"
    ]
};

// Get current network RPC URLs
const getCurrentRpcUrls = () => {
    return RPC_URLS[CURRENT_NETWORK] || RPC_URLS[NETWORKS.MAINNET];
};

// Create provider with single endpoint
let provider = null;

const createProvider = () => {
    const urls = getCurrentRpcUrls();
    const url = urls[0]; // Use only the first (and only) endpoint
    
    try {
        console.log(`🔄 Using RPC endpoint: ${url}`);
        return new RpcProvider({
            nodeUrl: url,
            // Use latest block instead of pending to avoid block id errors
            blockIdentifier: 'latest',
            // Additional settings to avoid block id errors
            default: 'latest'
        });
    } catch (error) {
        console.error(`❌ Failed to create provider:`, error);
        return null;
    }
};

// Initialize provider
provider = createProvider();

// Helper function to convert uint256 to BigInt
function uint256ToBigInt(uint256) {
    if (!uint256) return BigInt(0);
    
    // If it's already a BigInt, return it
    if (typeof uint256 === 'bigint') return uint256;
    
    // If it's a string, try to parse it
    if (typeof uint256 === 'string') {
        return BigInt(uint256);
    }
    
    // If it's an object with low and high properties (Cairo uint256)
    if (uint256.low !== undefined && uint256.high !== undefined) {
        return (BigInt(uint256.high) << 128n) + BigInt(uint256.low);
    }
    
    // If it's a number, convert to BigInt
    if (typeof uint256 === 'number') {
        return BigInt(uint256);
    }
    
    // Default fallback
    return BigInt(0);
}

// Wrapper function for RPC calls with retry
const executeWithRetry = async (operation, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (!provider) {
                provider = createProvider();
                if (!provider) {
                    throw new Error('RPC provider unavailable');
                }
            }
            
            return await operation(provider);
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ RPC attempt ${attempt + 1} failed:`, error.message);
            
            // For any error, try to recreate provider
            if (attempt < maxRetries - 1) {
                console.log(`🔄 Recreating RPC provider...`);
                provider = createProvider();
                
                if (!provider) {
                    throw new Error('RPC provider unavailable');
                }
            }
        }
    }
    
    throw lastError || new Error('All RPC attempts failed');
};

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
    },
    {
        "name": "get_game_info",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "game_info", "type": "felt*"}],
        "stateMutability": "view"
    },
    {
        "name": "get_staking_costs", 
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "costs", "type": "felt*"}],
        "stateMutability": "view"
    },
    {
        "name": "get_game_analytics",
        "type": "function", 
        "inputs": [],
        "outputs": [{"name": "analytics", "type": "felt*"}],
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
        "outputs": [{"name": "is_paused", "type": "felt"}],
        "stateMutability": "view"
    },
    {
        "name": "import_beaver",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "felt"},
            {"name": "beaver_id", "type": "felt"},
            {"name": "beaver_type", "type": "felt"},
            {"name": "last_claim_time", "type": "felt"}
        ],
        "outputs": [],
        "stateMutability": "external"
    }
];

// BURR Staking Contract ABI
const BURR_STAKING_ABI = [
    {
        "name": "stake",
        "type": "function",
        "inputs": [{"name": "amount", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "unstake", 
        "type": "function",
        "inputs": [{"name": "amount", "type": "core::integer::u256"}],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "claim_rewards",
        "type": "function", 
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
    },
    {
        "name": "get_staking_position",
        "type": "function",
        "inputs": [{"name": "user", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "burrow_verify::BURRStaking::StakingPosition"}],
        "stateMutability": "view"
    },
    {
        "name": "get_pending_rewards", 
        "type": "function",
        "inputs": [{"name": "user", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_total_staked",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_user_staked_amount",
        "type": "function", 
        "inputs": [{"name": "user", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "get_staking_pool_info",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "burrow_verify::BURRStaking::StakingPool"}],
        "stateMutability": "view"
    },
    {
        "name": "get_unstake_request",
        "type": "function",
        "inputs": [{"name": "user", "type": "core::starknet::contract_address::ContractAddress"}],
        "outputs": [{"type": "(core::integer::u256, core::integer::u64, core::integer::u64)"}],
        "stateMutability": "view"
    },
    {
        "name": "get_reward_pool_balance",
        "type": "function",
        "inputs": [],
        "outputs": [{"type": "core::integer::u256"}],
        "stateMutability": "view"
    },
    {
        "name": "withdraw_unstaked",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "external"
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
            
            // Save wallet type for reconnection
            const walletType = connection.walletType || connection.wallet?.id || 'unknown';
            localStorage.setItem('burrowgame_wallet_type', walletType);
            
            console.log('💾 Wallet connection saved to localStorage');
        }
    } catch (error) {
        console.log('❌ Failed to save wallet connection:', error);
    }
}

function getSavedWalletConnection() {
    try {
        const walletType = localStorage.getItem('burrowgame_wallet_type');
        const address = localStorage.getItem(WALLET_ADDRESS_KEY);
        
        if (walletType && address) {
            const connection = {
                walletType: walletType,
                address: address
            };
            console.log('📋 Retrieved saved wallet connection:', connection);
            return connection;
        }
    } catch (error) {
        console.error('❌ Failed to get saved wallet connection:', error);
    }
    return null;
}

// Clear wallet connection from localStorage
function clearWalletConnection() {
    try {
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(WALLET_ADDRESS_KEY);
        localStorage.removeItem('burrowgame_wallet_type');
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
    
    // Check if user recently disconnected (don't auto-reconnect if they did)
    const lastDisconnectTime = localStorage.getItem('lastDisconnectTime');
    const currentTime = Date.now();
    const disconnectThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (lastDisconnectTime && (currentTime - parseInt(lastDisconnectTime)) < disconnectThreshold) {
        console.log('⚠️ User recently disconnected, skipping auto-reconnect');
        return { isConnected: false, autoReconnect: false };
    }
    
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

        // Get saved wallet type to try reconnecting to the same wallet
        const savedConnection = getSavedWalletConnection();
        let reconnected = false;

        // Try to reconnect to the previously used wallet
        if (savedConnection && savedConnection.walletType) {
            console.log('🔄 Attempting to reconnect to:', savedConnection.walletType);
            
            try {
                if (savedConnection.walletType === 'argentX' && window.starknet_argentX) {
                    const wallet = window.starknet_argentX;
                    
                    // Wait for wallet to initialize
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Check if wallet is locked first
                    if (wallet.isLocked) {
                        console.log('⚠️ ArgentX is locked, skipping auto-reconnect');
                        return { isConnected: false, autoReconnect: false };
                    }
                    
                    // Try to enable the wallet silently
                    if (!wallet.isConnected) {
                        await wallet.enable({ showModal: false });
                    }
                    
                    // Check if wallet is connected
                    if (wallet.isConnected && wallet.account?.address) {
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
                } else if (savedConnection.walletType === 'braavos' && window.starknet_braavos) {
                    const wallet = window.starknet_braavos;
                    
                    // Wait for wallet to initialize
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Check if wallet is locked first
                    if (wallet.isLocked) {
                        console.log('⚠️ Braavos is locked, skipping auto-reconnect');
                        return { isConnected: false, autoReconnect: false };
                    }
                    
                    // Try to enable the wallet silently
                    if (!wallet.isConnected) {
                        await wallet.enable({ showModal: false });
                    }
                    
                    // Check if wallet is connected
                    if (wallet.isConnected && wallet.account?.address) {
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
                }
            } catch (error) {
                console.log('⚠️ Auto-reconnect failed:', error.message);
                
                // Check for specific lock errors
                if (error.message && (
                    error.message.includes('KeyRing is locked') ||
                    error.message.includes('wallet is locked') ||
                    error.message.includes('locked')
                )) {
                    console.log('⚠️ Wallet is locked, skipping auto-reconnect');
                    return { isConnected: false, autoReconnect: false };
                }
            }
        }

        // If auto-reconnect failed, clear storage and return
        console.log('⚠️ Auto-reconnect failed, clearing saved connection');
        clearWalletConnection();
        return { isConnected: false, autoReconnect: false };

    } catch (error) {
        console.error('❌ Auto-reconnect error:', error);
        
        // Check for specific lock errors
        if (error.message && (
            error.message.includes('KeyRing is locked') ||
            error.message.includes('wallet is locked') ||
            error.message.includes('locked')
        )) {
            console.log('⚠️ Wallet is locked, clearing connection');
            clearWalletConnection();
            return { isConnected: false, autoReconnect: false };
        }
        
        clearWalletConnection();
        return { isConnected: false, autoReconnect: false };
    }
}

// Helper function to safely convert balance
function safeBalanceConvert(balance) {
    try {
        if (!balance) {
            console.log('⚠️ No balance provided, returning 0');
            return BigInt(0);
        }
        
        console.log('🔄 Converting balance:', balance, 'Type:', typeof balance);
        
        // Handle different response formats
        if (typeof balance === 'object') {
            // Log object details for debugging
            console.log('📦 Object keys:', Object.keys(balance));
            console.log('📦 Object values:', Object.values(balance));
            
            // Case 1: {balance: BigInt}
            if (balance.balance !== undefined) {
                console.log('✅ Found balance.balance:', balance.balance);
                return BigInt(balance.balance);
            }
            
            // Case 2: Uint256 format {low, high}
            if (balance.low !== undefined && balance.high !== undefined) {
                console.log('✅ Found Uint256 format - low:', balance.low, 'high:', balance.high);
                const result = BigInt(balance.low) + (BigInt(balance.high) << BigInt(128));
                console.log('✅ Uint256 result:', result.toString());
                return result;
            }
            
            // Case 3: Array format [low, high]
            if (Array.isArray(balance) && balance.length >= 2) {
                console.log('✅ Found array format - [0]:', balance[0], '[1]:', balance[1]);
                const result = BigInt(balance[0]) + (BigInt(balance[1]) << BigInt(128));
                console.log('✅ Array result:', result.toString());
                return result;
            }
            
            // Case 4: Single item array
            if (Array.isArray(balance) && balance.length === 1) {
                console.log('✅ Found single item array:', balance[0]);
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
            console.log('✅ Found BigInt balance:', balance.toString());
            return balance;
        }
        
        if (typeof balance === 'number') {
            console.log('✅ Found number balance:', balance);
            return BigInt(balance);
        }
        
        console.log('⚠️ Unknown balance format, attempting BigInt conversion:', balance);
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
        console.log("🔍 Checking wallet extensions...");
        console.log("window.starknet_argentX:", !!window.starknet_argentX);
        console.log("window.starknet_braavos:", !!window.starknet_braavos);
        console.log("window.starknet:", !!window.starknet);
        
        if (!window.starknet_argentX && !window.starknet_braavos && !window.starknet) {
            throw new Error('No Starknet wallets found. Please install ArgentX or Braavos wallet extension.');
        }

        // Use starknetkit for wallet connection
        console.log("🔄 Using starknetkit for wallet connection...");
        
        try {
            // Clear any saved connection to force fresh selection
            clearWalletConnection();
            
            const connection = await connect({
                webWalletUrl: "https://web.argent.xyz",
                dappName: "BurrowGame",
                modalMode: "alwaysAsk", // Always show modal for wallet selection
                modalTheme: "dark",
                include: ["argentX", "braavos"],
                exclude: [],
                order: ["argentX", "braavos"]
            });

            console.log("📊 Connection result:", connection);
            console.log("📊 Connection type:", typeof connection);
            console.log("📊 Connection keys:", connection ? Object.keys(connection) : 'null');
            
            // Safe JSON stringify for BigInt values
            const safeStringify = (obj) => {
                return JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'bigint') {
                        return value.toString();
                    }
                    return value;
                }, 2);
            };
            
            console.log("📊 Connection stringified:", safeStringify(connection));

                        // Check if connection is a valid object with required properties
            if (connection && typeof connection === 'object') {
                // Parse starknetkit connection structure
                const wallet = connection.wallet;
                const connector = connection.connector;
                const connectorData = connection.connectorData;
                
                console.log("📊 Parsed wallet:", wallet);
                console.log("📊 Parsed connector:", connector);
                console.log("📊 Parsed connectorData:", connectorData);
                
                // Determine which wallet was selected from starknetkit
                let selectedWalletType = 'unknown';
                if (wallet?.id) {
                    selectedWalletType = wallet.id;
                    console.log("🎯 User selected wallet type:", selectedWalletType);
                } else if (connector?._wallet?.id) {
                    selectedWalletType = connector._wallet.id;
                    console.log("🎯 User selected wallet type (from connector):", selectedWalletType);
                }
                
                // Check if wallet is connected and has account
                const isConnected = wallet?.isConnected || false;
                const account = wallet?.account;
                const address = account?.address;
                
                console.log("📊 Parsed isConnected:", isConnected);
                console.log("📊 Parsed account:", account);
                console.log("📊 Parsed address:", address);
                
                // If we have connectorData with account but wallet is not connected, try to enable it
                if (connectorData?.account && !isConnected) {
                    console.log("🔄 Attempting to enable wallet with account from connectorData...");
                    
                    try {
                        // Determine which wallet was selected based on connector data
                        let selectedWallet = null;
                        let walletType = 'unknown';
                        
                        // Use the selected wallet type from starknetkit
                        if (selectedWalletType === 'argentX' && window.starknet_argentX) {
                            try {
                                await window.starknet_argentX.enable();
                                if (window.starknet_argentX.isConnected && window.starknet_argentX.account?.address) {
                                    selectedWallet = window.starknet_argentX;
                                    walletType = 'argentX';
                                    console.log("✅ Successfully enabled ArgentX wallet");
                                }
                            } catch (e) {
                                console.log("❌ ArgentX enable failed:", e.message);
                            }
                        } else if (selectedWalletType === 'braavos' && window.starknet_braavos) {
                            try {
                                await window.starknet_braavos.enable();
                                if (window.starknet_braavos.isConnected && window.starknet_braavos.account?.address) {
                                    selectedWallet = window.starknet_braavos;
                                    walletType = 'braavos';
                                    console.log("✅ Successfully enabled Braavos wallet");
                                }
                            } catch (e) {
                                console.log("❌ Braavos enable failed:", e.message);
                            }
                        } else {
                            // Fallback: try both wallets if selection is unclear
                            console.log("🔄 Selection unclear, trying both wallets...");
                            
                            if (window.starknet_argentX) {
                                try {
                                    await window.starknet_argentX.enable();
                                    if (window.starknet_argentX.isConnected && window.starknet_argentX.account?.address === connectorData.account) {
                                        selectedWallet = window.starknet_argentX;
                                        walletType = 'argentX';
                                        console.log("✅ Found ArgentX wallet with matching account");
                                    }
                                } catch (e) {
                                    console.log("❌ ArgentX enable failed:", e.message);
                                }
                            }
                            
                            if (!selectedWallet && window.starknet_braavos) {
                                try {
                                    await window.starknet_braavos.enable();
                                    if (window.starknet_braavos.isConnected && window.starknet_braavos.account?.address === connectorData.account) {
                                        selectedWallet = window.starknet_braavos;
                                        walletType = 'braavos';
                                        console.log("✅ Found Braavos wallet with matching account");
                                    }
                                } catch (e) {
                                    console.log("❌ Braavos enable failed:", e.message);
                                }
                            }
                        }
                        
                        if (selectedWallet && selectedWallet.isConnected && selectedWallet.account?.address) {
                            console.log("✅ Successfully enabled wallet:", selectedWallet.account.address, "Type:", walletType);
                            
                            currentConnection = {
                                account: selectedWallet.account,
                                wallet: selectedWallet,
                                isConnected: true
                            };
                            
                            // Save connection to localStorage with correct wallet type
                            saveWalletConnection({
                                ...currentConnection,
                                walletType: walletType
                            });
                            
                            return {
                                wallet: selectedWallet,
                                account: selectedWallet.account,
                                address: selectedWallet.account.address,
                                isConnected: true
                            };
                        } else {
                            console.log("❌ No matching wallet found for account:", connectorData.account);
                        }
                    } catch (enableError) {
                        console.log("❌ Failed to enable wallet:", enableError.message);
                    }
                }

                if (isConnected && address) {
                    currentConnection = connection;
                    console.log("✅ Successfully connected with Starknetkit:", address);
                    
                    // Save connection to localStorage with wallet type
                    const walletType = wallet?.id || 'unknown';
                    saveWalletConnection({
                        ...connection,
                        walletType: walletType
                    });
                    
                    return {
                        wallet: wallet,
                        account: account,
                        address: address,
                        isConnected: true
                    };
                                } else {
                    console.log("⚠️ Starknetkit connection object exists but not properly connected");
                    console.log("⚠️ isConnected:", isConnected);
                    console.log("⚠️ hasAddress:", !!address);
                    return { 
                        isConnected: false, 
                        error: null // Silent failure - no error message to user
                    };
                }
            } else {
                console.log("⚠️ Starknetkit returned invalid connection object:", connection);
                return { 
                    isConnected: false, 
                    error: null // Silent failure - no error message to user
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
            
            // If modal was cancelled, return silent failure
            return { 
                isConnected: false, 
                error: null // Silent failure - no error message to user
            };
        }

    } catch (error) {
        console.error("🚨 Wallet connection error:", error);
        
        let errorMessage = error.message;
        
        if (error.message.includes('KeyRing is locked') || error.message.includes('locked')) {
            errorMessage = 'Wallet is locked! Please unlock your ArgentX or Braavos wallet and try again.';
        } else if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            errorMessage = 'Connection rejected. Please approve the connection in your wallet.';
        } else if (error.message.includes('not found') || error.message.includes('install')) {
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
        
        // Clear saved connection from localStorage
        clearWalletConnection();
        
        // Record disconnect time to prevent auto-reconnect
        localStorage.setItem('lastDisconnectTime', Date.now().toString());
        
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
    
    // Fetch BURR balance with explicit latest block
    try {
        console.log("🔍 Fetching BURR balance for address:", address);
        console.log("🔍 Using BURR token address:", BURR_TOKEN_ADDRESS);
        const burrContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        // Use call with explicit latest block
        const burrResult = await burrContract.call('balance_of', [address], { blockIdentifier: 'latest' });
        console.log("✅ Raw BURR balance response:", burrResult);
        console.log("✅ Raw BURR balance type:", typeof burrResult);
        burrBalance = safeBalanceConvert(burrResult);
        console.log("✅ Converted BURR balance:", burrBalance.toString());
        console.log("✅ Formatted BURR balance:", (Number(burrBalance) / 1e18).toFixed(2));
    } catch (error) {
        console.error("❌ BURR balance error:", error);
        console.error("❌ Error details:", error.message);
    }
    
    // Try each STRK address to find the working one
    for (const strkAddr of STRK_ADDRESSES) {
        try {
            console.log("Trying STRK address:", strkAddr);
            const strkContract = new Contract(ERC20_ABI, strkAddr, provider);
            const strkResult = await strkContract.call('balance_of', [address], { blockIdentifier: 'latest' });
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
    console.log("BURR balance type:", typeof burrBalance);
    console.log("BURR balance value:", burrBalance);
    
    const burrFormatted = formatBalance(burrBalance, 18);
    const strkFormatted = formatBalance(strkBalance, 18);
    
    console.log("Formatted balances - BURR:", burrFormatted, "STRK:", strkFormatted);
    console.log("Returning object:", { burrBalance, strkBalance, workingStrkAddress, burrFormatted, strkFormatted });
    
    return {
        burrBalance,
        strkBalance,
        workingStrkAddress,
        burrFormatted,
        strkFormatted
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
        
        // Manual contract call to test
        const manualResult = await provider.callContract({
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: 'get_user_beavers',
            calldata: [formattedAddress]
        });

        console.log('🔍 Raw get_user_beavers result:', manualResult);

        // Use manual call result since Contract class parsing has issues with felt* arrays
        let beaverIds = [];
        if (Array.isArray(manualResult)) {
            console.log('📊 Manual result array length:', manualResult.length);
            
            if (manualResult.length === 0) {
                console.log('✅ User has no beavers');
                return { beavers: [], totalRewards: '0' };
            }
            
            // All elements are beaver IDs directly (no length prefix)
            beaverIds = manualResult.map(id => {
                const numId = parseInt(id, 16);
                console.log(`🔄 Converting ${id} -> ${numId}`);
                return numId;
            }).filter(id => id > 0);
        }
        
        console.log('🦫 Parsed beaver IDs:', beaverIds);
        
        if (!beaverIds || beaverIds.length === 0) {
            console.log('✅ No valid beaver IDs found');
            return { beavers: [], totalRewards: '0' };
        }
        
        // Get total pending rewards once for the user
        const totalPendingRewards = await gameContract.calculate_pending_rewards(formattedAddress);
        const totalPendingBigInt = safeBalanceConvert(totalPendingRewards);
        
        // Fetch details for each beaver individually
        const beavers = [];
        let totalHourlyRate = 0;
        
        for (const beaverId of beaverIds) {
            try {
                console.log(`🦫 Fetching beaver ${beaverId} for user ${formattedAddress}`);
                
                // Get beaver details - pass address and beaver_id
                const beaverDetails = await gameContract.get_beaver(formattedAddress, beaverId);
                
                // Convert owner from felt252 to hex string
                let ownerAddress = beaverDetails.owner;
                if (typeof ownerAddress === 'bigint' || typeof ownerAddress === 'number') {
                    ownerAddress = '0x' + ownerAddress.toString(16);
                }
                
                const beaver = {
                    id: Number(beaverId),
                    owner: ownerAddress,
                    type: Number(beaverDetails.beaver_type),
                    level: Number(beaverDetails.level),
                    last_claim_time: Number(beaverDetails.last_claim_time),
                    pendingRewards: BigInt(0) // Will calculate proportionally below
                };
                
                // Debug ownership
                console.log(`🔍 Ownership check for beaver ${beaverId}:`);
                console.log(`  Contract owner: ${beaver.owner}`);
                console.log(`  Requested user: ${formattedAddress}`);
                console.log(`  Owner (lower): ${beaver.owner.toLowerCase()}`);
                console.log(`  User (lower): ${formattedAddress.toLowerCase()}`);
                
                // Normalize addresses for comparison (remove leading zeros)
                const normalizeAddress = (addr) => {
                    if (!addr) return '';
                    let normalized = addr.toLowerCase();
                    if (normalized.startsWith('0x')) {
                        normalized = '0x' + normalized.slice(2).replace(/^0+/, '');
                    }
                    return normalized;
                };
                
                const normalizedOwner = normalizeAddress(beaver.owner);
                const normalizedUser = normalizeAddress(formattedAddress);
                
                console.log(`  Normalized owner: ${normalizedOwner}`);
                console.log(`  Normalized user: ${normalizedUser}`);
                
                if (normalizedOwner !== normalizedUser) {
                    console.warn(`⚠️ Ownership mismatch for beaver ${beaverId}: owner=${normalizedOwner}, requested=${normalizedUser}`);
                    continue;
                }
                
                // Calculate hourly rate for this beaver (matching contract logic)
                const baseRates = [300, 300, 750, 2250]; // Index 0=Noob, 1=Pro, 2=Degen (matching contract)
                const baseRate = baseRates[beaver.type] || 300;
                
                // Use exact contract level multipliers (divided by 1000)
                const getContractLevelMultiplier = (level) => {
                    if (level === 1) return 1000;      // 1.0x
                    else if (level === 2) return 1500; // 1.5x  
                    else if (level === 3) return 2250; // 2.25x
                    else if (level === 4) return 3375; // 3.375x
                    else return 5062;                  // 5.0625x (level 5)
                };
                
                const levelMultiplier = getContractLevelMultiplier(beaver.level) / 1000;
                const hourlyRate = baseRate * levelMultiplier;
                totalHourlyRate += hourlyRate;
                
                beaver.hourlyRate = hourlyRate;
                
                beavers.push(beaver);
                console.log(`✅ Successfully fetched beaver ${beaverId}`);
                
            } catch (error) {
                console.error(`❌ Error fetching beaver ${beaverId}:`, error);
                if (error.message && error.message.includes('Not beaver owner')) {
                    console.warn(`⚠️ Beaver ${beaverId} does not belong to user ${formattedAddress}`);
                    console.warn(`🔧 This might be an old beaver that needs migration. Consider using import_beaver.`);
                    
                    // Create a placeholder beaver for old ones (for display purposes)
                    const placeholderBeaver = {
                        id: Number(beaverId),
                        owner: formattedAddress,
                        type: 0, // Default to Noob
                        level: 1, // Default level
                        last_claim_time: 0,
                        pendingRewards: BigInt(0),
                        hourlyRate: 300, // Default Noob rate
                        isLegacy: true, // Mark as legacy/needs migration
                        error: 'Migration required'
                    };
                    
                    beavers.push(placeholderBeaver);
                    console.log(`⚠️ Added placeholder for legacy beaver ${beaverId}`);
                }
                // Continue with next beaver instead of breaking
                continue;
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
        console.log("🎁 Starting staking rewards claim process...");
        
        const connection = getConnection();
        if (!connection || !connection.isConnected) {
            throw new Error('Wallet not connected');
        }

        // Create staking contract instance with account
        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, connection.account);
        
        console.log("📞 Calling claim_rewards function...");
        const result = await stakingContract.claim_rewards();
        
        console.log("📋 Claim transaction result:", result.transaction_hash);
        console.log("✅ Staking rewards claimed successfully!");
        
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

// Fetch game information from contract
export async function fetchGameInfo() {
    try {
        console.log('🔍 Fetching game info...');
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        const gameInfo = await gameContract.get_game_info();
        
        console.log('📊 Game info received:', gameInfo);
        return gameInfo;
    } catch (error) {
        console.error('❌ Game info fetch error:', error);
        return null;
    }
}

// Fetch game analytics from contract with retry
export async function fetchGameAnalytics() {
    return executeWithRetry(async (currentProvider) => {
        console.log('🔍 Fetching game analytics from contract:', GAME_CONTRACT_ADDRESS);
        
        // Get active users count separately
        console.log('🔍 Getting active users count...');
        let active_users = 0;
        try {
            const activeUsersResult = await currentProvider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_active_users_count',
                calldata: []
            });
            active_users = parseInt(activeUsersResult);
            console.log('📊 Active users from get_active_users_count:', active_users);
        } catch (error) {
            console.log('❌ get_active_users_count failed:', error.message);
        }
        
        // Get beaver type stats separately
        console.log('🔍 Getting beaver type stats...');
        let noob_count = 0;
        let pro_count = 0;
        let degen_count = 0;
        try {
            const beaverTypesResult = await currentProvider.callContract({
                contractAddress: GAME_CONTRACT_ADDRESS,
                entrypoint: 'get_beaver_type_stats',
                calldata: []
            });
            
            if (Array.isArray(beaverTypesResult) && beaverTypesResult.length === 3) {
                noob_count = parseInt(beaverTypesResult[0]);
                pro_count = parseInt(beaverTypesResult[1]);
                degen_count = parseInt(beaverTypesResult[2]);
                console.log('📊 Beaver type stats from get_beaver_type_stats:');
                console.log('  Noob count:', noob_count);
                console.log('  Pro count:', pro_count);
                console.log('  Degen count:', degen_count);
            }
        } catch (error) {
            console.log('❌ get_beaver_type_stats failed:', error.message);
        }
        
        // Call get_game_analytics for other data
        console.log('🔍 Getting game analytics...');
        const analyticsResult = await currentProvider.callContract({
            contractAddress: GAME_CONTRACT_ADDRESS,
            entrypoint: 'get_game_analytics',
            calldata: []
        });
        
        console.log('📊 Raw analytics result:', analyticsResult);
        console.log('📊 Result type:', typeof analyticsResult);
        console.log('📊 Result length:', analyticsResult?.length);
        
        if (Array.isArray(analyticsResult) && analyticsResult.length >= 9) {
            console.log('📊 Raw values from contract:');
            console.log('  [0] total_beavers_staked:', analyticsResult[0], '(hex:', analyticsResult[0].toString(16), ')');
            console.log('  [1] total_burr_claimed:', analyticsResult[1]);
            console.log('  [2] total_strk_collected:', analyticsResult[2]);
            console.log('  [3] total_burr_burned:', analyticsResult[3]);
            console.log('  [4] noob_count_from_analytics:', analyticsResult[4], '(hex:', analyticsResult[4].toString(16), ')');
            console.log('  [5] pro_count_from_analytics:', analyticsResult[5], '(hex:', analyticsResult[5].toString(16), ')');
            console.log('  [6] degen_count_from_analytics:', analyticsResult[6], '(hex:', analyticsResult[6].toString(16), ')');
            console.log('  [7] active_users_from_analytics:', analyticsResult[7], '(hex:', analyticsResult[7].toString(16), ')');
            console.log('  [8] total_upgrades:', analyticsResult[8], '(hex:', analyticsResult[8].toString(16), ')');
            
            // Parse u256 values (they come as [low, high] arrays)
            const parseU256 = (value) => {
                if (Array.isArray(value) && value.length === 2) {
                    const low = BigInt(value[0]);
                    const high = BigInt(value[1]);
                    return low + (high << 128n);
                }
                return BigInt(value || 0);
            };
            
            const analytics = {
                total_beavers_staked: parseInt(analyticsResult[0]),
                total_burr_claimed: parseU256(analyticsResult[1]),
                total_strk_collected: parseU256(analyticsResult[2]),
                total_burr_burned: parseU256(analyticsResult[3]),
                noob_count: noob_count, // Use the value from get_beaver_type_stats
                pro_count: pro_count, // Use the value from get_beaver_type_stats
                degen_count: degen_count, // Use the value from get_beaver_type_stats
                active_users: active_users, // Use the value from get_active_users_count
                total_upgrades: parseInt(analyticsResult[8])
            };
            
            console.log('📊 Parsed analytics:', analytics);
            console.log('📊 Total beavers staked:', analytics.total_beavers_staked, '(hex:', analytics.total_beavers_staked.toString(16), ')');
            console.log('📊 Noob count (from get_beaver_type_stats):', analytics.noob_count, '(hex:', analytics.noob_count.toString(16), ')');
            console.log('📊 Pro count (from get_beaver_type_stats):', analytics.pro_count, '(hex:', analytics.pro_count.toString(16), ')');
            console.log('📊 Degen count (from get_beaver_type_stats):', analytics.degen_count, '(hex:', analytics.degen_count.toString(16), ')');
            console.log('📊 Active users (from get_active_users_count):', analytics.active_users, '(hex:', analytics.active_users.toString(16), ')');
            console.log('📊 Total upgrades:', analytics.total_upgrades, '(hex:', analytics.total_upgrades.toString(16), ')');
            
            return analytics;
        } else {
            console.log('⚠️ Unexpected analytics result format:', analyticsResult);
            console.log('⚠️ Expected array with 9+ elements, got:', analyticsResult?.length || 'undefined');
            return null;
        }
    });
}

// Get emergency status from contract
export async function getEmergencyStatus() {
    try {
        console.log('🔍 Checking emergency status...');
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        const isPaused = await gameContract.get_emergency_status();
        
        console.log('⚠️ Emergency status:', isPaused);
        return Boolean(isPaused);
    } catch (error) {
        console.error('❌ Emergency status error:', error);
        return false;
    }
}

// Get staking costs from contract
export async function fetchStakingCosts() {
    try {
        console.log('🔍 Fetching staking costs...');
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, provider);
        const costs = await gameContract.get_staking_costs();
        
        console.log('💰 Staking costs received:', costs);
        return costs;
    } catch (error) {
        console.error('❌ Staking costs fetch error:', error);
        return null;
    }
}

// Import beaver (migration function)
export async function importBeaver(owner, beaverId, beaverType, lastClaimTime) {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('🔄 Importing beaver...', {owner, beaverId, beaverType, lastClaimTime});
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, currentConnection.account);
        const result = await gameContract.import_beaver(owner, beaverId, beaverType, lastClaimTime);
        
        console.log('✅ Beaver import successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Import beaver error:', error);
        throw error;
    }
}

// Emergency pause function (admin only)
export async function emergencyPause() {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('⚠️ Emergency pausing...');
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, currentConnection.account);
        const result = await gameContract.emergency_pause();
        
        console.log('✅ Emergency pause successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Emergency pause error:', error);
        throw error;
    }
}

// Emergency unpause function (admin only)
export async function emergencyUnpause() {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('✅ Emergency unpausing...');
        
        const gameContract = new Contract(GAME_ABI, GAME_CONTRACT_ADDRESS, currentConnection.account);
        const result = await gameContract.emergency_unpause();
        
        console.log('✅ Emergency unpause successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Emergency unpause error:', error);
        throw error;
    }
}

// =============================================
// BURR STAKING FUNCTIONS
// =============================================


// Check current allowance for BURR token
export async function checkBurrAllowance(userAddress) {
    try {
        console.log('🔍 Checking BURR allowance...');
        if (!provider) provider = createProvider();
        const burrContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        
        // Try different allowance function names used in Cairo ERC20 contracts
        let allowance;
        try {
            allowance = await burrContract.call('allowance', [userAddress, BURR_STAKING_ADDRESS], { blockIdentifier: 'latest' });
        } catch (e1) {
            try {
                allowance = await burrContract.call('get_allowance', [userAddress, BURR_STAKING_ADDRESS], { blockIdentifier: 'latest' });
            } catch (e2) {
                console.warn('⚠️ Allowance function not found, assuming 0');
                return BigInt(0);
            }
        }
        const allowanceBigInt = BigInt(allowance.toString());
        
        console.log('💳 Current allowance:', allowanceBigInt.toString());
        return allowanceBigInt;
    } catch (error) {
        console.error('❌ Error checking allowance:', error);
        return BigInt(0);
    }
}

// Check current BURR balance directly from contract
export async function checkBurrBalance(userAddress) {
    try {
        console.log('🔍 Checking BURR balance from contract...');
        if (!provider) provider = createProvider();
        const burrContract = new Contract(ERC20_ABI, BURR_TOKEN_ADDRESS, provider);
        
        const balance = await burrContract.call('balance_of', [userAddress], { blockIdentifier: 'latest' });
        const balanceBigInt = BigInt(balance.toString());
        
        console.log('💰 Contract balance (raw):', balanceBigInt.toString());
        console.log('💰 Contract balance (formatted):', (Number(balanceBigInt) / 1e18).toFixed(2));
        
        return balanceBigInt;
    } catch (error) {
        console.error('❌ Error checking balance:', error);
        return BigInt(0);
    }
}

// Stake BURR tokens with smart approval
export async function stakeTokens(amount) {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('💰 Staking tokens with smart approval...', amount);
        
        // Convert amount to wei (BURR has 18 decimals)
        const amountInWei = BigInt(amount) * BigInt(10 ** 18);
        const cairoAmount = new CairoUint256(amountInWei);
        console.log('🔧 Amount in wei:', amountInWei.toString());
        console.log('🔧 Using CairoUint256:', cairoAmount);
        
        // Check current allowance
        const currentAllowance = await checkBurrAllowance(currentConnection.address);
        const needsApproval = currentAllowance < amountInWei;
        
        console.log('💳 Current allowance:', currentAllowance.toString());
        console.log('💰 Amount to stake (wei):', amountInWei.toString());
        console.log('🔍 Needs approval:', needsApproval);
        
        const calls = [];
        
        // Add approve call only if needed, with unlimited amount
        if (needsApproval) {
            console.log('📝 Adding unlimited approve to multicall...');
            // Use maximum uint256 value for unlimited approval
            const maxUint256 = new CairoUint256('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
            
            const approveCall = {
                contractAddress: BURR_TOKEN_ADDRESS,
                entrypoint: 'approve',
                calldata: CallData.compile({
                    spender: BURR_STAKING_ADDRESS,
                    amount: maxUint256
                })
            };
            calls.push(approveCall);
            console.log('🔧 Unlimited approve call added:', approveCall);
        } else {
            console.log('✅ Sufficient allowance exists, skipping approve');
        }
        
        // Add stake call
        const stakeCall = {
            contractAddress: BURR_STAKING_ADDRESS,
            entrypoint: 'stake',
            calldata: CallData.compile({
                amount: cairoAmount
            })
        };
        calls.push(stakeCall);
        console.log('🔧 Stake call added:', stakeCall);
        
        // Execute calls (either just stake, or approve + stake)
        console.log(`📞 Executing ${calls.length} call(s)...`);
        
        try {
            // Try multicall first
            const result = await currentConnection.account.execute(calls);
            console.log('✅ Stake multicall successful:', result);
            return result;
        } catch (multicallError) {
            console.warn('⚠️ Multicall failed, trying sequential transactions:', multicallError.message);
            
            // If multicall fails, execute transactions sequentially as fallback
            if (calls.length > 1) {
                console.log('🔄 Falling back to sequential transactions...');
                
                // Execute approve first
                console.log('📝 Executing approve transaction...');
                const approveResult = await currentConnection.account.execute([calls[0]]);
                console.log('✅ Approve successful:', approveResult);
                
                // Wait for approve to be confirmed
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Execute stake second
                console.log('🚀 Executing stake transaction...');
                const stakeResult = await currentConnection.account.execute([calls[1]]);
                console.log('✅ Stake successful:', stakeResult);
                
                return stakeResult;
            } else {
                // If only one call, re-throw the original error
                throw multicallError;
            }
        }
    } catch (error) {
        console.error('❌ Stake operation error:', error);
        throw error;
    }
}

// Withdraw unstaked BURR tokens after 30-day lock
export async function withdrawUnstakedTokens() {
    if (!currentConnection.account) {
        throw new Error('Wallet not connected');
    }
    
    try {
        console.log('🏦 Withdrawing unstaked tokens...');
        
        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, currentConnection.account);
        
        // Call withdraw_unstaked function
        const result = await stakingContract.withdraw_unstaked();
        console.log('✅ Withdrawal transaction hash:', result.transaction_hash);
        
        return result;
    } catch (error) {
        console.error('❌ Withdrawal failed:', error);
        throw error;
    }
}

// Unstake BURR tokens
export async function unstakeTokens(amount) {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('💰 Unstaking tokens...', amount);
        
        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, currentConnection.account);
        
        // Convert amount to wei (BURR has 18 decimals)
        const amountInWei = BigInt(amount) * BigInt(10 ** 18);
        const cairoAmount = new CairoUint256(amountInWei);
        console.log('🔧 Unstaking amount in wei:', amountInWei.toString());
        console.log('🔧 Unstaking with CairoUint256:', cairoAmount);
        
        const result = await stakingContract.unstake(cairoAmount);
        
        console.log('✅ Unstaking successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Unstaking error:', error);
        throw error;
    }
}

// Claim staking rewards
export async function claimStakingRewards() {
    if (!currentConnection || !currentConnection.isConnected) {
        throw new Error("Wallet not connected");
    }
    
    try {
        console.log('🎁 Claiming staking rewards...');
        
        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, currentConnection.account);
        const result = await stakingContract.claim_rewards();
        
        console.log('✅ Rewards claimed successfully:', result);
        return result;
    } catch (error) {
        console.error('❌ Claim rewards error:', error);
        throw error;
    }
}

// Helper function to format BigInt balances for display
function formatBigIntBalance(balance, decimals = 18) {
    try {
        if (!balance || balance === BigInt(0)) return '0';
        
        const divisor = BigInt(10 ** decimals);
        const wholePart = balance / divisor;
        const remainder = balance % divisor;
        
        const wholeNumber = Number(wholePart);
        const fractionalNumber = Number(remainder) / Math.pow(10, decimals);
        const totalNumber = wholeNumber + fractionalNumber;
        
        // Format number with commas and appropriate decimal places
        if (totalNumber >= 1000000000000) {
            return (totalNumber / 1000000000000).toFixed(1) + 'T';
        } else if (totalNumber >= 1000000000) {
            return (totalNumber / 1000000000).toFixed(1) + 'B';
        } else if (totalNumber >= 1000000) {
            return (totalNumber / 1000000).toFixed(1) + 'M';
        } else if (totalNumber >= 1000) {
            return (totalNumber / 1000).toFixed(1) + 'K';
        } else if (totalNumber >= 1) {
            // For single digit numbers, show no decimals
            // For larger numbers, show 1 decimal place
            if (totalNumber < 10) {
                return totalNumber.toFixed(0);
            } else {
                return totalNumber.toFixed(1);
            }
        } else {
            return totalNumber.toFixed(4);
        }
    } catch (error) {
        console.error('Error formatting balance:', error);
        return '0';
    }
}


// Format wei to readable format
function formatFromWei(weiAmount) {
    try {
        if (!weiAmount || weiAmount === '0') return 0;
        
        const amount = BigInt(weiAmount.toString());
        const divisor = BigInt(10 ** 18);
        
        const wholePart = amount / divisor;
        const remainder = amount % divisor;
        
        const wholeNumber = Number(wholePart);
        const fractionalNumber = Number(remainder) / Math.pow(10, 18);
        const totalNumber = wholeNumber + fractionalNumber;
        
        // Format number with appropriate decimal places
        if (totalNumber >= 1000000000000) {
            return (totalNumber / 1000000000000).toFixed(1) + 'T';
        } else if (totalNumber >= 1000000000) {
            return (totalNumber / 1000000000).toFixed(1) + 'B';
        } else if (totalNumber >= 1000000) {
            return (totalNumber / 1000000).toFixed(1) + 'M';
        } else if (totalNumber >= 1000) {
            return (totalNumber / 1000).toFixed(1) + 'K';
        } else if (totalNumber >= 1) {
            // For single digit numbers, show no decimals
            // For larger numbers, show 1 decimal place
            if (totalNumber < 10) {
                return totalNumber.toFixed(0);
            } else {
                return totalNumber.toFixed(1);
            }
        } else {
            return totalNumber.toFixed(4);
        }
    } catch (error) {
        console.error('Error formatting from wei:', error);
        return 0;
    }
}

// Fetch staking data for a user
export async function fetchStakingData(userAddress) {
    console.log('🔍 Fetching staking data for address:', userAddress);

    try {
        if (!provider) {
            console.log('🔧 Initializing provider...');
            provider = new RpcProvider({
                nodeUrl: getCurrentRpcUrls()[0],
                blockIdentifier: 'latest',
                default: 'latest'
            });
        }

        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, provider);

        // Fetch user staking info
        console.log('📞 Calling get_staking_position...');
        const userInfo = await stakingContract.get_staking_position(userAddress);
        console.log('📊 User info response:', userInfo);

        // Fetch pending rewards directly
        console.log('📞 Calling get_pending_rewards...');
        const pendingRewards = await stakingContract.get_pending_rewards(userAddress);
        console.log('📊 Pending rewards response:', pendingRewards);

        // Fetch staking pool info
        console.log('📞 Calling get_staking_pool_info...');
        const poolInfo = await stakingContract.get_staking_pool_info();
        console.log('📊 Pool info response:', poolInfo);

        // Process user info - response is directly BigInt, not a struct
        console.log('🔍 Raw userInfo (direct BigInt):', userInfo);
        console.log('🔍 userInfo type:', typeof userInfo);
        
        const stakedAmount = userInfo ? userInfo.toString() : '0';
        const lastClaimTime = '0'; // Not available in direct response
        const rewardRate = '0'; // Not available in direct response

        console.log('🔢 Processed staked amount:', stakedAmount);
        console.log('🔢 Pending rewards from contract:', pendingRewards);
        console.log('🔢 stakedAmount type:', typeof stakedAmount);
        console.log('🔢 stakedAmount value:', stakedAmount);

        // Process pool info - response is directly BigInt, not a struct
        const totalStaked = poolInfo ? poolInfo.toString() : '0';
        
        // Get current reward rate from contract
        let poolRewardRate = '22181661469'; // Default fallback
        try {
            const currentRewardRate = await stakingContract.get_reward_rate();
            poolRewardRate = currentRewardRate.toString();
            console.log('🔍 Current reward rate from contract:', poolRewardRate);
        } catch (error) {
            console.log('⚠️ Could not fetch reward rate, using default:', poolRewardRate);
        }

        // Calculate APY dynamically from reward rate
        // APY = (reward_rate * 365 * 24 * 3600) / 10^18 * 100
        const rewardRateNum = parseInt(poolRewardRate);
        const apy = Math.round((rewardRateNum * 365 * 24 * 3600) / (10**18) * 100);
        console.log('🔢 Calculated APY:', apy, '%');
        
            // Ensure APY is displayed as 40% (matching contract's 40% APY)
            const displayAPY = 40;

        // Check for unstake requests (if function exists)
        let unstakeAmount = '0';
        let canWithdraw = false;
        let withdrawalDate = null;

        try {
            const unstakeInfo = await stakingContract.get_unstake_request(userAddress);
            console.log('🔍 Unstake info response:', unstakeInfo);
            console.log('🔍 Unstake info type:', typeof unstakeInfo);
            console.log('🔍 Unstake info keys:', Object.keys(unstakeInfo || {}));
            
            if (unstakeInfo) {
                // Check if it's a tuple/array or direct value
                if (Array.isArray(unstakeInfo) && unstakeInfo.length >= 3) {
                    // Response is a tuple: (amount, request_time, withdrawal_time)
                    const [amount, requestTime, withdrawalTime] = unstakeInfo;
                    console.log('🔍 Tuple format - amount:', amount, 'requestTime:', requestTime, 'withdrawalTime:', withdrawalTime);
                    
                    if (amount && amount.toString() !== '0') {
                        unstakeAmount = uint256ToBigInt(amount).toString();
                        const requestTimestamp = parseInt(requestTime.toString());
                        const withdrawalTimestamp = parseInt(withdrawalTime.toString());
                        
                        withdrawalDate = new Date(withdrawalTimestamp * 1000);
                        canWithdraw = true; // Always allow withdraw button, contract will handle timing
                        
                        console.log('🔒 Unstake details (tuple):', {
                            amount: unstakeAmount,
                            requestTime: requestTimestamp,
                            withdrawalTime: withdrawalTimestamp,
                            canWithdraw,
                            withdrawalDate: withdrawalDate.toISOString()
                        });
                    }
                } else if (typeof unstakeInfo === 'bigint' || typeof unstakeInfo === 'string') {
                    // Direct amount value
                    console.log('🔍 Direct amount format:', unstakeInfo);
                    if (unstakeInfo.toString() !== '0') {
                        unstakeAmount = unstakeInfo.toString();
                        console.log('🔒 Unstake details (direct):', {
                            amount: unstakeAmount,
                            canWithdraw: true // Always allow withdraw button
                        });
                    }
                } else {
                    // Object format with numeric keys (tuple response)
                    console.log('🔍 Object format:', unstakeInfo);
                    if (unstakeInfo['0'] && unstakeInfo['0'].toString() !== '0') {
                        unstakeAmount = unstakeInfo['0'].toString();
                        const requestTimestamp = parseInt(unstakeInfo['1'].toString());
                        const withdrawalTimestamp = parseInt(unstakeInfo['2'].toString());
                        
                        withdrawalDate = new Date(withdrawalTimestamp * 1000);
                        canWithdraw = true; // Always allow withdraw button, contract will handle timing
                        
                        console.log('🔒 Unstake details (object with keys):', {
                            amount: unstakeAmount,
                            requestTime: requestTimestamp,
                            withdrawalTime: withdrawalTimestamp,
                            canWithdraw,
                            withdrawalDate: withdrawalDate.toISOString()
                        });
                    }
                }
                
                console.log('🔒 Final unstakeAmount:', unstakeAmount);
                console.log('🔒 Final unstakeAmount type:', typeof unstakeAmount);
            }
        } catch (unstakeError) {
            console.log('ℹ️ No unstake request found or function not available:', unstakeError);
        }

        // Get reward pool balance
        let rewardPool = '0';
        try {
            const poolBalance = await stakingContract.get_reward_pool_balance();
            rewardPool = poolBalance ? uint256ToBigInt(poolBalance).toString() : '0';
        } catch (poolError) {
            console.log('ℹ️ Could not fetch reward pool balance');
        }

        const result = {
            stakedAmount: stakedAmount, // Keep as BigInt string for calculations
            userStaked: stakedAmount, // Alternative field name
            pendingRewards: uint256ToBigInt(pendingRewards).toString(),
            totalStaked: totalStaked,
            rewardPool: rewardPool,
            apy: displayAPY, // Use fixed 40% APY display
            unstakeAmount: unstakeAmount, // Keep as BigInt string for calculations
            canWithdraw: canWithdraw,
            withdrawalDate: withdrawalDate
        };

        console.log('✅ Final staking data result:', result);
        return result;

    } catch (error) {
        console.error('❌ Error fetching staking data:', error);

        // Return default values on error
        return {
            stakedAmount: 0,
            userStaked: 0,
            pendingRewards: 0,
            totalStaked: 0,
            rewardPool: 0,
            apy: 40, // Fixed 40% APY
            unstakeAmount: 0,
            canWithdraw: false,
            withdrawalDate: null
        };
    }
}

// Withdraw unstaked tokens
export async function withdrawUnstaked() {
    try {
        // Use global currentConnection variable
        if (!currentConnection || !currentConnection.account) {
            throw new Error('Wallet not connected');
        }

        console.log('🔄 Calling withdraw_unstaked...');
        
        const stakingContract = new Contract(BURR_STAKING_ABI, BURR_STAKING_ADDRESS, currentConnection.account);
        
        const result = await stakingContract.withdraw_unstaked();
        
        console.log('✅ Withdraw unstaked successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Withdraw unstaked failed:', error);
        throw error;
    }
}
