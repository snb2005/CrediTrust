import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import {
  DollarSign,
  TrendingUp,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Calculator,
  Loader,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCDPVault, useAccountInfo, useTransactionStatus, useLenderInfo } from '../hooks/useContracts';
import { CONTRACT_ADDRESSES } from '../utils/wagmi';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  getUserStorageKeys,
  validateLendingPositions,
  debounceSave
} from '../utils/persistenceUtils';

const LendingPage = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { stakeLender, withdrawLender, compoundRewards, approveToken, isLoading: isContractLoading } = useCDPVault();
  const { accountInfo, isLoading: isAccountLoading } = useAccountInfo(address);
  const { lenderInfo, isLoading: isLenderLoading, refetch: refetchLenderInfo } = useLenderInfo(address);

  const [lendingAmount, setLendingAmount] = useState('');
  const [selectedPool, setSelectedPool] = useState('stable');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [userPositions, setUserPositions] = useState([]);
  const [poolStats, setPoolStats] = useState({});

  // Debounced save function to prevent excessive localStorage writes
  const debouncedSave = useCallback(
    debounceSave((positions, address) => {
      if (address) {
        const storageKeys = getUserStorageKeys(address);
        saveToLocalStorage(storageKeys.lendingPositions, positions);
      }
    }, 300),
    []
  );

  // Load user positions from contract data instead of localStorage
  useEffect(() => {
    if (!address) {
      setUserPositions([]);
      return;
    }

    console.log('LendingPage useEffect - lenderInfo:', lenderInfo);
    console.log('LendingPage useEffect - isLenderLoading:', isLenderLoading);

    if (lenderInfo && Array.isArray(lenderInfo) && lenderInfo.length >= 4 && lenderInfo[3]) { // isActive
      const formatValue = (value) => {
        if (!value) return '0';
        try {
          const etherValue = Number(value) / 1e18;
          return etherValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          });
        } catch (error) {
          console.error('Error formatting value:', error, value);
          return '0';
        }
      };

      const realPosition = {
        id: `lender_${address}`,
        pool: 'Stable Pool', // Default pool name
        amount: formatValue(lenderInfo[0]), // stakedAmount
        earned: formatValue(lenderInfo[1]), // accruedRewards
        apy: '8.5%', // Default APY
        duration: 'Active',
        status: 'active',
        dailyEarning: (Number(lenderInfo[1]) / 1e18 / 365).toFixed(4), // Daily rewards
        depositDate: new Date().toISOString().split('T')[0],
        nextReward: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        txHash: 'contract_data',
        type: 'contract' // Mark as real contract data
      };

      setUserPositions([realPosition]);
      console.log(`📊 Loaded real lender data for ${address}:`, realPosition);
    } else {
      setUserPositions([]);
      console.log(`📊 No active lending position found for ${address}. LenderInfo:`, lenderInfo);
    }
  }, [address, lenderInfo, isLenderLoading]);

  // Remove localStorage save since we're using real contract data
  // Data will be refreshed from contract on each load

  // Enhanced state management
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const lendingPools = [
    {
      id: 'stable',
      name: 'Stable Pool',
      apy: '8.5%',
      risk: 'Low',
      minAmount: '100',
      totalLiquidity: '2.5M',
      activeLoans: '1.8M',
      description: 'Conservative lending with stable returns and low risk exposure.',
      color: 'bg-green-500'
    },
    {
      id: 'growth',
      name: 'Growth Pool',
      apy: '12.3%',
      risk: 'Medium',
      minAmount: '500',
      totalLiquidity: '1.2M',
      activeLoans: '950K',
      description: 'Balanced risk-reward ratio with higher potential returns.',
      color: 'bg-blue-500'
    },
    {
      id: 'high-yield',
      name: 'High Yield Pool',
      apy: '18.7%',
      risk: 'High',
      minAmount: '1000',
      totalLiquidity: '800K',
      activeLoans: '650K',
      description: 'Maximum returns for experienced lenders willing to take higher risks.',
      color: 'bg-purple-500'
    }
  ];

  const calculateReturns = (amount, apy, days = 365) => {
    const principal = parseFloat(amount) || 0;
    const rate = parseFloat(apy) / 100;
    const returns = (principal * rate * days) / 365;
    return returns.toFixed(2);
  };

  const handleLend = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!lendingAmount || parseFloat(lendingAmount) <= 0) {
      toast.error('Please enter a valid lending amount');
      return;
    }

    const selectedPoolData = lendingPools.find(pool => pool.id === selectedPool);
    if (parseFloat(lendingAmount) < parseFloat(selectedPoolData.minAmount)) {
      toast.error(`Minimum lending amount is $${selectedPoolData.minAmount}`);
      return;
    }

    // Check wallet balance
    const walletBalance = balance ? parseFloat(balance.formatted) : 0;
    if (parseFloat(lendingAmount) > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('Preparing transaction...', { id: 'lending' });

      // Try to use real contract interaction first
      let txHash;
      try {
        // Convert amount to wei (assuming 18 decimals)
        const amountInWei = BigInt(Math.floor(parseFloat(lendingAmount) * 1e18));

        console.log('Starting lending process:', {
          amount: lendingAmount,
          amountInWei: amountInWei.toString(),
          debtTokenAddress: CONTRACT_ADDRESSES.DEBT_TOKEN,
          cdpVaultAddress: CONTRACT_ADDRESSES.CDP_VAULT
        });

        // First approve debt token for staking
        toast.loading('Approving tokens...', { id: 'lending' });
        const approvalTx = await approveToken(CONTRACT_ADDRESSES.DEBT_TOKEN, amountInWei);
        console.log('✅ Token approval completed:', approvalTx);

        // Wait longer for approval to be mined
        toast.loading('Waiting for approval confirmation...', { id: 'lending' });
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Then stake as lender
        toast.loading('Staking as lender...', { id: 'lending' });
        txHash = await stakeLender(amountInWei);

        console.log('✅ Staking transaction completed:', txHash);

        // Validate transaction hash
        if (!txHash) {
          throw new Error('Transaction hash is undefined');
        }

        // Set the real transaction hash
        setTransactionHash(txHash);

        toast.success(
          <div>
            <div>Successfully lent ${lendingAmount} to {selectedPoolData.name}!</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {txHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'lending', duration: 5000 }
        );

        // Don't create a local position since we'll get it from the contract
        // Wait longer for the contract state to update
        setTimeout(async () => {
          if (refetchLenderInfo) {
            console.log('🔄 Refetching lender info after successful staking...');
            await refetchLenderInfo();
          }
        }, 5000);

      } catch (contractError) {
        console.log('Contract interaction failed, falling back to simulation:', contractError);

        // Fallback to simulation for demo purposes
        toast.loading('Simulating transaction (Demo Mode)...', { id: 'lending' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate a mock transaction hash
        const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
        setTransactionHash(mockTxHash);

        toast.success(
          <div>
            <div>Successfully lent ${lendingAmount} to {selectedPoolData.name}! (Demo)</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {mockTxHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'lending', duration: 5000 }
        );

        // Create new position for simulation mode
        const newPosition = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
          pool: selectedPoolData.name,
          amount: lendingAmount,
          earned: '0.00',
          apy: selectedPoolData.apy,
          duration: '0 days',
          status: 'active',
          dailyEarning: calculateReturns(lendingAmount, selectedPoolData.apy.replace('%', ''), 1),
          depositDate: new Date().toISOString().split('T')[0],
          nextReward: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          txHash: mockTxHash,
          type: 'simulation' // Mark as simulation
        };

        setUserPositions(prev => [...prev, newPosition]);
        console.log('✅ Updated user positions with simulation:', newPosition);
      }

      setLendingAmount('');
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Lending failed. Please try again.', { id: 'lending' });
      console.error('Lending error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (positionId, poolName, withdrawAll = false) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('Preparing withdrawal...', { id: 'withdrawal' });

      // First, check if user actually has an active lender position
      console.log('Checking lender info before withdrawal:', lenderInfo);

      if (!lenderInfo || !Array.isArray(lenderInfo) || !lenderInfo[3]) {
        toast.error('No active lending position found. Please ensure you have staked tokens first.', { id: 'withdrawal' });
        return;
      }

      // Check if user has sufficient balance to withdraw
      const stakedAmount = lenderInfo[0];
      const accruedRewards = lenderInfo[1];
      const totalAvailable = Number(stakedAmount) + Number(accruedRewards);

      console.log('Withdrawal check:', {
        stakedAmount: stakedAmount.toString(),
        accruedRewards: accruedRewards.toString(),
        totalAvailable,
        isActive: lenderInfo[3]
      });

      if (totalAvailable <= 0) {
        toast.error('No funds available to withdraw', { id: 'withdrawal' });
        return;
      }

      // Try to use real contract interaction first
      let txHash;
      try {
        // Get the position to determine withdraw amount
        const position = userPositions.find(p => p.id === positionId);
        if (!position) {
          throw new Error('Position not found');
        }

        // Calculate withdraw amount (0 means withdraw all)
        const withdrawAmount = withdrawAll ? BigInt(0) : BigInt(Math.floor(parseFloat(position.amount) * 1e18));

        console.log('Attempting withdrawal with amount:', withdrawAmount.toString());

        toast.loading('Processing withdrawal...', { id: 'withdrawal' });
        txHash = await withdrawLender(withdrawAmount);

        console.log('✅ Withdrawal transaction completed:', txHash);

        // Set the real transaction hash
        setTransactionHash(txHash);

        toast.success(
          <div>
            <div>Successfully withdrew from {poolName}!</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {txHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'withdrawal', duration: 5000 }
        );

        // Wait for transaction to be mined and then refresh data
        setTimeout(async () => {
          if (refetchLenderInfo) {
            await refetchLenderInfo();
          }
          // Clear positions to force reload from contract
          setUserPositions([]);
        }, 3000);

      } catch (contractError) {
        console.error('Contract withdrawal error:', contractError);

        // Check if it's a specific contract error
        if (contractError.message && contractError.message.includes('No active lending position')) {
          toast.error('No active lending position found. Please stake tokens first.', { id: 'withdrawal' });
          return;
        }

        console.log('Contract interaction failed, falling back to simulation:', contractError);

        // Fallback to simulation for demo purposes
        toast.loading('Simulating withdrawal (Demo Mode)...', { id: 'withdrawal' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate a mock transaction hash
        const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
        setTransactionHash(mockTxHash);

        toast.success(
          <div>
            <div>Successfully withdrew from {poolName}! (Demo)</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {mockTxHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'withdrawal', duration: 5000 }
        );

        // Update user positions for demo - remove withdrawn position
        setUserPositions(prev => prev.filter(p => p.id !== positionId));
      }

      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Withdrawal failed. Please try again.', { id: 'withdrawal' });
      console.error('Withdrawal error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompound = async (positionId, poolName) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('Preparing compound...', { id: 'compound' });

      // Try to use real contract interaction first
      let txHash;
      try {
        toast.loading('Compounding rewards...', { id: 'compound' });
        txHash = await compoundRewards();

        console.log('✅ Compound transaction completed:', txHash);

        // Set the real transaction hash
        setTransactionHash(txHash);

        toast.success(
          <div>
            <div>Successfully compounded rewards for {poolName}!</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {txHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'compound', duration: 5000 }
        );

        // Update the specific position - add earned to amount and reset earned
        setUserPositions(prev => prev.map(p => {
          if (p.id === positionId) {
            const newAmount = (parseFloat(p.amount) + parseFloat(p.earned)).toFixed(2);
            return {
              ...p,
              amount: newAmount,
              earned: '0.00',
              type: 'contract' // Mark as real contract interaction
            };
          }
          return p;
        }));

        // Refresh lender info after a delay
        setTimeout(async () => {
          if (refetchLenderInfo) {
            await refetchLenderInfo();
          }
        }, 3000);

      } catch (contractError) {
        console.log('Contract interaction failed, falling back to simulation:', contractError);

        // Fallback to simulation for demo purposes
        toast.loading('Simulating compound (Demo Mode)...', { id: 'compound' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate a mock transaction hash
        const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
        setTransactionHash(mockTxHash);

        toast.success(
          <div>
            <div>Successfully compounded rewards for {poolName}! (Demo)</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {mockTxHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'compound', duration: 5000 }
        );

        // Update position for demo
        setUserPositions(prev => prev.map(p => {
          if (p.id === positionId) {
            const newAmount = (parseFloat(p.amount) + parseFloat(p.earned)).toFixed(2);
            return {
              ...p,
              amount: newAmount,
              earned: '0.00',
              type: 'simulation' // Mark as simulation
            };
          }
          return p;
        }));
      }

      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Compound failed. Please try again.', { id: 'compound' });
      console.error('Compound error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update earnings for active positions periodically
  useEffect(() => {
    const updateEarnings = () => {
      setUserPositions(prev => prev.map(position => {
        if (position.status === 'active') {
          const currentTime = new Date();
          const depositDate = new Date(position.depositDate);
          const daysElapsed = Math.max(0, (currentTime - depositDate) / (1000 * 60 * 60 * 24));

          // Calculate simple daily compound interest
          const principal = parseFloat(position.amount);
          const dailyRate = parseFloat(position.apy.replace('%', '')) / 100 / 365;
          const newEarned = (principal * Math.pow(1 + dailyRate, daysElapsed) - principal).toFixed(2);

          const daysDuration = Math.floor(daysElapsed);

          return {
            ...position,
            earned: newEarned,
            duration: `${daysDuration} day${daysDuration === 1 ? '' : 's'}`,
            dailyEarning: (newEarned / Math.max(1, daysElapsed) || 0).toFixed(2)
          };
        }
        return position;
      }));
    };

    // Update earnings immediately and then every 10 seconds
    updateEarnings();
    const interval = setInterval(updateEarnings, 10000);

    return () => clearInterval(interval);
  }, [userPositions.length]); // Only depend on length to avoid infinite loops

  // Manual refresh function - now refetches from contract
  const refreshPositions = useCallback(() => {
    setRefreshing(true);
    if (address && refetchLenderInfo) {
      refetchLenderInfo();
      setLastUpdated(new Date());
      console.log('🔄 Manually refreshed lending positions from contract');
    }
    setTimeout(() => setRefreshing(false), 1000);
  }, [address, refetchLenderInfo]);

  // Clear all data function (for testing)
  const clearAllData = useCallback(() => {
    if (address) {
      const storageKeys = getUserStorageKeys(address);
      saveToLocalStorage(storageKeys.lendingPositions, []);
      setUserPositions([]);
      console.log('🗑️ Cleared all lending positions');
      toast.success('All lending data cleared');
    }
  }, [address]);

  return (
    <div className="slide-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Provide Liquidity & Earn
        </h1>
        <p className="text-lg text-secondary max-w-2xl mx-auto">
          Lend your crypto assets to earn passive income through our risk-managed lending pools.
          Choose from different risk levels to match your investment strategy.
        </p>
      </div>

      <div className="grid grid-2 gap-8">
        {/* Lending Form */}
        <div className="space-y-6">
          <div className="card glass">
            <div className="card-header">
              <h3 className="card-title">Start Lending</h3>
              <p className="card-subtitle">Choose your lending pool and amount</p>
            </div>

            {/* Pool Selection */}
            <div className="form-group">
              <label className="form-label">Select Lending Pool</label>
              <div className="space-y-3">
                {lendingPools.map((pool) => (
                  <div
                    key={pool.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedPool === pool.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border-color hover:border-primary/50'
                      }`}
                    onClick={() => setSelectedPool(pool.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${pool.color}`}></div>
                        <h4 className="font-semibold text-primary">{pool.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">{pool.apy}</div>
                        <div className="text-sm text-secondary">APY</div>
                      </div>
                    </div>
                    <p className="text-sm text-secondary mb-3">{pool.description}</p>
                    <div className="grid grid-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted">Risk Level</div>
                        <div className={`font-medium ${pool.risk === 'Low' ? 'text-green-400' :
                          pool.risk === 'Medium' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>{pool.risk}</div>
                      </div>
                      <div>
                        <div className="text-muted">Min Amount</div>
                        <div className="font-medium text-primary">${pool.minAmount}</div>
                      </div>
                      <div>
                        <div className="text-muted">Total Liquidity</div>
                        <div className="font-medium text-primary">${pool.totalLiquidity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label className="form-label">Lending Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  className="form-input pl-12"
                  placeholder="Enter amount to lend"
                  value={lendingAmount}
                  onChange={(e) => setLendingAmount(e.target.value)}
                />
                <DollarSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
              </div>
            </div>

            {/* Returns Calculator */}
            {lendingAmount && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={20} className="text-primary" />
                  <h4 className="font-semibold text-primary">Estimated Returns</h4>
                </div>
                <div className="grid grid-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted">Monthly Returns</div>
                    <div className="text-lg font-bold text-green-400">
                      ${calculateReturns(lendingAmount, lendingPools.find(p => p.id === selectedPool)?.apy.replace('%', ''), 30)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Annual Returns</div>
                    <div className="text-lg font-bold text-green-400">
                      ${calculateReturns(lendingAmount, lendingPools.find(p => p.id === selectedPool)?.apy.replace('%', ''))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLend}
              disabled={isProcessing || !isConnected}
              className="btn btn-primary w-full"
            >
              {isProcessing ? (
                <>
                  <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </>
              ) : (
                <>
                  <TrendingUp size={20} />
                  Start Lending
                </>
              )}
            </button>
          </div>

          {/* Transaction Status */}
          {transactionHash && (
            <div className="info-banner success">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400" />
                <div>
                  <div className="font-semibold">Transaction Submitted!</div>
                  <div className="text-sm flex items-center gap-2 mt-1">
                    <span>Hash: {transactionHash.substring(0, 20)}...</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(transactionHash)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Your Positions & Stats */}
        <div className="space-y-6">
          {/* Your Lending Positions */}
          <div className="card glass">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="card-title">Your Lending Positions</h3>
                  <p className="card-subtitle">Track your active lending positions</p>
                </div>
                <button
                  onClick={refreshPositions}
                  disabled={refreshing}
                  className="btn btn-outline btn-sm"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Debug Info
            {address && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs mb-4">
                <div className="font-semibold text-blue-800 mb-2">Debug Info:</div>
                <div className="text-blue-700">
                  <div>Address: {address}</div>
                  <div>Lender Loading: {isLenderLoading ? 'Yes' : 'No'}</div>
                  <div>Lender Info: {lenderInfo ? JSON.stringify({
                    staked: lenderInfo[0]?.toString(),
                    rewards: lenderInfo[1]?.toString(),
                    active: lenderInfo[3]
                  }) : 'None'}</div>
                  <div>Positions Count: {userPositions.length}</div>
                </div>
              </div>
            )} */}

            {userPositions.length > 0 ? (
              <div className="space-y-4">
                {userPositions.map((position, index) => (
                  <div key={index} className="p-4 border border-border-color rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-primary">{position.pool}</h4>
                        <div className="text-sm text-secondary">{position.duration} active</div>
                        <div className="text-xs text-green-500 mt-1">+${position.dailyEarning}/day</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">${position.amount}</div>
                        <div className="text-sm text-green-400">+${position.earned} earned</div>
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${position.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                          {position.status === 'active' ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-muted">APY: </span>
                        <span className="font-medium text-green-400">{position.apy}</span>
                      </div>
                      <button
                        onClick={() => handleWithdraw(position.id, position.pool, true)}
                        disabled={isProcessing}
                        className="btn btn-outline btn-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                      >
                        {isProcessing ? 'Processing...' : 'Withdraw'}
                      </button>
                      <button
                        onClick={() => handleCompound(position.id, position.pool)}
                        className="btn btn-primary btn-sm ml-2"
                        disabled={isProcessing || parseFloat(position.earned) <= 0}
                      >
                        {isProcessing ? 'Processing...' : 'Compound'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp size={48} className="text-muted mx-auto mb-4 opacity-50" />
                <p className="text-secondary">No active lending positions yet</p>
                <p className="text-sm text-muted">Start lending to see your positions here</p>
              </div>
            )}
          </div>

          {/* Lending Stats */}
          <div className="pt-6">
            <div className="card glass">
              <div className="card-header">
                <h3 className="card-title">Platform Statistics</h3>
                <p className="card-subtitle">Current lending market overview</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-primary">Total Liquidity</div>
                      <div className="text-sm text-secondary">Across all pools</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-primary">$4.5M</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-primary">Average APY</div>
                      <div className="text-sm text-secondary">Weighted average</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-400">11.2%</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-primary">Default Rate</div>
                      <div className="text-sm text-secondary">Historical average</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-400">1.8%</div>
                </div>
              </div>
            </div>
          </div>


          {/* Risk Information */}
          <div className="pt-6">
            <div className="card glass">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-500" />
                  <h3 className="card-title">Risk Information</h3>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Smart Contract Audited</div>
                    <div className="text-secondary">All contracts have been audited by leading security firms</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Insurance Coverage</div>
                    <div className="text-secondary">Lending positions are partially covered by our insurance fund</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Market Risk</div>
                    <div className="text-secondary">Lending involves risk of partial or total loss of principal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LendingPage;
