import React from 'react';
import { CURRENT_NETWORK, NETWORKS } from '../utils/constants.js';

const Header = ({ isConnected, onConnect }) => {
  const getNetworkColor = () => {
    return CURRENT_NETWORK === NETWORKS.MAINNET ? 'text-green-400' : 'text-yellow-400';
  };

  const getNetworkIcon = () => {
    return CURRENT_NETWORK === NETWORKS.MAINNET ? '●' : '●';
  };

  return (
    <header className="bg-burrow-dark border-b-2 border-burrow-brown p-3">
      <div className="max-w-5xl flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <img 
            src="/beaver_logo.png" 
            alt="Burrow Beaver" 
            className="w-10 h-10 transition-transform duration-300 hover:scale-110"
          />
          <h1 className="text-2xl font-bold text-burrow-orange font-comic">
            Burrow
          </h1>
          {/* Network Indicator */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-800 ${getNetworkColor()}`}>
            <span className="text-xs">{getNetworkIcon()}</span>
            <span className="text-xs font-semibold uppercase">
              {CURRENT_NETWORK}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {/* MemeHub Button */}
          <a
            href="https://www.memehubai.fun/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg cursor-pointer text-sm transition-all duration-300 hover:scale-105 shadow-lg"
            style={{
              border: 'none', 
              textDecoration: 'none',
              padding: '10px 16px',
              minWidth: '120px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🎭 MemeHub
          </a>

          {/* BURR Buy Button */}
          <a
            href="https://app.avnu.fi/en/burr-strk"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg cursor-pointer text-sm transition-all duration-300 hover:scale-105 shadow-lg"
            style={{
              border: 'none', 
              textDecoration: 'none',
              padding: '10px 16px',
              minWidth: '120px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Buy $BURR
          </a>

          {/* Market Statistics Button */}
          <button
            onClick={() => {
              const tokenStatsElement = document.querySelector('[data-token-stats]');
              if (tokenStatsElement) {
                tokenStatsElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            style={{
              background: 'linear-gradient(45deg, #3b82f6, #06b6d4)',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '10px 16px',
              minWidth: '120px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
            }}
          >
            📊 Market Stats
          </button>

          {/* View Contract Button */}
          <button
            onClick={() => {
              const tokenStatsElement = document.querySelector('[data-token-stats]');
              if (tokenStatsElement) {
                tokenStatsElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            style={{
              background: '#4b5563',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '10px 16px',
              minWidth: '120px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(75, 85, 99, 0.4)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.background = '#374151';
              e.target.style.boxShadow = '0 6px 20px rgba(75, 85, 99, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.background = '#4b5563';
              e.target.style.boxShadow = '0 4px 15px rgba(75, 85, 99, 0.4)';
            }}
          >
            📄 View Contract
          </button>

          {/* Wallet Connection */}
          {!isConnected ? (
            <button
              onClick={onConnect}
              className="game-button text-white font-bold rounded-lg cursor-pointer text-sm"
              style={{
                border: 'none',
                padding: '10px 16px',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <div 
              className="flex items-center space-x-2 rounded-lg" 
              style={{
                backgroundColor: 'rgba(139, 69, 19, 0.3)',
                padding: '10px 16px',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--green-400)'}}></div>
              <span className="text-burrow-blue-light font-medium text-sm">
                Connected
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 