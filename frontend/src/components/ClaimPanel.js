import React from 'react';
import { formatNumber } from '../utils/constants';

const ClaimPanel = ({ hasStaked, accumulated, onClaim }) => {
  if (!hasStaked) {
    return (
      <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-blue opacity-50">
        <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
          💰 Claim Rewards
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
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
        💰 Claim Rewards
      </h2>

      <div className="space-y-4">
        {/* Accumulated Rewards Display */}
        <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-6 text-center">
          <div className="text-burrow-blue-light text-sm mb-2">Available to Claim</div>
          <div className="text-4xl font-bold text-green-400 mb-2">
            {formatNumber(accumulated)}
          </div>
          <div className="text-burrow-orange font-bold">$BURR</div>
        </div>

        {/* Claim Button */}
        <button
          onClick={onClaim}
          disabled={!canClaim}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
            canClaim
              ? 'claim-button text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canClaim ? `Claim ${formatNumber(accumulated)} $BURR` : 'No Rewards to Claim'}
        </button>

        {/* Mining Info */}
        <div className="bg-burrow-blue bg-opacity-20 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 text-burrow-blue-light">
            <span className="animate-pulse">⛏️</span>
            <span className="text-sm">Your beaver is working hard underground!</span>
            <span className="animate-pulse">⛏️</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimPanel; 