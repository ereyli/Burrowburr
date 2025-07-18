import React from 'react';
import { GAME_CONFIG, formatNumber } from '../utils/constants';

const UpgradePanel = ({ hasStaked, beaverInfo, upgradeInfo, onUpgrade }) => {
  if (!hasStaked) {
    return (
      <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-brown opacity-50">
        <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
          ⬆️ Upgrade Beaver
        </h2>
        <div className="text-center text-burrow-blue-light">
          Stake a beaver first to unlock upgrades!
        </div>
      </div>
    );
  }

  const currentLevel = beaverInfo?.level || 1;
  const nextLevel = currentLevel + 1;
  const upgradeCost = GAME_CONFIG.UPGRADE_COSTS[currentLevel] || 0;
  const canUpgrade = currentLevel < 5 && upgradeInfo?.canUpgrade;
  const isMaxLevel = currentLevel >= 5;

  const calculateNewRate = () => {
    const baseRate = GAME_CONFIG.BEAVER_TYPES[beaverInfo.type.toUpperCase()]?.hourlyRate || 0;
    return baseRate * Math.pow(GAME_CONFIG.LEVEL_MULTIPLIER, nextLevel - 1);
  };

  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-brown">
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
        ⬆️ Upgrade Beaver
      </h2>

      <div className="space-y-4">
        {/* Current Level Display */}
        <div className="bg-burrow-blue bg-opacity-20 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-burrow-blue-light text-sm">Current Level</div>
              <div className="text-2xl font-bold text-white">{currentLevel}</div>
            </div>
            <div className="text-right">
              <div className="text-burrow-blue-light text-sm">Current Rate</div>
              <div className="text-burrow-orange font-bold">
                {formatNumber(beaverInfo.hourlyRate)} $BURR/hour
              </div>
            </div>
          </div>
        </div>

        {!isMaxLevel ? (
          <>
            {/* Upgrade Preview */}
            <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-burrow-blue-light text-sm">Next Level</div>
                  <div className="text-2xl font-bold text-green-400">{nextLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-burrow-blue-light text-sm">New Rate</div>
                  <div className="text-green-400 font-bold">
                    {formatNumber(calculateNewRate())} $BURR/hour
                  </div>
                </div>
              </div>
              
              {/* Upgrade Cost */}
              <div className="border-t border-burrow-brown pt-3">
                <div className="text-center">
                  <div className="text-burrow-blue-light text-sm mb-1">Upgrade Cost</div>
                  <div className="text-red-400 font-bold text-lg">
                    {formatNumber(upgradeCost)} $BURR
                  </div>
                  <div className="text-burrow-blue-light text-xs mt-1">
                    (Tokens will be burned)
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Button */}
            <button
              onClick={onUpgrade}
              disabled={!canUpgrade}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                canUpgrade
                  ? 'game-button text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canUpgrade 
                ? `Upgrade to Level ${nextLevel} (${formatNumber(upgradeCost)} $BURR)`
                : `Insufficient $BURR (Need ${formatNumber(upgradeCost)})`
              }
            </button>
          </>
        ) : (
          <div className="bg-yellow-500 bg-opacity-20 rounded-xl p-6 text-center">
                            <div className="text-2xl mb-2">
                  <img src="/beaver_logo.png" alt="Beaver" className="w-8 h-8 mx-auto" />
                </div>
            <div className="text-yellow-400 font-bold text-lg">MAX LEVEL ACHIEVED!</div>
            <div className="text-burrow-blue-light text-sm mt-2">
              Your beaver is operating at maximum efficiency!
            </div>
          </div>
        )}

        {/* Level Benefits Info */}
        <div className="bg-burrow-dark bg-opacity-50 rounded-lg p-3">
          <div className="text-center text-burrow-blue-light text-xs">
            💡 Each level increases earning rate by {(GAME_CONFIG.LEVEL_MULTIPLIER - 1) * 100}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePanel; 