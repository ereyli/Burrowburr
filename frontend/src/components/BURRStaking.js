import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchStakingData, 
  stakeTokens, 
  unstakeTokens, 
  claimRewards,
  checkBurrBalance,
  checkBurrAllowance 
} from '../utils/starknet';

const BURRStaking = ({ isConnected, walletAddress, burrBalance }) => {
  // State variables
  const [stakingData, setStakingData] = useState({
    stakedAmount: 0,
    pendingRewards: 0,
    totalStaked: 0,
    rewardPool: 0,
    apy: 70,
    unstakeAmount: 0,
    canWithdraw: false,
    withdrawalDate: null
  });
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to safely get values
  const safeGetValue = (value) => {
    console.log('🔍 safeGetValue input:', value, 'type:', typeof value);
    if (typeof value === 'string') {
      // If it's a BigInt string (wei), convert to BURR
      if (value.length > 10 && !value.includes('M') && !value.includes('K') && !value.includes('B') && !value.includes('T')) {
        const weiAmount = BigInt(value);
        const burrAmount = Number(weiAmount) / Math.pow(10, 18);
        console.log('🔍 Converting wei to BURR:', value, '→', burrAmount);
        return burrAmount;
      }
      // If it's a formatted string (M, K, etc.)
      if (value.includes('M')) {
        return parseFloat(value.replace('M', '')) * 1000000;
      }
      if (value.includes('K')) {
        return parseFloat(value.replace('K', '')) * 1000;
      }
      if (value.includes('B')) {
        return parseFloat(value.replace('B', '')) * 1000000000;
      }
      if (value.includes('T')) {
        return parseFloat(value.replace('T', '')) * 1000000000000;
      }
      return parseFloat(value) || 0;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return Number(value) || 0;
  };

  // Format balance for display
  const formatBalance = (balance) => {
    if (typeof balance === 'number') {
      if (balance >= 1000000) {
        return (balance / 1000000).toFixed(1) + 'M';
      }
      if (balance >= 1000) {
        return (balance / 1000).toFixed(1) + 'K';
      }
      return balance.toLocaleString();
    }
    return '0';
  };

  // Update staking data
  const updateStakingData = useCallback(async () => {
    try {
      if (isConnected && walletAddress) {
        console.log('🔍 Fetching staking data for connected wallet:', walletAddress);
        const data = await fetchStakingData(walletAddress);
        console.log('📊 Raw staking data received:', data);
        console.log('📊 Staked amount from data:', data.stakedAmount || data.userStaked);
        console.log('📊 Pending rewards from data:', data.pendingRewards);
        
        // Enhanced data processing
        const processedData = {
          stakedAmount: data.stakedAmount || data.userStaked || 0,
          pendingRewards: data.pendingRewards || 0,
          totalStaked: data.totalStaked || 0,
          rewardPool: data.rewardPool || 0,
          apy: data.apy || 70,
          unstakeAmount: data.unstakeAmount || 0,
          canWithdraw: data.canWithdraw || false,
          withdrawalDate: data.withdrawalDate || null
        };
        
        console.log('📊 Processed staking data:', processedData);
        setStakingData(processedData);
      } else {
        console.log('🔍 Fetching global staking data (wallet not connected)...');
        try {
          const data = await fetchStakingData('0x0000000000000000000000000000000000000000');
          console.log('📊 Global staking data fetched:', data);
          setStakingData(prev => ({
            ...prev,
            totalStaked: data.totalStaked || 0,
            rewardPool: data.rewardPool || 0,
            apy: data.apy || 70
          }));
        } catch (globalError) {
          console.log('⚠️ Could not fetch global data, using defaults');
          setStakingData(prev => ({
            ...prev,
            totalStaked: 0,
            rewardPool: 0,
            apy: 70
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching staking data:', error);
      console.error('❌ Error details:', error.message);
    }
  }, [isConnected, walletAddress]);

  // Effect to update data
  useEffect(() => {
    updateStakingData();
    const interval = setInterval(updateStakingData, 30000);
    return () => clearInterval(interval);
  }, [updateStakingData]);

  // Handle stake
  const handleStake = async () => {
    if (!isConnected || !stakeAmount) return;
    
    setIsLoading(true);
    try {
      await stakeTokens(stakeAmount);
      setStakeAmount('');
      await updateStakingData();
    } catch (error) {
      console.error('❌ Staking failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unstake
  const handleUnstake = async () => {
    if (!isConnected || !unstakeAmount) return;
    
    setIsLoading(true);
    try {
      await unstakeTokens(unstakeAmount);
      setUnstakeAmount('');
      await updateStakingData();
    } catch (error) {
      console.error('❌ Unstaking failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle claim
  const handleClaim = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      await claimRewards(walletAddress);
      await updateStakingData();
    } catch (error) {
      console.error('❌ Claiming failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Initiating withdrawal...');
      
      // Import the withdraw function from starknet utils
      const { withdrawUnstaked } = await import('../utils/starknet');
      
      // Call the withdraw function
      await withdrawUnstaked();
      
      console.log('✅ Withdrawal successful!');
      await updateStakingData();
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      alert(`Withdrawal failed: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      borderRadius: '15px',
      padding: '0',
      margin: '20px auto',
      maxWidth: '1200px',
      border: '3px solid #ff6b35',
      overflow: 'hidden'
    }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        padding: '15px',
        textAlign: 'center',
        borderBottom: '2px solid #ff6b35'
      }}>
        <h2 style={{
          color: '#ff6b35',
          margin: '0',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontWeight: '700'
        }}>
          <img src="/beaver_logo.png" alt="Beaver" style={{ width: '24px', height: '24px' }} />
          BURR Staking
        </h2>
        <p style={{
          color: 'var(--text-light)',
          margin: '8px 0 0 0',
          fontSize: '0.9rem'
        }}>
          Earn passive rewards by staking your BURR tokens
        </p>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        {/* Portfolio Overview */}
        <div style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '2px solid #ff6b35',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            color: '#ff6b35',
            fontSize: '1.2rem',
            fontWeight: '700',
            margin: '0 0 20px 0'
          }}>
            Your Portfolio
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'rgba(26, 26, 46, 0.8)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid rgba(255, 107, 53, 0.3)'
            }}>
              <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '6px' }}>Staked Amount</div>
              <div style={{ color: '#ff6b35', fontSize: '1.4rem', fontWeight: '700' }}>
                {isConnected ? 
                  `${safeGetValue(stakingData.stakedAmount).toLocaleString()} BURR` : 
                  'Connect Wallet'
                }
              </div>
            </div>
            <div style={{
              background: 'rgba(26, 26, 46, 0.8)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid rgba(255, 107, 53, 0.3)'
            }}>
              <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '6px' }}>Total Staked by All Users</div>
              <div style={{ color: '#ff6b35', fontSize: '1.4rem', fontWeight: '700' }}>
                {safeGetValue(stakingData.totalStaked).toLocaleString()} BURR
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #ff6b35, #e55039)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #ff6b35'
            }}>
              <div style={{ color: 'white', fontSize: '0.85rem', marginBottom: '6px' }}>Current APY</div>
              <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: '700' }}>
                {safeGetValue(stakingData.apy).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Action Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Stake Panel */}
          <div style={{
            background: 'rgba(255, 107, 53, 0.1)',
            border: '2px solid #ff6b35',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              color: '#ff6b35',
              fontSize: '1.1rem',
              fontWeight: '700',
              margin: '0 0 16px 0'
            }}>
              Stake BURR
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                color: 'var(--text-light)',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                Amount to Stake:
              </label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 107, 53, 0.5)',
                  background: 'rgba(26, 26, 46, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                disabled={!isConnected}
              />
            </div>
            <div style={{
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-light)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Available:</span>
              <span style={{ fontWeight: '600', color: '#ff6b35' }}>
                {isConnected ? `${burrBalance} BURR` : '0.00 BURR'}
              </span>
            </div>
            <button
              onClick={handleStake}
              disabled={!isConnected || isLoading || !stakeAmount}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isConnected && stakeAmount 
                  ? 'linear-gradient(135deg, #ff6b35, #e55039)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnected && stakeAmount ? 'pointer' : 'not-allowed',
                opacity: isConnected && stakeAmount ? 1 : 0.5,
                transition: 'all 0.3s ease'
              }}
            >
              {isLoading ? 'Processing...' : 'Stake BURR'}
            </button>
          </div>

          {/* Unstake Panel */}
          <div style={{
            background: 'rgba(255, 107, 53, 0.1)',
            border: '2px solid #ff6b35',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              color: '#ff6b35',
              fontSize: '1.1rem',
              fontWeight: '700',
              margin: '0 0 16px 0'
            }}>
              Unstake BURR
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                color: 'var(--text-light)',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                Amount to Unstake:
              </label>
              <input
                type="number"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 107, 53, 0.5)',
                  background: 'rgba(26, 26, 46, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                disabled={!isConnected}
              />
            </div>
            <div style={{
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-light)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Staked:</span>
              <span style={{ fontWeight: '600', color: '#ff6b35' }}>
                {safeGetValue(stakingData.stakedAmount).toLocaleString()} BURR
              </span>
            </div>
            <button
              onClick={handleUnstake}
              disabled={!isConnected || isLoading || !unstakeAmount}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isConnected && unstakeAmount 
                  ? 'linear-gradient(135deg, #ff6b35, #e55039)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnected && unstakeAmount ? 'pointer' : 'not-allowed',
                opacity: isConnected && unstakeAmount ? 1 : 0.5,
                transition: 'all 0.3s ease'
              }}
            >
              {isLoading ? 'Processing...' : 'Unstake BURR'}
            </button>
          </div>

          {/* Claim Rewards */}
          <div style={{
            background: 'rgba(255, 107, 53, 0.1)',
            border: '2px solid #ff6b35',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#ff6b35',
              fontSize: '1.1rem',
              fontWeight: '700',
              margin: '0 0 16px 0'
            }}>
              Claim Rewards
            </h3>
            <div style={{
              background: 'rgba(26, 26, 46, 0.8)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(255, 107, 53, 0.3)'
            }}>
              <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '6px' }}>Available Rewards</div>
              <div style={{ color: '#ff6b35', fontSize: '1.4rem', fontWeight: '700' }}>
                {isConnected ? 
                  `${safeGetValue(stakingData.pendingRewards).toLocaleString()} BURR` : 
                  'Connect Wallet'
                }
              </div>
            </div>
            <button
              onClick={handleClaim}
              disabled={!isConnected || isLoading || safeGetValue(stakingData.pendingRewards) <= 0}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isConnected && safeGetValue(stakingData.pendingRewards) > 0 
                  ? 'linear-gradient(135deg, #ff6b35, #e55039)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnected && safeGetValue(stakingData.pendingRewards) > 0 ? 'pointer' : 'not-allowed',
                opacity: isConnected && safeGetValue(stakingData.pendingRewards) > 0 ? 1 : 0.5,
                transition: 'all 0.3s ease'
              }}
            >
              {isLoading ? 'Processing...' : 'Claim Rewards'}
            </button>
          </div>

          {/* Withdraw Unstaked */}
          <div style={{
            background: 'rgba(255, 107, 53, 0.1)',
            border: '2px solid #ff6b35',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#ff6b35',
              fontSize: '1.1rem',
              fontWeight: '700',
              margin: '0 0 16px 0'
            }}>
              Locked Tokens
            </h3>
            <div style={{
              background: 'rgba(26, 26, 46, 0.8)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(255, 107, 53, 0.3)'
            }}>
              <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '6px' }}>Available After 30 Days</div>
              <div style={{ color: '#ff6b35', fontSize: '1.4rem', fontWeight: '700' }}>
                {safeGetValue(stakingData.unstakeAmount).toLocaleString()} BURR
              </div>
            </div>
            {stakingData.withdrawalDate && (
              <div style={{
                marginBottom: '16px',
                fontSize: '0.85rem',
                color: stakingData.canWithdraw ? '#4CAF50' : '#ff6b35',
                fontWeight: '600'
              }}>
                {stakingData.withdrawalDate 
                  ? `Available: ${stakingData.withdrawalDate.toLocaleDateString()}`
                  : 'No locked tokens'
                }
              </div>
            )}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || isLoading || !stakingData.canWithdraw || safeGetValue(stakingData.unstakeAmount) <= 0}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isConnected && stakingData.canWithdraw && safeGetValue(stakingData.unstakeAmount) > 0 
                  ? 'linear-gradient(135deg, #ff6b35, #e55039)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnected && stakingData.canWithdraw && safeGetValue(stakingData.unstakeAmount) > 0 ? 'pointer' : 'not-allowed',
                opacity: isConnected && stakingData.canWithdraw && safeGetValue(stakingData.unstakeAmount) > 0 ? 1 : 0.5,
                transition: 'all 0.3s ease'
              }}
            >
              {isLoading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>

      {/* Information Footer */}
      <div style={{
        background: 'rgba(255, 107, 53, 0.1)',
        padding: '15px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-light)',
        borderTop: '1px solid rgba(255, 107, 53, 0.3)'
      }}>
        <div style={{
          color: '#ff6b35',
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          How BURR Staking Works
        </div>
        <div style={{
          color: 'var(--text-light)',
          fontSize: '0.85rem',
          lineHeight: '1.6'
        }}>
          Stake your BURR tokens to earn passive rewards from the ecosystem. 
          Unstaking initiates a 30-day withdrawal period for security. 
          Your rewards compound automatically while staked.
        </div>
      </div>
    </div>
  );
};

export default BURRStaking;