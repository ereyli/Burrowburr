import React from 'react';

const BeaverLoader = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      {/* Animated Beaver */}
      <div className="relative">
        <img 
          src="/beaver_logo.png" 
          alt="Loading Beaver" 
          className="w-16 h-16 animate-bounce"
        />
        {/* Mining pickaxe animation */}
        <div className="absolute -bottom-2 -right-2 animate-pulse">
          ⛏️
        </div>
      </div>
      
      {/* Loading message */}
      <div className="text-burrow-orange font-bold text-lg text-center">
        {message}
      </div>
      
      {/* Loading dots animation */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-burrow-orange rounded-full animate-pulse delay-0"></div>
        <div className="w-2 h-2 bg-burrow-orange rounded-full animate-pulse delay-150"></div>
        <div className="w-2 h-2 bg-burrow-orange rounded-full animate-pulse delay-300"></div>
      </div>
      
      {/* Fun message */}
      <div className="text-burrow-blue-light text-sm text-center max-w-xs flex items-center justify-center gap-2">
        <img src="/beaver_logo.png" alt="Beaver" className="w-5 h-5" />
        Your beaver is working hard to process this request...
      </div>
    </div>
  );
};

export default BeaverLoader; 