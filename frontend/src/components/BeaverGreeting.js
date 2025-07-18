import React, { useState, useEffect } from 'react';
import { BeaverImage } from '../utils/constants';

const BeaverGreeting = ({ isConnected, beaverType = 'NOOB' }) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const greetingMessages = [
    "Welcome to Burrow Game!",
    "⛏️ Ready to mine some $BURR?",
    "💎 Let's dig for treasure!",
    "Your beaver adventure awaits!",
    "Time to level up your beaver!",
    "The mining season is here!"
  ];

  const connectedMessages = [
    "Great mining, beaver!",
    "⛏️ Keep digging deeper!",
    "💎 Your beaver is working hard!",
    "Amazing $BURR collection!",
    "🔥 Mining like a pro!",
    "⭐ You're a beaver legend!"
  ];

  const messages = isConnected ? connectedMessages : greetingMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="bg-gradient-to-r from-burrow-dark to-burrow-brown bg-opacity-20 rounded-2xl p-6 mb-6 border-2 border-burrow-orange border-opacity-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block">
            <BeaverImage 
              type={beaverType} 
              size="w-12 h-12" 
              isActive={isConnected}
              showMining={isConnected}
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-burrow-orange font-comic mb-1">
              Burrow Game
            </h1>
            <p 
              key={currentMessage}
              className="text-burrow-blue-light text-lg animate-pulse"
            >
              {messages[currentMessage]}
            </p>
          </div>
        </div>
        
        {/* Stats indicator */}
        <div className="hidden md:flex flex-col items-end space-y-1">
          <div className="text-burrow-orange text-sm font-bold">
            700M $BURR Pool
          </div>
          <div className="text-green-400 text-sm">
            365 Day Mining
          </div>
          <div className="text-blue-400 text-sm">
            🏗️ Built on Starknet
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeaverGreeting; 