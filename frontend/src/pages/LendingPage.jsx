import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Clock,
  AlertCircle,
  CheckCircle,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';

const LendingPage = () => {
  const { address, isConnected } = useAccount();
  const [lendingAmount, setLendingAmount] = useState('');
  const [selectedPool, setSelectedPool] = useState('stable');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const yourPositions = [
    {
      pool: 'Stable Pool',
      amount: '5,000',
      earned: '312.50',
      apy: '8.5%',
      duration: '45 days'
    },
    {
      pool: 'Growth Pool',
      amount: '2,500',
      earned: '89.25',
      apy: '12.3%',
      duration: '23 days'
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

    setIsProcessing(true);
    
    try {
      // Simulate lending transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Successfully lent $${lendingAmount} to ${selectedPoolData.name}!`);
      setLendingAmount('');
    } catch (error) {
      toast.error('Lending failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (poolName) => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Withdrawal from ${poolName} initiated!`);
    } catch (error) {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPool === pool.id
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
                        <div className={`font-medium ${
                          pool.risk === 'Low' ? 'text-green-400' :
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
        </div>

        {/* Your Positions & Stats */}
        <div className="space-y-6">
          {/* Your Lending Positions */}
          <div className="card glass">
            <div className="card-header">
              <h3 className="card-title">Your Lending Positions</h3>
              <p className="card-subtitle">Track your active lending positions</p>
            </div>

            {yourPositions.length > 0 ? (
              <div className="space-y-4">
                {yourPositions.map((position, index) => (
                  <div key={index} className="p-4 border border-border-color rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-primary">{position.pool}</h4>
                        <div className="text-sm text-secondary">{position.duration} active</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">${position.amount}</div>
                        <div className="text-sm text-green-400">+${position.earned} earned</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-muted">APY: </span>
                        <span className="font-medium text-green-400">{position.apy}</span>
                      </div>
                      <button
                        onClick={() => handleWithdraw(position.pool)}
                        disabled={isProcessing}
                        className="btn btn-outline btn-sm"
                      >
                        Withdraw
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

          {/* Risk Information */}
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
  );
};

export default LendingPage;
