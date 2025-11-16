/* eslint-env es2020 */
/* global BigInt */
import React, { useState, useEffect, useCallback } from 'react';
import { CONTRACT_ADDRESSES, BURR_TOKEN_ADDRESS } from './utils/constants';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  connectWallet as connectStarknetWallet,
  disconnectWallet,
  autoReconnectWallet,
  wasWalletConnected,
  startConnectionMonitor,
  stopConnectionMonitor,
  maintainConnection,
  fetchBalances,
  fetchPlayerInfo,
  stakeBeaver as stakeStarknetBeaver,
  upgradeBeaver as upgradeStarknetBeaver,
  getConnection,
  fetchPendingRewards
} from './utils/starknet';
import ToastContainer, { showToast } from './components/ToastContainer';
import Header from './components/Header';
import TokenStats from './components/TokenStats';
// import BeaverMiningAnimation from './components/BeaverMiningAnimation'; // Mining ended!
import './index.css';


function App() {
  // Comprehensive error suppression for wallet extensions
  useEffect(() => {
    // Completely disable React error overlay
    if (window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
      window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.dismissRuntimeErrors();
      // Override the showRuntimeErrors function to prevent any errors from showing
      window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.showRuntimeErrors = () => {};
      // Also override the error handler to prevent any errors from being shown
      window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.handleRuntimeError = () => {};
    }

    // Disable React DevTools error reporting
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.suppressErrorOverlay = true;
    }

    // Override console.error to suppress wallet errors from appearing in dev overlay
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('keyring is locked') ||
          message.includes('wallet is locked') ||
          message.includes('chrome-extension') ||
          message.includes('injectedscript') ||
          message.includes('metamask') ||
          message.includes('extension') ||
          message.includes('dmkamcknogkgcdfhhbddcghachkejeap') ||
          message.includes('websocket') ||
          message.includes('ws://localhost:3000/ws') ||
          message.includes('connection refused') ||
          message.includes('keyring') ||
          message.includes('argentx') ||
          message.includes('braavos')) {
        // Silently ignore wallet extension errors and WebSocket errors - no console output at all
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Also override console.warn to catch any warnings
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('keyring is locked') ||
          message.includes('wallet is locked') ||
          message.includes('chrome-extension') ||
          message.includes('injectedscript') ||
          message.includes('metamask') ||
          message.includes('extension') ||
          message.includes('dmkamcknogkgcdfhhbddcghachkejeap') ||
          message.includes('websocket') ||
          message.includes('ws://localhost:3000/ws') ||
          message.includes('connection refused') ||
          message.includes('keyring') ||
          message.includes('argentx') ||
          message.includes('braavos')) {
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    // Suppress runtime errors from wallet extensions
    const handleError = (event) => {
      // Check error message
      if (event.error && event.error.message) {
        const errorMessage = event.error.message.toLowerCase();
        if (errorMessage.includes('keyring is locked') ||
            errorMessage.includes('wallet is locked') ||
            errorMessage.includes('chrome-extension') ||
            errorMessage.includes('injectedscript') ||
            errorMessage.includes('metamask') ||
            errorMessage.includes('extension') ||
            errorMessage.includes('dmkamcknogkgcdfhhbddcghachkejeap') ||
            errorMessage.includes('keyring') ||
            errorMessage.includes('argentx') ||
            errorMessage.includes('braavos')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return false;
        }
      }
      
      // Check filename for extension sources
      if (event.filename && (
          event.filename.includes('chrome-extension') ||
          event.filename.includes('injectedScript') ||
          event.filename.includes('extension') ||
          event.filename.includes('dmkamcknogkgcdfhhbddcghachkejeap'))) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
      
      // Check error stack trace
      if (event.error && event.error.stack) {
        const stackTrace = event.error.stack.toLowerCase();
        if (stackTrace.includes('chrome-extension') ||
            stackTrace.includes('injectedscript') ||
            stackTrace.includes('extension') ||
            stackTrace.includes('dmkamcknogkgcdfhhbddcghachkejeap')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return false;
        }
      }
    };

    // Suppress unhandled promise rejections from wallet extensions
    const handleUnhandledRejection = (event) => {
      if (event.reason) {
        const reasonStr = event.reason.toString().toLowerCase();
        const messageStr = event.reason.message ? event.reason.message.toLowerCase() : '';
        
        if (reasonStr.includes('keyring is locked') ||
            messageStr.includes('keyring is locked') ||
            messageStr.includes('wallet is locked') ||
            messageStr.includes('chrome-extension') ||
            messageStr.includes('injectedscript') ||
            messageStr.includes('metamask') ||
            reasonStr.includes('extension')) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
    };

    // Override window.onerror to prevent browser error popups
    const originalWindowOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const messageStr = message?.toString().toLowerCase() || '';
      const sourceStr = source?.toString().toLowerCase() || '';
      
      if (messageStr.includes('keyring is locked') ||
          messageStr.includes('wallet is locked') ||
          messageStr.includes('chrome-extension') ||
          sourceStr.includes('chrome-extension') ||
          sourceStr.includes('extension')) {
        // Prevent browser from showing error popup
        return true; // true prevents the default browser error handling
      }
      
      if (originalWindowOnError) {
        return originalWindowOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Add event listeners with capture = true to catch errors early
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    return () => {
      // Restore original functions
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.onerror = originalWindowOnError;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  


  // Balances
  const [burrBalance, setBurrBalance] = useState('0'); // Formatted balance for display
  const [burrBalanceRaw, setBurrBalanceRaw] = useState(BigInt(0)); // Raw balance for calculations
  const [strkBalance, setStrkBalance] = useState('0'); // Formatted balance for display
  const [strkBalanceRaw, setStrkBalanceRaw] = useState(BigInt(0)); // Raw balance for calculations
  const [workingStrkAddress, setWorkingStrkAddress] = useState(null);

  // Game state - MINING ENDED!
  const [selectedBeaver, setSelectedBeaver] = useState(1); // 1=Noob, 2=Pro, 3=Degen
  const [miningEnded, setMiningEnded] = useState(true); // Mining has ended!
  
  // Player info from contract
  const [hasStaked, setHasStaked] = useState(false);
  const [beavers, setBeavers] = useState([]);
  const [beaverType, setBeaverType] = useState(0);
  const [beaverLevel, setBeaverLevel] = useState(0);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [realTimePendingRewards, setRealTimePendingRewards] = useState('0');
  const [realTimePendingRewardsRaw, setRealTimePendingRewardsRaw] = useState(0); // Raw number for claim display
  const [localBurrEarned, setLocalBurrEarned] = useState(0);
  const [lastMiningUpdate, setLastMiningUpdate] = useState(Date.now());
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Math.floor(Date.now() / 1000));

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const beaverTypes = {
    1: { name: 'Noob', rate: 300, cost: 50 },
    2: { name: 'Pro', rate: 750, cost: 120 },
    3: { name: 'Degen', rate: 2250, cost: 350 }
  };

  // NEW: Upgrade costs per beaver type and level
  const getUpgradeCost = (beaverType, currentLevel) => {
    const costs = {
      0: { 1: 40000, 2: 80000, 3: 80000, 4: 80000 },    // Noob: 40K, 80K, 80K, 80K
      1: { 1: 80000, 2: 160000, 3: 160000, 4: 160000 }, // Pro: 80K, 160K, 160K, 160K  
      2: { 1: 203000, 2: 406000, 3: 406000, 4: 406000 } // Degen: 203K, 406K, 406K, 406K
    };
    return costs[beaverType]?.[currentLevel] || 0;
  };

  // Refresh function to get latest data (less frequent, for balances and beaver info)
  const refreshData = useCallback(async () => {
    if (!isConnected || !walletAddress) return;

    try {
      console.log('🔄 Refreshing all data...');
      
      // Fetch balances
      const balances = await fetchBalances(walletAddress);
      setBurrBalance(balances.burrFormatted);
      setBurrBalanceRaw(balances.burrBalance); // Store raw BigInt value
      setStrkBalance(balances.strkFormatted);
      setStrkBalanceRaw(balances.strkBalance); // Store raw BigInt value
      setWorkingStrkAddress(balances.workingStrkAddress);

      // Fetch player info
      const playerInfo = await fetchPlayerInfo(walletAddress);
      console.log('📊 Player info:', playerInfo);
      console.log('📊 Number of beavers found:', playerInfo.beavers ? playerInfo.beavers.length : 0);
      console.log('📊 Beaver details:', playerInfo.beavers);
      
      if (playerInfo.beavers && playerInfo.beavers.length > 0) {
        // Filter out legacy beaver #1 for all users
        const validBeavers = playerInfo.beavers.filter(beaver => {
          if (beaver.id === 1) {
            console.log('🚫 Filtering out legacy beaver #1 for all users');
            return false;
          }
          return true;
        });
        
        console.log('✅ Valid beavers after filtering #1:', validBeavers);
        
        if (validBeavers.length > 0) {
          // Remove duplicate beavers based on ID
          const uniqueBeavers = validBeavers.filter((beaver, index, self) => 
            index === self.findIndex(b => b.id === beaver.id)
          );
          
          console.log('🔍 Original beavers:', validBeavers);
          console.log('✅ Unique beavers after deduplication:', uniqueBeavers);
          
          setHasStaked(true);
          setBeavers(uniqueBeavers);
          
          // Use first valid beaver for single beaver display compatibility
          const firstBeaver = uniqueBeavers[0];
          setBeaverType(firstBeaver.type);
          setBeaverLevel(firstBeaver.level);
          
          // Use total rewards from playerInfo (already formatted)
          setPendingRewards(formatNumber(parseFloat(playerInfo.totalRewards || '0')));
          setRealTimePendingRewards(formatNumber(parseFloat(playerInfo.totalRewards || '0')));
          setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
        } else {
          // All beavers were filtered out, treat as no staked beavers
          setHasStaked(false);
          setBeavers([]);
          setBeaverType(0);
          setBeaverLevel(0);
          setPendingRewards('0');
          setRealTimePendingRewards('0');
          setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
        }
      } else {
        setHasStaked(false);
        setBeavers([]);
        setBeaverType(0);
        setBeaverLevel(0);
        setPendingRewards('0');
        setRealTimePendingRewards('0');
        setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
      }

      console.log('✅ Data refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  }, [isConnected, walletAddress]);

  // Function to update real-time pending rewards from contract
  const updateRealTimePendingRewards = useCallback(async () => {
    if (!isConnected || !walletAddress || !hasStaked) return;

    try {
      // Import the function here to avoid circular dependency
      const contractPendingRewards = await fetchPendingRewards(walletAddress);
      
      if (contractPendingRewards !== null) {
        const rawValue = parseFloat(contractPendingRewards);
        setRealTimePendingRewards(formatNumber(rawValue));
        setRealTimePendingRewardsRaw(rawValue); // Store raw value for claim display
        setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
      }
    } catch (error) {
      console.error('❌ Error fetching real-time pending rewards:', error);
    }
  }, [isConnected, walletAddress, hasStaked]);

  // Auto-reconnect on page load
  useEffect(() => {
    const attemptAutoReconnect = async () => {
      if (wasWalletConnected() && !isConnected && !isConnecting) {
        console.log('🔄 Starting auto-reconnect...');
        
        try {
          const connection = await autoReconnectWallet();
          
          if (connection.isConnected && connection.autoReconnect) {
            console.log('✅ Auto-reconnect successful:', connection.address);
            setWallet(connection.wallet);
            setWalletAddress(connection.account.address);
            setIsConnected(true);
            
            // Setup connection monitoring
            maintainConnection();
            startConnectionMonitor(() => {
              // Handle disconnect
              setWallet(null);
              setIsConnected(false);
              setWalletAddress('');
              setBurrBalance('0');
              setBurrBalanceRaw(BigInt(0));
              setStrkBalance('0');
              setStrkBalanceRaw(BigInt(0));
              setWorkingStrkAddress(null);
              setHasStaked(false);
              setBeavers([]);
              setBeaverType(0);
              setBeaverLevel(0);
              setPendingRewards('0');
              setRealTimePendingRewards('0');
              setRealTimePendingRewardsRaw(0);
              setLocalBurrEarned(0);
              setLastMiningUpdate(Date.now());
              setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
              showToast.warning('Wallet disconnected. Please reconnect if needed.', 4000);
            });
            
            // Auto-fetch data after successful reconnection
            setTimeout(async () => {
              await refreshData();
            }, 1500);
            
            showToast.success('Welcome back! Wallet reconnected automatically.', 4000);
          } else {
            console.log('⏭️ Auto-reconnect not needed or failed');
          }
        } catch (error) {
          console.error('❌ Auto-reconnect error:', error);
        } finally {
          // Auto-reconnect completed
        }
      }
    };

    // Delay the auto-reconnect to ensure DOM is fully loaded
    const timeoutId = setTimeout(attemptAutoReconnect, 1500);
    
    return () => {
      clearTimeout(timeoutId);
      stopConnectionMonitor(); // Clean up on unmount
    };
  }, []); // Empty dependency array - only run once on mount

  // Auto-refresh data every 5 minutes (for balances and beaver info)
  useEffect(() => {
    if (isConnected) {
      refreshData();
      const interval = setInterval(refreshData, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [isConnected, refreshData]);

  // Real-time pending rewards update every 5 minutes
  useEffect(() => {
    if (isConnected && hasStaked) {
      updateRealTimePendingRewards();
      const rewardInterval = setInterval(updateRealTimePendingRewards, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(rewardInterval);
    }
  }, [isConnected, hasStaked, updateRealTimePendingRewards]);

  // Add a dummy state to force re-render every 5 seconds for live pending
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000); // 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate real-time mining rate per second
  const getCurrentMiningRatePerSecond = () => {
    if (!beavers || beavers.length === 0) return 0;
    
    const totalHourlyRate = beavers.reduce((total, beaver) => {
      return total + getBeaverHourlyRate(beaver);
    }, 0);
    
    return totalHourlyRate / 3600; // Convert hourly to per second
  };



  const formatBalance = (balance, decimals = 18) => {
    try {
      if (!balance || balance === '0') return '0';
      
      // If it's already a formatted string with commas, return as is
      if (typeof balance === 'string' && balance.includes(',')) {
        return balance;
      }
      
      // Handle BigInt properly to avoid precision loss
      let balanceBigInt;
      if (typeof balance === 'bigint') {
        balanceBigInt = balance;
      } else {
        balanceBigInt = BigInt(balance.toString());
      }
      
      const divisor = BigInt(10 ** decimals);
      
      // Avoid precision loss by using BigInt division first
      const wholePart = balanceBigInt / divisor;
      const remainder = balanceBigInt % divisor;
      
      // Convert to number with proper decimal handling
      const wholeNumber = Number(wholePart);
      const fractionalNumber = Number(remainder) / Math.pow(10, decimals);
      const totalNumber = wholeNumber + fractionalNumber;
      
      console.log(`🔢 App formatBalance debug: ${balanceBigInt} -> ${totalNumber}`);
      
      return formatNumber(totalNumber);
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0';
    }
  };

  const formatNumber = (num) => {
    const number = Number(num);
    if (number === 0) return '0';
    
    // For very large numbers, use compact notation
    if (number >= 1000000000000) {
      return (number / 1000000000000).toFixed(1) + 'T';
    } else if (number >= 1000000000) {
      return (number / 1000000000).toFixed(1) + 'B';
    } else if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    } else if (number >= 1) {
      return number.toFixed(2);
    } else {
      return number.toFixed(4);
    }
  };

  // Special formatter for claim rewards - never abbreviate, show full numbers
  const formatClaimNumber = (num) => {
    const number = Number(num);
    if (number === 0) return '0';
    
    // For claim amounts, always show full numbers with commas for readability
    if (number >= 1) {
      return number.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      });
    } else {
      return number.toFixed(4);
    }
  };

  const getCurrentHourlyRate = () => {
    if (!hasStaked || beavers.length === 0) return 0;
    const firstBeaver = beavers[0];
    const baseRate = beaverTypes[firstBeaver.type + 1]?.rate || 0;
    return baseRate * Math.pow(1.5, firstBeaver.level - 1);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Memoized beaver image component to prevent re-renders
  const BeaverImage = React.useMemo(() => {
    return ({ beaverType, size = '40px' }) => {
      const beaverName = beaverTypes[beaverType]?.name || 'Unknown';
      const imageName = beaverName.toLowerCase();
      
      return (
        <img 
          src={`/${imageName}.png`} 
          alt={`${beaverName} Beaver`} 
          style={{ 
            width: size, 
            height: size, 
            objectFit: 'contain',
            display: 'block'
          }}
          onError={(e) => {
            console.error(`❌ Failed to load: ${e.target.src}`);
            e.target.src = '/beaver_logo.png';
          }}
        />
      );
    };
  }, [beaverTypes]);

  const getBeaverEmoji = (beaverType) => {
    // Return memoized beaver image
    return <BeaverImage beaverType={beaverType} size="40px" />;
  };

  const getBeaverTypeString = (beaverType) => {
    return beaverTypes[beaverType]?.name || 'Unknown';
  };


  // Check if we're approaching max supply (within 5% of max supply)
  const isApproachingMaxSupply = () => {
    if (!tokenData || !tokenData.raw) {
      // For testing purposes, show warning if token data is not loaded yet
      // This simulates the approaching max supply scenario
      return true;
    }
    
    const maxSupply = BigInt("2100000000000000000000000000"); // 2.1B in wei
    const currentSupply = BigInt(tokenData.raw.actualTotalSupply || "0");
    
    // Calculate percentage for debugging
    const percentage = Number(currentSupply * BigInt(100) / maxSupply);
    console.log(`🔍 Current Supply: ${currentSupply.toString()}`);
    console.log(`🔍 Max Supply: ${maxSupply.toString()}`);
    console.log(`🔍 Percentage: ${percentage}%`);
    
    // For testing: always show warning if percentage is above 80%
    // In production, change this to 95%
    const threshold = maxSupply * BigInt(80) / BigInt(100);
    return currentSupply >= threshold;
  };

  const getBeaverHourlyRate = (beaver) => {
    const baseRate = beaverTypes[beaver.type + 1]?.rate || 0;
    return baseRate * Math.pow(1.5, beaver.level - 1);
  };

  // Calculate real-time pending for individual beaver based on contract data
  const getBeaverLivePending = (beaver) => {
    if (!hasStaked || beavers.length === 0) return 0;
    
    const totalRealTimeRewards = parseFloat(realTimePendingRewards || '0');
    const beaverHourlyRate = getBeaverHourlyRate(beaver);
    const totalHourlyRate = beavers.reduce((total, b) => total + getBeaverHourlyRate(b), 0);
    
    if (totalHourlyRate === 0) return 0;
    
    // Calculate this beaver's proportion of total rewards
    const beaverProportion = beaverHourlyRate / totalHourlyRate;
    const beaverRewards = totalRealTimeRewards * beaverProportion;
    
    const now = Math.floor(Date.now() / 1000);
    const secondsSinceUpdate = now - lastUpdateTimestamp;
    const liveIncrement = (beaverHourlyRate / 3600) * secondsSinceUpdate;
    
    return beaverRewards + liveIncrement;
  };

  // Manual refresh function for debugging
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing all data...');
    await refreshData();
    if (hasStaked) {
      await updateRealTimePendingRewards();
    }
  };



  const connectWallet = async () => {
    setIsConnecting(true);
    setIsLoading(true);
    setLoadingText('Connecting to wallet...');

    try {
      const connection = await connectStarknetWallet();
      
      // Check if connection returned an error
      if (connection.error) {
        console.log('❌ Wallet connection error:', connection.error);
        showToast.error(connection.error, 6000);
        setIsLoading(false);
        setLoadingText('');
        return;
      }
      
      // Check for silent failure (no error but no connection)
      if (!connection.isConnected && connection.error === null) {
        console.log('⚠️ Wallet connection cancelled or failed silently');
        // No toast message for silent failures (wallet locked, user cancelled, etc.)
        setIsLoading(false);
        setLoadingText('');
        return;
      }
      
      if (connection.wallet && connection.account) {
        setWallet(connection.wallet);
        setWalletAddress(connection.account.address);
        setIsConnected(true);
        
        // Setup connection monitoring for new connections
        maintainConnection();
        startConnectionMonitor(() => {
          // Handle disconnect
          setWallet(null);
          setIsConnected(false);
          setWalletAddress('');
          setBurrBalance('0');
          setBurrBalanceRaw(BigInt(0));
          setStrkBalance('0');
          setStrkBalanceRaw(BigInt(0));
          setWorkingStrkAddress(null);
          setHasStaked(false);
          setBeavers([]);
          setBeaverType(0);
          setBeaverLevel(0);
          setPendingRewards('0');
          setRealTimePendingRewards('0');
          setRealTimePendingRewardsRaw(0);
          setLocalBurrEarned(0);
          setLastMiningUpdate(Date.now());
          setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
          showToast.warning('Wallet disconnected. Please reconnect if needed.', 4000);
        });
        
        setLoadingText('Fetching account data...');
        
        // Initial data fetch
        setTimeout(async () => {
          await refreshData();
          setIsLoading(false);
          setLoadingText('');
        }, 1000);
        
        console.log('✅ Wallet connected successfully:', connection.account.address);
        showToast.success('Wallet connected successfully!', 4000);
      } else {
        console.log('❌ Failed to connect wallet');
        showToast.error('Failed to connect wallet. Please try again.', 4000);
        setIsLoading(false);
        setLoadingText('');
      }
    } catch (error) {
      console.error('❌ Wallet connection error:', error);
      // This should rarely happen now since errors are handled in starknet.js
      showToast.error('Failed to connect wallet. Please make sure you have ArgentX or Braavos installed.', 6000);
      setIsLoading(false);
      setLoadingText('');
    } finally {
      setIsConnecting(false);
    }
  };

  const stakeBeaver = async () => {
    if (!isConnected) {
              showToast.warning('Please connect your wallet first', 4000);
      return;
    }
    const beaverCost = beaverTypes[selectedBeaver].cost;
    const beaverCostWei = BigInt(beaverCost) * BigInt(10 ** 18);
    
    // Use raw STRK balance for accurate comparison
    const currentStrkBalanceWei = strkBalanceRaw || BigInt(0);
    const currentStrkBalance = Number(currentStrkBalanceWei) / Math.pow(10, 18);
    
    console.log('🔍 STRK Balance Debug:');
    console.log('Formatted strkBalance:', strkBalance);
    console.log('Raw strkBalanceRaw:', strkBalanceRaw.toString());
    console.log('Converted to number:', currentStrkBalance);
    console.log('Required cost:', beaverCost);
    console.log('Required cost in Wei:', beaverCostWei.toString());
    console.log('Has sufficient?', currentStrkBalanceWei >= beaverCostWei);

    if (currentStrkBalanceWei < beaverCostWei) {
              showToast.error(`Insufficient $STRK balance. You have ${currentStrkBalance.toFixed(2)} $STRK, need ${beaverCost} $STRK to buy this beaver.`, 6000);
      return;
    }

    setIsLoading(true);
    setLoadingText(`Buying ${beaverTypes[selectedBeaver].name} beaver...`);
    
    // Clear current beavers to prevent showing duplicates during purchase
    setBeavers([]);
    setHasStaked(false);

    try {
      console.log(`Staking ${beaverTypes[selectedBeaver].name} beaver for ${beaverCost} STRK`);
      
      if (!workingStrkAddress) {
        throw new Error('STRK address not available');
      }
      
      await stakeStarknetBeaver(selectedBeaver, beaverCostWei, workingStrkAddress);
      setLoadingText('Transaction confirmed! Refreshing data...');
      
      // Don't immediately set hasStaked - wait for blockchain data
      // This prevents showing duplicate beavers during purchase
      setLocalBurrEarned(0);
      setLastMiningUpdate(Date.now());
      
      // Wait for blockchain confirmation before updating UI
      setTimeout(async () => {
        await refreshData();
        console.log('🔄 Blockchain data refreshed after beaver purchase');
        
        // Force another refresh to ensure no duplicates
        setTimeout(async () => {
          await refreshData();
          console.log('🔄 Secondary refresh to prevent duplicates');
        }, 2000);
      }, 4000); // 4 saniye bekle
      
      setIsLoading(false);
      setLoadingText('');
              showToast.beaver(`${beaverTypes[selectedBeaver].name} beaver purchased successfully! It's now mining for you!`, 6000);
    } catch (error) {
      console.error('❌ Staking failed:', error);
      setIsLoading(false);
      setLoadingText('');
              showToast.error('Transaction failed. Please try again.', 5000);
    }
  };


  const upgradeBeaver = async (beaver) => {
    if (!hasStaked) {
      showToast.warning('No beaver to upgrade!', 4000);
      return;
    }

    if (beaver.level >= 5) {
      showToast.info('Beaver is already at maximum level!', 4000);
      return;
    }

    const upgradeCost = getUpgradeCost(beaver.type, beaver.level);
    const upgradeCostWei = BigInt(upgradeCost) * BigInt(10 ** 18);
    
    // Use raw BURR balance for comparison (in wei)
    const currentBurrBalanceWei = burrBalanceRaw || BigInt(0);

    if (currentBurrBalanceWei < upgradeCostWei) {
              showToast.error(`Insufficient $BURR balance. Need ${formatNumber(upgradeCost)} $BURR for upgrade.`, 6000);
      return;
    }

    // Direct upgrade without confirmation

    setIsLoading(true);
    setLoadingText(`Upgrading Beaver #${beaver.id}...`);

    try {
      await upgradeStarknetBeaver(beaver.id, upgradeCostWei);
      setLoadingText('Transaction confirmed! Refreshing data...');
      await refreshData();
      setIsLoading(false);
      setLoadingText('');
              showToast.beaver(`Beaver #${beaver.id} upgraded to Level ${beaver.level + 1}!`, 5000);
    } catch (error) {
      console.error('❌ Upgrade failed:', error);
      setIsLoading(false);
      setLoadingText('');
              showToast.error('Upgrade failed. Please try again.', 5000);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESSES.BURR_TOKEN);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };



  return (
    <ErrorBoundary>
    <div>


      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <img src="/beaver_logo.png" alt="Burrow Beaver" style={{ width: '40px', height: '40px', marginRight: '10px' }} className="image-container" />
            <h1>Burrow</h1>
          </div>
          
          <div className="header-buttons" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* BURR Buy Button - AVNU.fi Link */}
            <a
              href="https://app.avnu.fi/en/burr-strk"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #FFC700, #FF8C00)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              Buy $BURR
            </a>

            {/* MemeHub Button */}
            <a
              href="https://memehubai.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #7c3aed, #db2777)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '1rem' }}>🎭</span>
              MemeHub
            </a>

            {/* View Contract Button - Voyager Link */}
            <a
              href={`https://voyager.online/contract/${BURR_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #6c757d, #495057)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #5a6268, #343a40)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #6c757d, #495057)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '12px' }}>📄</span>
              View Contract
            </a>



            <button 
              onClick={isConnected ? async () => {
                // Stop connection monitoring
                stopConnectionMonitor();
                
                // Disconnect wallet (this will also clear localStorage)
                await disconnectWallet();
                setWallet(null);
                setIsConnected(false);
                setWalletAddress('');
                setBurrBalance('0');
                setBurrBalanceRaw(BigInt(0));
                setStrkBalance('0');
                setStrkBalanceRaw(BigInt(0));
                setWorkingStrkAddress(null);
                setHasStaked(false);
                setBeavers([]);
                setBeaverType(0);
                setBeaverLevel(0);
                setPendingRewards('0');
                setRealTimePendingRewards('0');
                setRealTimePendingRewardsRaw(0);
                setLocalBurrEarned(0);
                setLastMiningUpdate(Date.now());
                setLastUpdateTimestamp(Math.floor(Date.now() / 1000));
                showToast.success('Wallet disconnected successfully!', 3000);
              } : connectWallet}
              className="btn"
              disabled={isConnecting}
              style={{ 
                whiteSpace: 'nowrap', 
                flexShrink: 0,
                background: isConnected 
                  ? 'linear-gradient(135deg, #dc3545, #c82333)' 
                  : 'linear-gradient(135deg, #007bff, #0056b3)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (isConnected) {
                  e.target.style.background = 'linear-gradient(135deg, #c82333, #a71e2a)';
                } else {
                  e.target.style.background = 'linear-gradient(135deg, #0056b3, #004085)';
                }
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                if (isConnected) {
                  e.target.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
                } else {
                  e.target.style.background = 'linear-gradient(135deg, #007bff, #0056b3)';
                }
                e.target.style.transform = 'scale(1)';
              }}
            >
              {isConnecting ? (
                <>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#4caf50',
                    flexShrink: 0
                  }}></div>
                  Disconnect
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Wallet Info - Moved to very top */}
        {isConnected && (
          <div className="card">
            <h2>Wallet Info</h2>
            <div className="grid grid-3">
              <div className="info-box">
                <div className="info-label">Address</div>
                <div className="info-value">{formatAddress(walletAddress)}</div>
              </div>
              <div className="info-box">
                <div className="info-label">$BURR Balance</div>
                <div className="info-value orange">{burrBalance}</div>
              </div>
              <div className="info-box">
                <div className="info-label">$STRK Balance</div>
                <div className="info-value orange">{strkBalance}</div>
              </div>
            </div>
          </div>
        )}





        {/* Final Beaver Collection removed - Mining season completed */}


      </div>



      {/* Footer */}
      <footer style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
        padding: '40px 20px', 
        borderTop: '3px solid var(--accent-color)',
        marginTop: '50px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Big Social Links Section */}
          <div style={{
            display: 'flex',
            gap: '30px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '40px'
          }}>
            
            {/* X (Twitter) Card */}
          </div>
        </div>
      {/* Token Statistics */}
      <TokenStats />

      {/* Final Supply Statistics - Moved below TokenStats */}
      <div style={{
        background: 'rgba(26, 26, 46, 0.95)',
        padding: '30px 20px',
        marginTop: '20px',
        borderTop: '2px solid rgba(255, 180, 71, 0.3)'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'rgba(255, 180, 71, 0.1)',
          borderRadius: '15px',
          padding: '30px',
          border: '1px solid rgba(255, 180, 71, 0.3)'
        }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            color: 'var(--accent-color)',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '25px',
            justifyContent: 'center'
          }}>
            <img src="/beaver_logo.png" alt="Beaver" style={{ width: '28px', height: '28px' }} className="image-container" />
            📊 Final Supply Statistics
          </h2>
          
          <div style={{padding: '20px', textAlign: 'center'}}>
            <div style={{
              backgroundColor: 'var(--accent-orange)',
              color: 'white',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px'
            }}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px'}}>
                Total Supply
              </div>
              <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                2,100,000,000 $BURR
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px'
            }}>
              <div style={{fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px'}}>
                Total Burned
              </div>
              <div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>
                262,646,000 $BURR
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'white',
              padding: '15px',
              borderRadius: '10px'
            }}>
              <div style={{fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px'}}>
                💫 Circulating Supply
              </div>
              <div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>
                1,837,354,000 $BURR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Follow Us, Contract Address and Copyright - Moved to bottom */}
      <div style={{
        background: 'rgba(26, 26, 46, 0.95)',
        padding: '40px 20px',
        marginTop: '40px',
        borderTop: '2px solid rgba(255, 180, 71, 0.3)'
      }}>
        {/* Follow Us */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <a 
            href="https://x.com/burr_burrow" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-card-x"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px 25px',
              background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
              borderRadius: '15px',
              textDecoration: 'none',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)',
              border: '2px solid #333333',
              width: 'auto',
              maxWidth: '300px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="32" height="32" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1199.61 21.4691L764.305 637.527L1177.44 1205.53H1017.13L670.527 734.527L273.305 1205.53H0.527344L464.527 613.527L67.3047 21.4691H227.305L545.305 462.527L918.527 21.4691H1199.61ZM973.305 1121.53H1077.44L370.527 105.469H266.527L973.305 1121.53Z" fill="currentColor"/>
              </svg>
              <div>
                <div style={{ fontSize: '1.2rem' }}>Follow Us</div>
              </div>
            </div>
          </a>
        </div>

        {/* Contract Info */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          padding: '20px',
          background: 'rgba(255, 180, 71, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 180, 71, 0.3)'
        }}>
          <div style={{ fontSize: '1.1rem', color: 'var(--accent-color)', marginBottom: '10px', fontWeight: 'bold' }}>
            📜 Official Contract Address
          </div>
          <span
            className="contract-address"
            style={{
              cursor: 'pointer', 
              color: '#ffb347', 
              fontWeight: 'bold', 
              letterSpacing: '0.5px',
              fontSize: '1rem',
              wordBreak: 'break-all',
              padding: '8px 15px',
              background: 'rgba(255, 180, 71, 0.2)',
              borderRadius: '8px',
              display: 'inline-block',
              transition: 'all 0.3s ease'
            }}
            onClick={handleCopy}
            title="Click to copy address"
          >
            BURR Token: {CONTRACT_ADDRESSES.BURR_TOKEN}
          </span>
          {copied && <div style={{marginTop: '10px', color: '#4caf50', fontWeight: 'bold', fontSize: '1rem'}}>✅ Address Copied!</div>}
        </div>

        {/* Copyright */}
        <div style={{
          color: 'var(--text-light)',
          textAlign: 'center',
          fontSize: '1rem',
          padding: '20px 0',
          borderTop: '1px solid rgba(255, 180, 71, 0.2)'
        }}>
          © 2025 BurrowBurr. Built with ❤️ for the meme mining community on Starknet.
        </div>
      </div>

      </footer>
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
    </ErrorBoundary>
  );
}

export default App;
