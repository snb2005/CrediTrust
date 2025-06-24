import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Calculator,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCDPVault } from '../hooks/useContracts';
import { useCDPInfo, useTotalDebtWithInterest, useAccruedInterest } from '../hooks/useContracts';
import { CONTRACT_ADDRESSES } from '../utils/wagmi';

const CDPManagement = () => {
  const { address, isConnected } = useAccount();
  const { makeRepayment, addCollateral, approveToken, isLoading } = useCDPVault();
  const { cdpInfo, isLoading: isCDPLoading, refetch: refetchCDPInfo } = useCDPInfo(address);
  const { totalDebtWithInterest, isLoading: isDebtLoading, refetch: refetchTotalDebt } = useTotalDebtWithInterest(address);
  const { accruedInterest, isLoading: isInterestLoading, refetch: refetchAccruedInterest } = useAccruedInterest(address);

  const [activeTab, setActiveTab] = useState('overview');
  const [repayAmount, setRepayAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user has an active CDP
  const hasActiveCDP = cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5];

  // Calculate CDP metrics
  const cdpMetrics = React.useMemo(() => {
    if (!hasActiveCDP) return null;

    const collateral = parseFloat(formatEther(cdpInfo[0] || 0n));
    const debt = parseFloat(formatEther(cdpInfo[1] || 0n));
    const totalDebt = totalDebtWithInterest ? parseFloat(formatEther(totalDebtWithInterest)) : debt;
    const interest = accruedInterest ? parseFloat(formatEther(accruedInterest)) : 0;
    const collateralRatio = debt > 0 ? (collateral / totalDebt) * 100 : 0;
    const apr = cdpInfo[3] ? Number(cdpInfo[3]) / 100 : 0; // Convert basis points to percentage
    const dueDate = cdpInfo[4] ? new Date(Number(cdpInfo[4]) * 1000) : null;

    // Calculate health status
    let healthStatus = 'good';
    let healthColor = 'text-green-400';
    if (collateralRatio < 130) {
      healthStatus = 'critical';
      healthColor = 'text-red-400';
    } else if (collateralRatio < 150) {
      healthStatus = 'warning';
      healthColor = 'text-yellow-400';
    }

    // Calculate borrowing capacity
    const minCollateralRatio = 120; // 120%
    const maxTotalDebt = collateral / (minCollateralRatio / 100);
    const availableToBorrow = Math.max(0, maxTotalDebt - totalDebt);

    return {
      collateral,
      debt,
      totalDebt,
      interest,
      collateralRatio,
      apr,
      dueDate,
      healthStatus,
      healthColor,
      availableToBorrow
    };
  }, [cdpInfo, totalDebtWithInterest, accruedInterest, hasActiveCDP]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchCDPInfo(),
        refetchTotalDebt(),
        refetchAccruedInterest()
      ]);
      toast.success('CDP data refreshed!');
    } catch (error) {
      console.error('Error refreshing CDP data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRepayment = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast.error('Please enter a valid repayment amount');
      return;
    }

    const repayAmountWei = parseEther(repayAmount);

    if (cdpMetrics && parseFloat(repayAmount) > cdpMetrics.totalDebt) {
      toast.error('Repayment amount exceeds total debt');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('Approving debt tokens...', { id: 'repay' });

      // First approve the debt tokens
      const approvalTx = await approveToken(CONTRACT_ADDRESSES.DEBT_TOKEN, repayAmountWei);
      console.log('✅ Debt token approval completed:', approvalTx);

      // Wait for approval to be mined
      toast.loading('Waiting for approval confirmation...', { id: 'repay' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Make the repayment
      toast.loading('Processing repayment...', { id: 'repay' });
      const repayTx = await makeRepayment(repayAmountWei);
      console.log('✅ Repayment completed:', repayTx);

      toast.success(`Repayment of ${repayAmount} tokens successful!`, { id: 'repay' });

      // Refresh data and clear form
      setRepayAmount('');
      setTimeout(() => {
        handleRefresh();
      }, 3000);

    } catch (error) {
      console.error('Repayment error:', error);
      toast.error(`Repayment failed: ${error.message || 'Unknown error'}`, { id: 'repay' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayFull = async () => {
    if (!cdpMetrics) return;

    setRepayAmount(cdpMetrics.totalDebt.toString());
    // The handleRepayment function will be called when user clicks the repay button
  };

  const handleAddCollateral = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast.error('Please enter a valid collateral amount');
      return;
    }

    const collateralAmountWei = parseEther(collateralAmount);

    setIsProcessing(true);

    try {
      toast.loading('Approving collateral tokens...', { id: 'collateral' });

      // First approve the collateral tokens
      const approvalTx = await approveToken(CONTRACT_ADDRESSES.COLLATERAL_TOKEN, collateralAmountWei);
      console.log('✅ Collateral token approval completed:', approvalTx);

      // Wait for approval to be mined
      toast.loading('Waiting for approval confirmation...', { id: 'collateral' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Add the collateral
      toast.loading('Adding collateral...', { id: 'collateral' });
      const collateralTx = await addCollateral(collateralAmountWei);
      console.log('✅ Collateral added:', collateralTx);

      toast.success(`Added ${collateralAmount} collateral tokens!`, { id: 'collateral' });

      // Refresh data and clear form
      setCollateralAmount('');
      setTimeout(() => {
        handleRefresh();
      }, 3000);

    } catch (error) {
      console.error('Add collateral error:', error);
      toast.error(`Failed to add collateral: ${error.message || 'Unknown error'}`, { id: 'collateral' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Wallet size={64} className="mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted">Please connect your wallet to manage your CDP</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCDPLoading || isDebtLoading || isInterestLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw size={48} className="mx-auto text-primary animate-spin mb-4" />
            <h2 className="text-2xl font-bold mb-2">Loading CDP Information</h2>
            <p className="text-muted">Please wait while we fetch your CDP details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasActiveCDP) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <CreditCard size={64} className="mx-auto text-muted mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Active CDP Found</h2>
            <p className="text-muted mb-6">You don't have an active CDP. Create one to start borrowing.</p>
            <button
              onClick={() => window.location.href = '/borrow'}
              className="btn-primary"
            >
              Create CDP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">CDP Management</h1>
            <p className="text-muted mt-1">Manage your Collateralized Debt Position</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-primary btn-sm ml-2 flex items-center gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

        </div>

        {/* CDP Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Total Collateral</p>
                <p className="text-2xl font-bold text-primary">
                  {cdpMetrics?.collateral.toFixed(6)} ETH
                </p>
              </div>
              <CreditCard className="text-primary" size={24} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Total Debt</p>
                <p className="text-2xl font-bold text-red-400">
                  {cdpMetrics?.totalDebt.toFixed(6)} USDC
                </p>
                <p className="text-xs text-muted">
                  +{cdpMetrics?.interest.toFixed(6)} interest
                </p>
              </div>
              <DollarSign className="text-red-400" size={24} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Collateral Ratio</p>
                <p className={`text-2xl font-bold ${cdpMetrics?.healthColor}`}>
                  {cdpMetrics?.collateralRatio.toFixed(1)}%
                </p>
                <p className="text-xs text-muted">Min: 120%</p>
              </div>
              {cdpMetrics?.healthStatus === 'good' ? (
                <CheckCircle className="text-green-400" size={24} />
              ) : cdpMetrics?.healthStatus === 'warning' ? (
                <AlertCircle className="text-yellow-400" size={24} />
              ) : (
                <AlertCircle className="text-red-400" size={24} />
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Available to Borrow</p>
                <p className="text-2xl font-bold text-green-400">
                  {cdpMetrics?.availableToBorrow.toFixed(6)} USDC
                </p>
              </div>
              <TrendingUp className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        {/* Health Status Alert */}
        {cdpMetrics?.healthStatus !== 'good' && (
          <div className={`p-4 rounded-lg border mb-8 ${cdpMetrics?.healthStatus === 'critical'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              <div>
                <p className="font-semibold">
                  {cdpMetrics?.healthStatus === 'critical' ? 'Critical Health Warning' : 'Health Warning'}
                </p>
                <p className="text-sm mt-1">
                  {cdpMetrics?.healthStatus === 'critical'
                    ? 'Your CDP is at risk of liquidation. Add collateral or repay debt immediately.'
                    : 'Your collateral ratio is low. Consider adding more collateral or repaying some debt.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">CDP Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted">Collateral Amount:</span>
                    <span className="font-mono">{cdpMetrics?.collateral.toFixed(6)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Principal Debt:</span>
                    <span className="font-mono">{cdpMetrics?.debt.toFixed(6)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Accrued Interest:</span>
                    <span className="font-mono text-yellow-400">+{cdpMetrics?.interest.toFixed(6)} USDC</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Debt:</span>
                    <span className="font-mono text-red-400">{cdpMetrics?.totalDebt.toFixed(6)} USDC</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted">Interest Rate:</span>
                    <span className="font-mono">{cdpMetrics?.apr.toFixed(2)}% APR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Due Date:</span>
                    <span className="font-mono">
                      {cdpMetrics?.dueDate ? cdpMetrics.dueDate.toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Health Status:</span>
                    <span className={`font-semibold ${cdpMetrics?.healthColor}`}>
                      {cdpMetrics?.healthStatus.charAt(0).toUpperCase() + cdpMetrics?.healthStatus.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Available to Borrow:</span>
                    <span className="font-mono text-green-400">{cdpMetrics?.availableToBorrow.toFixed(6)} USDC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'repay' && (
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Make Payment</h3>
            <div className="space-y-6">
              <div>
                <label className="form-label">Repayment Amount (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="form-input pl-12"
                    placeholder="Enter amount to repay"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    max={cdpMetrics?.totalDebt}
                  />
                  <DollarSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
                </div>
                <div className="mt-2 text-sm text-muted">
                  Maximum repayable: {cdpMetrics?.totalDebt.toFixed(6)} USDC
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePayFull}
                  className="btn-secondary flex-1"
                  disabled={isProcessing}
                >
                  Pay Full Amount
                </button>
                <button
                  onClick={handleRepayment}
                  disabled={isProcessing || !repayAmount || parseFloat(repayAmount) <= 0}
                  className="btn-primary flex-1"
                >
                  {isProcessing ? 'Processing...' : 'Make Payment'}
                </button>
              </div>

              {repayAmount && parseFloat(repayAmount) > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator size={16} className="text-primary" />
                    <span className="font-semibold text-primary">Payment Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span className="font-mono">{parseFloat(repayAmount).toFixed(6)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining Debt:</span>
                      <span className="font-mono">
                        {Math.max(0, (cdpMetrics?.totalDebt || 0) - parseFloat(repayAmount)).toFixed(6)} USDC
                      </span>
                    </div>
                    {parseFloat(repayAmount) >= (cdpMetrics?.totalDebt || 0) && (
                      <div className="text-green-400 font-semibold">
                        ✅ This will fully repay your CDP and return your collateral!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'collateral' && (
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Add Collateral</h3>
            <div className="space-y-6">
              <div>
                <label className="form-label">Additional Collateral Amount (ETH)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="form-input pl-12"
                    placeholder="Enter additional collateral amount"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                  />
                  <CreditCard size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
                </div>
              </div>

              <button
                onClick={handleAddCollateral}
                disabled={isProcessing || !collateralAmount || parseFloat(collateralAmount) <= 0}
                className="btn-primary w-full"
              >
                {isProcessing ? 'Processing...' : 'Add Collateral'}
              </button>

              {collateralAmount && parseFloat(collateralAmount) > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator size={16} className="text-primary" />
                    <span className="font-semibold text-primary">Collateral Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Additional Collateral:</span>
                      <span className="font-mono">{parseFloat(collateralAmount).toFixed(6)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Total Collateral:</span>
                      <span className="font-mono">
                        {((cdpMetrics?.collateral || 0) + parseFloat(collateralAmount)).toFixed(6)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Collateral Ratio:</span>
                      <span className="font-mono text-green-400">
                        {cdpMetrics?.totalDebt ?
                          (((cdpMetrics.collateral + parseFloat(collateralAmount)) / cdpMetrics.totalDebt) * 100).toFixed(1) + '%'
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Additional Borrowing Capacity:</span>
                      <span className="font-mono text-green-400">
                        +{cdpMetrics?.totalDebt ?
                          Math.max(0, (parseFloat(collateralAmount) / 1.2) - 0).toFixed(6)
                          : '0'} USDC
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CDPManagement;
