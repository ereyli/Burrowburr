import React from 'react';

// Contract addresses - deployed to Starknet Mainnet
export const BURR_TOKEN_ADDRESS = "0x04553dfcd5b26cdc529b684627db845517a2d47f20a9101f59479c4bf9d91e4e"; // Mainnet BURR token
export const GAME_CONTRACT_ADDRESS = "0x05c2320a3dea383f35a174ffc098a289edf89067e84701f0c778ed5e37c1cc1e"; // Mainnet BurrowGame contract

// STRK token address (Starknet Mainnet official)
export const STRK_ADDRESSES = ["0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"]; // Official STRK token mainnet

// For legacy support
export const CONTRACT_ADDRESSES = {
    BURR_TOKEN: BURR_TOKEN_ADDRESS,
    BURROW_GAME: GAME_CONTRACT_ADDRESS,
    STRK_TOKEN: STRK_ADDRESSES[0]
};

// Game configuration constants - Updated with new economical values
export const GAME_CONFIG = {
  BEAVER_TYPES: {
    NOOB: {
      name: 'Noob',
      stakeCost: 50, // 50 STRK
      hourlyRate: 300, // 300 BURR/hour (updated from 1000)
      maxLevel: 5
    },
    PRO: {
      name: 'Pro', 
      stakeCost: 120, // 120 STRK
      hourlyRate: 750, // 750 BURR/hour (updated from 2250)
      maxLevel: 5
    },
    DEGEN: {
      name: 'Degen',
      stakeCost: 350, // 350 STRK  
      hourlyRate: 2250, // 2250 BURR/hour (updated from 5000)
      maxLevel: 5
    }
  },
  TOTAL_REWARDS: 700000000, // 700M BURR total
  GAME_DURATION_DAYS: 365
};

// Updated upgrade costs based on new economics
export const UPGRADE_COSTS = {
  1: {
    cost: 40000, // 40k BURR for level 2
    canUpgrade: true
  },
  2: {
    cost: 84000, // 84k BURR for level 3
    canUpgrade: true
  },
  3: {
    cost: 160000, // Updated to new Pro upgrade cost
    canUpgrade: true
  },
  4: {
    cost: 160000, // Updated to new Pro upgrade cost
    canUpgrade: true
  }
};

// Beaver images configuration - using string identifiers for components to render
export const BEAVER_IMAGES = {
  NOOB: "noob",
  PRO: "pro", 
  DEGEN: "degen"
};

// Enhanced Beaver component for rendering different types with animations
export const BeaverImage = ({ type, size = "w-16 h-16", isActive = false, showMining = false }) => {
  const getAnimationClass = () => {
    if (showMining && isActive) return "mining-active";
    if (isActive) return "beaver-digging";
    return "";
  };

  const getBeaverDisplay = () => {
    const animationClass = getAnimationClass();
    
    switch(type?.toUpperCase()) {
      case 'PRO':
        return (
          <div className={`relative mx-auto ${size}`}>
            <img 
              src="/beaver_logo.png" 
              alt="Pro Beaver" 
              className={`${size} ${animationClass}`} 
            />
            <span className="absolute -top-1 -right-1 text-yellow-400 text-lg coin-sparkle">⭐</span>
            {showMining && isActive && (
              <div className="absolute -bottom-1 -right-1 animate-pulse">
                ⛏️
              </div>
            )}
          </div>
        );
      case 'DEGEN':
        return (
          <div className={`relative mx-auto ${size}`}>
            <img 
              src="/beaver_logo.png" 
              alt="Degen Beaver" 
              className={`${size} ${animationClass}`} 
            />
            <span className="absolute -top-1 -right-1 text-blue-400 text-lg coin-sparkle">💎</span>
            {showMining && isActive && (
              <div className="absolute -bottom-1 -right-1 animate-pulse">
                ⛏️
              </div>
            )}
          </div>
        );
      case 'NOOB':
      default:
        return (
          <div className={`relative mx-auto ${size}`}>
            <img 
              src="/beaver_logo.png" 
              alt="Noob Beaver" 
              className={`${size} ${animationClass}`} 
            />
            {showMining && isActive && (
              <div className="absolute -bottom-1 -right-1 animate-pulse">
                ⛏️
              </div>
            )}
          </div>
        );
    }
  };

  return getBeaverDisplay();
};

export const BEAVER_DESCRIPTIONS = {
  NOOB: "Basic beaver for beginners - 300 BURR/hour",
  PRO: "Experienced beaver with better rewards - 750 BURR/hour", 
  DEGEN: "Elite beaver for maximum earnings - 2,250 BURR/hour"
};

// Social links
export const SOCIAL_LINKS = {
  twitter: "https://x.com/burr_burrow",
  dexscreener: "https://dexscreener.com/starknet/burr"
};

// Utility functions
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatNumber = (num) => {
  const number = Number(num);
  if (number === 0) return '0';
  
  // For very large numbers, use compact notation
  if (number >= 1000000000000) {
    return (number / 1000000000000).toFixed(1) + 'T';
  } else if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + 'B';
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  } else if (number >= 1) {
    return number.toFixed(2);
  } else {
    return number.toFixed(4);
  }
};

export const calculateTimeLeft = (startTime, duration) => {
  const now = Date.now() / 1000;
  const elapsed = now - startTime;
  const remaining = Math.max(0, duration - elapsed);
  
  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  
  return { days, hours };
}; 