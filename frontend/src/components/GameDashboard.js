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
    
    // Update every 5 minutes or on page refresh
    const interval = setInterval(fetchAnalytics, 300000); // 5 minutes
    
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

  // Mining timeline calculation
  const calculateMiningTimeline = () => {
    if (!analytics) return null;

    const TOTAL_SUPPLY = 2100000000; // 2.1B total supply
    const LP_RESERVE = 100000000; // 100M for LP
    const MINING_SUPPLY = TOTAL_SUPPLY - LP_RESERVE; // 2B for mining

    // Mining start date: August 30, 2024 (4 days ago)
    const MINING_START_DATE = new Date('2024-08-30T00:00:00Z');
    const now = new Date();
    const daysSinceStart = (now - MINING_START_DATE) / (1000 * 60 * 60 * 24);

    // Hourly rates for each beaver type (level 1)
    const NOOB_HOURLY_RATE = 300; // 300 BURR/hour
    const PRO_HOURLY_RATE = 750; // 750 BURR/hour  
    const DEGEN_HOURLY_RATE = 2250; // 2250 BURR/hour

    // Calculate current daily distribution
    const currentDailyDistribution = 
      (Number(analytics.noob_count || 0) * NOOB_HOURLY_RATE * 24) +
      (Number(analytics.pro_count || 0) * PRO_HOURLY_RATE * 24) +
      (Number(analytics.degen_count || 0) * DEGEN_HOURLY_RATE * 24);

    // Calculate total earned so far (4 days of mining with current beaver count)
    const totalEarned = currentDailyDistribution * 4; // 4 days since start

    // Calculate already distributed tokens from contract
    const DECIMALS = 18;
    const alreadyClaimed = Number(analytics.total_burr_claimed || 0) / Math.pow(10, DECIMALS);
    const alreadyBurned = Number(analytics.total_burr_burned || 0) / Math.pow(10, DECIMALS);
    const alreadyDistributed = alreadyClaimed + alreadyBurned;
    
    // Calculate remaining supply for mining
    const remainingSupply = MINING_SUPPLY - alreadyDistributed;
    
    // Calculate days remaining based on current daily distribution
    const daysRemaining = currentDailyDistribution > 0 ? (remainingSupply / currentDailyDistribution) : 0;
    
    // Calculate estimated end date
    const estimatedEndDate = daysRemaining > 0 
      ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
      : null;

    return {
      dailyDistribution: currentDailyDistribution,
      remainingSupply,
      daysRemaining,
      estimatedEndDate,
      alreadyDistributed,
      alreadyClaimed,
      alreadyBurned,
      totalEarned,
      daysSinceStart: Math.floor(daysSinceStart)
    };
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

  const miningTimeline = calculateMiningTimeline();

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

        {/* Mining Timeline */}
        <div className="dashboard-section dashboard-section-purple">
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px',
            color: 'var(--accent-purple)'
          }}>
            <span>⏰</span>
            Mining Timeline
          </h3>
          
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-light)', 
            marginBottom: '15px',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            More beavers sold or levels upgraded = faster circulation of total supply
          </div>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">
                Total Earned
              </div>
              <div className="dashboard-stat-value green">
                {miningTimeline ? formatNumber(miningTimeline.totalEarned) + ' BURR' : '0 BURR'}
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">
                Daily Distribution
              </div>
              <div className="dashboard-stat-value orange">
                {miningTimeline ? formatNumber(miningTimeline.dailyDistribution) + ' BURR' : '0 BURR'}
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">
                Days Remaining
              </div>
              <div className="dashboard-stat-value yellow">
                {miningTimeline ? Math.ceil(miningTimeline.daysRemaining) + ' days' : '∞'}
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