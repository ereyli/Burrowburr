import React, { useState, useEffect } from 'react';
import { formatNumber } from '../utils/constants';
import { fetchTokenInfo } from '../utils/starknet';

const TokenInfo = () => {
  const [tokenData, setTokenData] = useState({
    totalSupply: "Loading...",
    circulatingSupply: "Loading...",
    totalBurned: "Loading...",
    name: "BURR",
    symbol: "BURR"
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTokenInfo = async () => {
      try {
        const data = await fetchTokenInfo();
        setTokenData(data);
      } catch (error) {
        console.error('Error loading token info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTokenInfo();
    
    // Refresh token info every 10 minutes
    const interval = setInterval(loadTokenInfo, 600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card">
      <h2>
        🪙 $BURR Token Info
      </h2>
      
      <div className="grid grid-3">
        {/* Total Supply */}
        <div className="info-box">
          <div className="info-label">Total Supply</div>
          <div className="info-value orange">
            {isLoading ? "Loading..." : tokenData.totalSupply}
          </div>
          <div style={{color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '5px'}}>$BURR</div>
        </div>

        {/* Circulating Supply */}
        <div className="info-box">
          <div className="info-label">Circulating Supply</div>
          <div className="info-value orange">
            {isLoading ? "Loading..." : tokenData.circulatingSupply}
          </div>
          <div style={{color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '5px'}}>$BURR</div>
        </div>

        {/* Total Burned */}
        <div className="info-box">
          <div className="info-label">Total Burned</div>
          <div className="info-value red">
            {isLoading ? "Loading..." : tokenData.totalBurned}
          </div>
          <div style={{color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '5px'}}>$BURR</div>
        </div>
      </div>

      {/* Additional Info */}
      <div style={{textAlign: 'center', marginTop: '15px'}}>
        <div style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>
          🔄 Updates every 10 minutes • Built on Starknet
        </div>
      </div>
    </div>
  );
};

export default TokenInfo; 