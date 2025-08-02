import React, { useState, useEffect } from 'react';
import { fetchGameAnalytics } from '../utils/starknet';

const GameDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting analytics fetch...');
      
      const data = await fetchGameAnalytics();
      console.log('📊 Received analytics data:', data);
      
      if (data) {
        setAnalytics(data);
        setError(null);
        console.log('✅ Analytics data set successfully');
      } else {
        console.log('❌ No analytics data received');
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Dashboard veri çekme hatası:', err);
      setError('Data fetch error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Update every hour or on page refresh
    const interval = setInterval(fetchAnalytics, 3600000); // 1 hour
    
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    const number = Number(num);
    if (number >= 1000000000000) {
      return (number / 1000000000000).toFixed(1) + 'T';
    } else if (number >= 1000000000) {
      return (number / 1000000000).toFixed(1) + 'B';
    } else if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    } else {
      return number.toLocaleString();
    }
  };

  const formatBalance = (balance, decimals = 18) => {
    try {
      if (!balance) return '0';
      
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      
      const wholePart = balanceBigInt / divisor;
      const remainder = balanceBigInt % divisor;
      
      const wholeNumber = Number(wholePart);
      const fractionalNumber = Number(remainder) / Math.pow(10, decimals);
      const totalNumber = wholeNumber + fractionalNumber;
      
      return formatNumber(totalNumber);
    } catch (error) {
      return '0';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner"></div>
          <div style={{ color: 'var(--text-light)' }}>Loading game statistics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-error">
          <div className="dashboard-error-icon">⚠️</div>
          <div>{error}</div>
                      <button 
              onClick={fetchAnalytics}
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
            >
              Try Again
            </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="dashboard-card">
      <h2 style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        marginBottom: '30px',
        textAlign: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🎮</span>
        Game Statistics
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Beaver İstatistikleri */}
        <div className="dashboard-section dashboard-section-orange">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px',
            color: 'var(--accent-orange)'
          }}>
            <span>🦫</span>
            Beaver Statistics
          </h3>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div className="dashboard-stat-card">
                              <div className="dashboard-stat-label">
                  Total Staked Beavers
                </div>
              <div className="dashboard-stat-value orange">
                {analytics.total_beavers_staked?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div className="dashboard-stat-card">
                              <div className="dashboard-stat-label">
                  Active Users
                </div>
              <div className="dashboard-stat-value green">
                {analytics.active_users?.toLocaleString() || '0'}
              </div>
            </div>
            

          </div>
        </div>
        
        {/* Beaver Türleri */}
        <div className="dashboard-section dashboard-section-blue">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px',
            color: 'var(--accent-blue)'
          }}>
            <span>📊</span>
            Beaver Types
          </h3>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div className="dashboard-stat-card">
                              <div className="dashboard-stat-label">
                  Noob Beavers
                </div>
              <div className="dashboard-stat-value green">
                {analytics.noob_count?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div className="dashboard-stat-card">
                              <div className="dashboard-stat-label">
                  Pro Beavers
                </div>
              <div className="dashboard-stat-value blue">
                {analytics.pro_count?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div className="dashboard-stat-card">
                              <div className="dashboard-stat-label">
                  Degen Beavers
                </div>
              <div className="dashboard-stat-value purple">
                {analytics.degen_count?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </div>
        

      </div>
      
      {/* Test Button */}
      
      

    </div>
  );
};

export default GameDashboard; 