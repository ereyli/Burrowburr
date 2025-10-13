import React from 'react';

const TokenStats = () => {
  return (
    <div 
      data-token-stats
      className="card" 
      style={{
        margin: '20px auto',
        maxWidth: '1000px',
        padding: '0',
        overflow: 'hidden',
        borderRadius: '15px',
        border: '3px solid #ff6b35'
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        padding: '15px',
        textAlign: 'center',
        borderBottom: '2px solid #ff6b35'
      }}>
        <h2 style={{
          color: '#ff6b35',
          margin: '0',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <img src="/beaver_logo.png" alt="Beaver" style={{ width: '20px', height: '20px' }} />
          🪙 $BURR Token Statistics
        </h2>
        <p style={{
          color: 'var(--text-light)',
          margin: '8px 0 0 0',
          fontSize: '0.8rem'
        }}>
          Real-time data, charts, and analytics for Starknet
        </p>
      </div>
      
      <iframe 
        src="https://app.avnu.fi/en/market/burr" 
        width="100%" 
        height="500px"
        frameBorder="0"
        style={{
          border: 'none',
          borderRadius: '0 0 15px 15px'
        }}
        title="BURR Token Statistics"
        loading="lazy"
      />
      
      <div style={{
        background: 'rgba(255, 107, 53, 0.1)',
        padding: '10px',
        textAlign: 'center',
        fontSize: '0.7rem',
        color: 'var(--text-light)',
        borderTop: '1px solid rgba(255, 107, 53, 0.3)'
      }}>
        <p style={{ margin: '0' }}>
          📊 Data provided by <strong>AVNU DEX</strong> - Real-time market information
        </p>
      </div>
    </div>
  );
};

export default TokenStats;
