import React from 'react';

const Header = ({ isConnected, onConnect }) => {
  return (
    <header className="bg-burrow-dark border-b-2 border-burrow-brown p-4">
      <div className="max-w-6xl flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="text-4xl">🦫</div>
          <h1 className="text-3xl font-bold text-burrow-orange font-comic">
            Burrow
          </h1>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center space-x-4">
          {!isConnected ? (
            <button
              onClick={onConnect}
              className="game-button text-white font-bold py-3 px-6 rounded-xl cursor-pointer"
              style={{border: 'none'}}
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center space-x-2 rounded-xl px-4 py-2" style={{backgroundColor: 'rgba(139, 69, 19, 0.3)'}}>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: 'var(--green-400)'}}></div>
              <span className="text-burrow-blue-light font-medium">
                Wallet Connected
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 