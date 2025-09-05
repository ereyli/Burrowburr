import React from 'react';
import { formatNumber } from '../utils/constants';

const ClaimPanel = ({ hasStaked, accumulated, onClaim, tokenData }) => {
  // Check if we've reached max supply (2.1 billion BURR)
  const isMaxSupplyReached = () => {
    if (!tokenData || !tokenData.raw) return false;
    
    const maxSupply = BigInt("2100000000000000000000000000"); // 2.1B in wei
    const currentSupply = BigInt(tokenData.raw.actualTotalSupply || "0");
    
    // Only consider max supply reached if we're very close (99.9% of it)
    const threshold = maxSupply * BigInt(999) / BigInt(1000);
    return currentSupply >= threshold;
  };

  const miningEnded = isMaxSupplyReached();

  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-blue">
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic flex items-center space-x-2">
        <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
        <span>Claim Rewards</span>
      </h2>

      <div className="space-y-4">
        {miningEnded ? (
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500 mb-4">
              ⛏️ Mining Ended! ⛏️
            </div>
            <div className="text-burrow-blue-light text-lg mb-2">
              We've reached 2.1 Billion $BURR supply!
            </div>
            <div className="text-burrow-blue-light text-sm mb-3">
              No more new tokens can be minted. All unclaimed tokens are now lost forever!
            </div>
            <div className="text-red-400 text-sm mb-4 font-bold">
              🦫 TOO LATE! All unclaimed tokens have been burned! Beavers should have claimed earlier! 🦫
            </div>
            <div className="text-gray-400 text-sm mb-4">
              The mining phase is over. No tokens can be claimed anymore.
            </div>
          </div>
        ) : !hasStaked ? (
          <div className="text-center text-burrow-blue-light">
            Stake a beaver to start earning rewards!
          </div>
        ) : (
          <>
            {/* Accumulated Rewards Display */}
            <div className="text-center">
              <div className="text-4xl font-bold text-burrow-orange mb-2">
                {formatNumber(accumulated)}
              </div>
              <div className="text-burrow-blue-light text-sm">
                $BURR Ready to Claim
              </div>
            </div>

            {/* Claim Button */}
            <div className="text-center">
              <button
                onClick={onClaim}
                disabled={accumulated <= 0}
                className={`game-button text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 ${
                  accumulated > 0 
                    ? 'hover:scale-105' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {accumulated > 0 ? '🎁 Claim Rewards' : 'No Rewards to Claim'}
              </button>
            </div>

            {/* Info */}
            <div className="text-center text-burrow-blue-light text-sm">
              💡 Rewards accumulate automatically while your beaver mines!
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimPanel; 