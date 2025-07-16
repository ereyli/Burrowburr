import React, { useState } from 'react';
import { GAME_CONFIG, BEAVER_IMAGES, BEAVER_DESCRIPTIONS, formatNumber } from '../utils/constants';

const StakePanel = ({ hasStaked, beaverInfo, onStake }) => {
  const [selectedBeaver, setSelectedBeaver] = useState('NOOB');

  const handleStake = () => {
    onStake(selectedBeaver);
  };

  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-brown">
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
        🦫 Beaver Station
      </h2>

      {!hasStaked ? (
        <div className="space-y-6">
          {/* Beaver Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(GAME_CONFIG.BEAVER_TYPES).map(([key, beaver]) => (
              <div
                key={key}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-4 border-2 ${
                  selectedBeaver === key
                    ? 'border-burrow-orange bg-burrow-brown bg-opacity-30'
                    : 'border-burrow-brown bg-burrow-brown bg-opacity-10 hover:bg-opacity-20'
                }`}
                onClick={() => setSelectedBeaver(key)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{BEAVER_IMAGES[key]}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{beaver.name}</h3>
                  <p className="text-burrow-blue-light text-sm mb-3">
                    {BEAVER_DESCRIPTIONS[key]}
                  </p>
                  <div className="space-y-1">
                    <div className="text-burrow-orange font-bold">
                      {formatNumber(beaver.hourlyRate)} $BURR/hour
                    </div>
                    <div className="text-burrow-blue-light text-sm">
                      Cost: {beaver.stakeCost} $STRK
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stake Button */}
          <div className="text-center">
            <button
              onClick={handleStake}
              className="game-button text-white font-bold py-4 px-8 rounded-xl text-lg"
            >
              Buy {GAME_CONFIG.BEAVER_TYPES[selectedBeaver].name} Beaver 
              ({GAME_CONFIG.BEAVER_TYPES[selectedBeaver].stakeCost} $STRK)
            </button>
          </div>
        </div>
      ) : (
        <div className="beaver-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-4xl">{BEAVER_IMAGES[beaverInfo.type.toUpperCase()]}</div>
              <div>
                <h3 className="text-xl font-bold text-white">{beaverInfo.type} Beaver</h3>
                <p className="text-burrow-blue-light">Level {beaverInfo.level}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-burrow-orange font-bold text-lg">
                {formatNumber(beaverInfo.hourlyRate)} $BURR/hour
              </div>
              <div className="text-burrow-blue-light text-sm">
                Since: {new Date(beaverInfo.lastClaim).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="bg-burrow-dark bg-opacity-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-burrow-blue-light text-sm mb-1">Mining Status</div>
              <div className="text-green-400 font-bold text-lg">
                🔥 ACTIVELY MINING 🔥
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakePanel; 