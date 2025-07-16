import React from 'react';
import { formatAddress, formatNumber } from '../utils/constants';

const WalletInfo = ({ 
  walletAddress, 
  burrBalance, 
  totalEarned, 
  daysLeft, 
  hoursLeft 
}) => {
  return (
    <div className="bg-burrow-dark bg-opacity-80 rounded-2xl p-6 border-2 border-burrow-blue">
      <h2 className="text-xl font-bold text-burrow-orange mb-4 font-comic">
        🏦 Wallet Info
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Address */}
        <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-4">
          <div className="text-burrow-blue-light text-sm mb-1">Address</div>
          <div className="text-white font-mono text-lg">
            {formatAddress(walletAddress)}
          </div>
        </div>

        {/* BURR Balance */}
        <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-4">
          <div className="text-burrow-blue-light text-sm mb-1">$BURR Balance</div>
          <div className="text-burrow-orange font-bold text-lg">
            {formatNumber(burrBalance)}
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-4">
          <div className="text-burrow-blue-light text-sm mb-1">Total Earned</div>
          <div className="text-green-400 font-bold text-lg">
            {formatNumber(totalEarned)} $BURR
          </div>
        </div>

        {/* Game Countdown */}
        <div className="bg-burrow-brown bg-opacity-20 rounded-xl p-4">
          <div className="text-burrow-blue-light text-sm mb-1">Game Ends In</div>
          <div className="text-red-400 font-bold text-lg">
            {daysLeft}d {hoursLeft}h
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletInfo; 