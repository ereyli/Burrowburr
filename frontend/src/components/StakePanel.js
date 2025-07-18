import React, { useState } from 'react';
import { GAME_CONFIG, BeaverImage, BEAVER_DESCRIPTIONS, formatNumber } from '../utils/constants';

const StakePanel = ({ hasStaked, beaverInfo, onStake }) => {
  const [selectedBeaver, setSelectedBeaver] = useState('NOOB');

  const handleStake = () => {
    onStake(selectedBeaver);
  };

  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-brown">
              <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic flex items-center space-x-2">
          <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
          <span>Beaver Station</span>
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
                    ? 'border-burrow-orange bg-burrow-brown bg-opacity-30 burrow-glow'
                    : 'border-burrow-brown bg-burrow-brown bg-opacity-10 hover:bg-opacity-20'
                }`}
                onClick={() => setSelectedBeaver(key)}
              >
                <div className="text-center">
                  <div className="mb-2">
                    <BeaverImage 
                      type={key} 
                      size="w-16 h-16" 
                      isActive={selectedBeaver === key}
                    />
                  </div>
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
              className="game-button text-white font-bold py-3 px-8 rounded-lg text-lg hover:scale-105 transition-transform"
            >
              ⛏️ Stake {GAME_CONFIG.BEAVER_TYPES[selectedBeaver].name} Beaver
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-4 bg-burrow-brown bg-opacity-10 rounded-xl p-6 burrow-glow">
            <BeaverImage 
              type={beaverInfo.type} 
              size="w-20 h-20" 
              isActive={true}
              showMining={true}
            />
            <div>
              <h3 className="text-xl font-bold text-white">
                {GAME_CONFIG.BEAVER_TYPES[beaverInfo.type.toUpperCase()]?.name || 'Unknown'} Beaver
              </h3>
              <p className="text-burrow-blue-light">Level {beaverInfo.level || 1}</p>
              <p className="text-green-400 text-sm font-medium">🔥 ACTIVELY MINING 🔥</p>
            </div>
          </div>
          
          <div className="text-burrow-orange font-bold text-lg coin-sparkle">
            Currently Mining: {formatNumber(beaverInfo.hourlyRate || 0)} $BURR/hour
          </div>
          
          <div className="text-green-400 text-sm">
            Your beaver is working hard to mine $BURR tokens! ⛏️
          </div>
        </div>
      )}
    </div>
  );
};

export default StakePanel; 