import React from 'react';
import { CONTRACT_ADDRESSES, SOCIAL_LINKS, formatAddress } from '../utils/constants';

const TwitterLogo = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-white hover:text-burrow-orange transition-all duration-300 hover:scale-110">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DexScreenerLogo = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-white hover:text-burrow-orange transition-all duration-300 hover:scale-110">
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M2 8h20M8 21V8M16 21V8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="14" r="2" fill="currentColor"/>
    <path d="M6 12l2 2 2-2M14 16l2-2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="4" y="4.5" width="2" height="1.5" fill="currentColor"/>
    <rect x="7" y="4.5" width="2" height="1.5" fill="currentColor"/>
    <rect x="10" y="4.5" width="2" height="1.5" fill="currentColor"/>
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-burrow-dark border-t-2 border-burrow-brown p-6 mt-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Social Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-burrow-orange mb-4 font-comic">
              🌐 Community
            </h3>
            <div className="space-y-5">
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start space-x-4 text-burrow-blue-light hover:text-white transition-all duration-300 group bg-burrow-brown bg-opacity-10 hover:bg-opacity-20 rounded-lg p-3 hover:shadow-lg"
              >
                <TwitterLogo />
                <span className="text-lg font-semibold group-hover:text-burrow-orange transition-colors">Follow on X</span>
              </a>
              <a
                id="dexscreener-section"
                href={SOCIAL_LINKS.dexscreener}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start space-x-4 text-burrow-blue-light hover:text-white transition-all duration-300 group bg-burrow-brown bg-opacity-10 hover:bg-opacity-20 rounded-lg p-3 hover:shadow-lg"
              >
                <DexScreenerLogo />
                <span className="text-lg font-semibold group-hover:text-burrow-orange transition-colors">View on DexScreener</span>
              </a>
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-burrow-orange mb-3 font-comic">
              📜 Contracts
            </h3>
            <div className="space-y-2">
              <div className="bg-burrow-brown bg-opacity-20 rounded-lg p-2">
                <div className="text-burrow-blue-light text-xs">$BURR Token</div>
                <div className="text-white font-mono text-sm">
                  {formatAddress(CONTRACT_ADDRESSES.BURR_TOKEN)}
                </div>
              </div>
              <div className="bg-burrow-brown bg-opacity-20 rounded-lg p-2">
                <div className="text-burrow-blue-light text-xs">Burrow Game</div>
                <div className="text-white font-mono text-sm">
                  {formatAddress(CONTRACT_ADDRESSES.BURROW_GAME)}
                </div>
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="text-center md:text-right">
            <h3 className="text-lg font-bold text-burrow-orange mb-3 font-comic">
              Game Info
            </h3>
            <div className="space-y-2 text-burrow-blue-light text-sm">
              <div>Built on Starknet</div>
              <div>365-day mining period</div>
              <div>700M $BURR total rewards</div>
              <div className="flex items-center justify-center md:justify-end text-burrow-orange font-bold space-x-2">
                <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
                <span>Let's dig together!</span>
                <img src="/beaver_logo.png" alt="Beaver" className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-burrow-brown mt-6 pt-4 text-center">
          <p className="text-burrow-blue-light text-sm">
            © 2025 BurrowGame. Built with ❤️ for the meme mining community on Starknet.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 