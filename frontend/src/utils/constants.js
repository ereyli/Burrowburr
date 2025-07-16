// Contract addresses - deployed to Starknet Mainnet
export const BURR_TOKEN_ADDRESS = "0x04553dfcd5b26cdc529b684627db845517a2d47f20a9101f59479c4bf9d91e4e"; // Mainnet BURR token
export const GAME_CONTRACT_ADDRESS = "0x05c2320a3dea383f35a174ffc098a289edf89067e84701f0c778ed5e37c1cc1e"; // Mainnet BurrowGame contract

// STRK token address (Starknet Mainnet official)
export const STRK_ADDRESSES = ["0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"]; // Official STRK token mainnet

// For legacy support
export const CONTRACT_ADDRESSES = {
    BURR_TOKEN: BURR_TOKEN_ADDRESS,
    GAME_CONTRACT: GAME_CONTRACT_ADDRESS,
    STRK_TOKEN: STRK_ADDRESSES[0]
};

// Game constants - UPDATED ECONOMICS
export const GAME_CONFIG = {
  GAME_DURATION: 365 * 24 * 60 * 60, // 365 days in seconds
  BEAVER_TYPES: {
    NOOB: { name: "Noob", hourlyRate: 300, stakeCost: 50 },    // Updated: 50 STRK (was 12)
    PRO: { name: "Pro", hourlyRate: 750, stakeCost: 120 },     // Updated: 120 STRK (was 30)
    DEGEN: { name: "Degen", hourlyRate: 2250, stakeCost: 350 }  // Updated: 2,250 BURR/hour, 350 STRK (was 500 BURR/hour, 60 STRK)
  },
  // NEW UPGRADE COST SYSTEM - Per beaver type and level
  UPGRADE_COSTS: {
    NOOB: { 1: 40000, 2: 80000, 3: 80000, 4: 80000 },    // Total: 200K BURR (40K + 80K + 80K)
    PRO: { 1: 80000, 2: 160000, 3: 160000, 4: 160000 },  // Total: 400K BURR (80K + 160K + 160K)
    DEGEN: { 1: 203000, 2: 406000, 3: 406000, 4: 406000 } // Total: 1.015M BURR (203K + 406K + 406K)
  },
  LEVEL_MULTIPLIER: 1.5
};

// Mock data for development
export const MOCK_DATA = {
  isConnected: false,
  walletAddress: "0x1234...5678",
  burrBalance: "15,847",
  totalEarned: "127,439",
  daysLeft: 298,
  hoursLeft: 14,
  hasStaked: false,
  beaverInfo: {
    type: "Pro",
    level: 3,
    hourlyRate: 937.5, // 250 * 1.5^2
    lastClaim: new Date().getTime() - 4 * 60 * 60 * 1000, // 4 hours ago
    accumulated: 3750
  },
  upgradeInfo: {
    nextLevel: 4,
    cost: 160000, // Updated to new Pro upgrade cost
    canUpgrade: true
  }
};

// Beaver emojis and descriptions
export const BEAVER_IMAGES = {
  NOOB: "🦫",
  PRO: "🦫⭐",
  DEGEN: "🦫💎"
};

export const BEAVER_DESCRIPTIONS = {
  NOOB: "Basic beaver for beginners - 300 BURR/hour",
  PRO: "Experienced beaver with better rewards - 2,250 BURR/hour", 
  DEGEN: "Elite beaver for maximum earnings - 2,250 BURR/hour"
};

// Social links
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/burrowgame",
  discord: "https://discord.gg/burrowgame",
  dexscreener: "https://dexscreener.com/starknet/burr"
};

// Helper functions
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function formatNumber(num) {
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

export const calculateTimeLeft = (startTime, duration) => {
  const now = Date.now() / 1000;
  const elapsed = now - startTime;
  const remaining = Math.max(0, duration - elapsed);
  
  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  
  return { days, hours };
}; 