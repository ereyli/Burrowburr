import React from 'react';
import { formatNumber } from '../utils/constants';

const ClaimPanel = ({ hasStaked, accumulated, onClaim }) => {
  if (!hasStaked) {
    return (
      <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-blue opacity-50">
        <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic flex items-center space-x-2">
          <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
          <span>Claim Rewards</span>
        </h2>
        <div className="text-center text-burrow-blue-light">
          Stake a beaver to start earning rewards!
        </div>
      </div>
    );
  }

  const canClaim = accumulated > 0;

  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-blue">
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic flex items-center space-x-2">
        <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
        <span>Claim Rewards</span>
      </h2>

      <div className="space-y-4">
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
            disabled={!canClaim}
            className={`game-button text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 ${
              canClaim 
                ? 'hover:scale-105' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {canClaim ? '🎁 Claim Rewards' : 'No Rewards to Claim'}
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-burrow-blue-light text-sm">
          💡 Rewards accumulate automatically while your beaver mines!
        </div>
      </div>
    </div>
  );
};

export default ClaimPanel; 