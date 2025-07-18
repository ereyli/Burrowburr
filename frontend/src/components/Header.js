import React from 'react';

const Header = ({ isConnected, onConnect }) => {
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {/* BURR Buy Button */}
          <button
            onClick={() => {
              const dexSection = document.getElementById('dexscreener-section');
              if (dexSection) {
                dexSection.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }
            }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer text-sm transition-all duration-300 hover:scale-105 shadow-lg"
            style={{border: 'none'}}
          >
            💰 Buy $BURR
          </button>

          {/* Wallet Connection */}
          {!isConnected ? (
            <button
              onClick={onConnect}
              className="game-button text-white font-bold py-2 px-4 rounded-lg cursor-pointer text-sm"
              style={{border: 'none'}}
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center space-x-2 rounded-lg px-3 py-1" style={{backgroundColor: 'rgba(139, 69, 19, 0.3)'}}>
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