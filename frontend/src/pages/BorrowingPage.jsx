import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  DollarSign,
  CreditCard,
  Clock,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calculator,
  User,
  Shield,
  FileText,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCDPVault, useAccountInfo, useCreditScore, useTransactionStatus, useCDPInfo, useDebtTokenBalance, useCollateralTokenBalance, useTotalDebtWithInterest, useAccruedInterest } from '../hooks/useContracts';
import { CONTRACT_ADDRESSES } from '../utils/wagmi';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  getUserStorageKeys,
  validateBorrowingLoans,
  debounceSave
} from '../utils/persistenceUtils';

const BorrowingPage = () => {
  const { address, isConnected } = useAccount();
  const { requestLoan, openCDP, approveToken, makeRepayment, addCollateral, isLoading: isContractLoading } = useCDPVault();
  const { accountInfo, healthFactor, isLoading: isAccountLoading } = useAccountInfo(address);
  const { creditScore, updateCreditScore, isLoading: isCreditLoading } = useCreditScore(address);
  const { cdpInfo, isLoading: isCDPLoading, refetch: refetchCDPInfo } = useCDPInfo(address);
  const { debtTokenBalance, isLoading: isDebtBalanceLoading, refetch: refetchDebtBalance } = useDebtTokenBalance(address);
  const { collateralTokenBalance, isLoading: isCollateralBalanceLoading, refetch: refetchCollateralBalance } = useCollateralTokenBalance(address);
  const { totalDebtWithInterest, isLoading: isDebtLoading, refetch: refetchTotalDebt } = useTotalDebtWithInterest(address);
  const { accruedInterest, isLoading: isInterestLoading, refetch: refetchAccruedInterest } = useAccruedInterest(address);

  const [borrowAmount, setBorrowAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState('12');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [loadingScore, setLoadingScore] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [repayAmount, setRepayAmount] = useState('');
  const [additionalCollateral, setAdditionalCollateral] = useState('');

  // Debounced save function to prevent excessive localStorage writes
  const debouncedSave = useCallback(
    debounceSave((loans, address) => {
      if (address) {
        const storageKeys = getUserStorageKeys(address);
        saveToLocalStorage(storageKeys.borrowingLoans, loans);
      }
    }, 300),
    []
  );

  // Load active loans from contract data instead of localStorage
  useEffect(() => {
    if (!address) {
      setActiveLoans([]);
      return;
    }

    console.log('BorrowingPage useEffect - cdpInfo:', cdpInfo);
    console.log('BorrowingPage useEffect - healthFactor:', healthFactor);
    console.log('BorrowingPage useEffect - isCDPLoading:', isCDPLoading);

    if (cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5]) { // isActive
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

      const realLoan = {
        id: `cdp_${address}`,
        amount: formatValue(cdpInfo[1]), // debtAmount
        collateral: formatValue(cdpInfo[0]), // collateralAmount
        interestRate: `${(Number(cdpInfo[3]) / 100).toFixed(1)}%`, // apr / 100
        dueDate: cdpInfo[4] ? new Date(Number(cdpInfo[4]) * 1000).toLocaleDateString() : 'Not set',
        status: 'active',
        healthFactor: healthFactor ? (Number(healthFactor) / 1e18).toFixed(2) : '0',
        creditScore: Number(cdpInfo[2]),
        assignedLender: cdpInfo[6],
        type: 'contract' // Mark as real contract data
      };

      setActiveLoans([realLoan]);
      console.log(`💳 Loaded real CDP data for ${address}:`, realLoan);
    } else {
      setActiveLoans([]);
      console.log(`💳 No active CDP found for ${address}. CDPInfo:`, cdpInfo);
    }
  }, [address, cdpInfo, healthFactor, isCDPLoading]);

  // Remove the localStorage save effect since we're using real contract data
  // The data should be fetched fresh from the contract each time

  const loanOptions = [
    {
      term: '6',
      label: '6 Months',
      interestRate: '8.5%',
      description: 'Short-term loan with lower interest'
    },
    {
      term: '12',
      label: '1 Year',
      interestRate: '12.3%',
      description: 'Standard loan term with competitive rates'
    },
    {
      term: '24',
      label: '2 Years',
      interestRate: '15.7%',
      description: 'Extended term with higher interest'
    }
  ];

  const calculateInterestRate = () => {
    const selectedOption = loanOptions.find(option => option.term === loanTerm);
    return selectedOption ? selectedOption.interestRate : '12.0%';
  };

  const calculateLoanDetails = () => {
    const principal = parseFloat(borrowAmount) || 0;
    const months = parseInt(loanTerm);
    const rate = loanOptions.find(option => option.term === loanTerm)?.interestRate.replace('%', '') || 0;
    const monthlyRate = parseFloat(rate) / 100 / 12;

    if (principal > 0 && monthlyRate > 0) {
      const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
      const totalAmount = monthlyPayment * months;
      const totalInterest = totalAmount - principal;

      return {
        monthlyPayment: monthlyPayment.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        totalInterest: totalInterest.toFixed(2)
      };
    }

    return { monthlyPayment: '0', totalAmount: '0', totalInterest: '0' };
  };

  // Calculate maximum borrowing capacity for existing CDP
  const calculateBorrowingCapacity = () => {
    if (!cdpInfo || !Array.isArray(cdpInfo) || cdpInfo.length < 6 || !cdpInfo[5]) {
      return { maxBorrowable: 0, currentUtilization: 0, warningLevel: 'safe' };
    }

    try {
      const collateralAmount = parseFloat(formatEther(cdpInfo[0] || 0n));
      const currentDebt = parseFloat(formatEther(cdpInfo[1] || 0n));

      // Minimum collateral ratio is 120% (12000 basis points)
      const minCollateralRatio = 1.2; // 120%

      // Calculate maximum total debt allowed
      const maxTotalDebt = collateralAmount / minCollateralRatio;
      const maxBorrowable = Math.max(0, maxTotalDebt - currentDebt);

      // Calculate current utilization percentage
      const currentUtilization = currentDebt / maxTotalDebt;

      // Determine warning level
      let warningLevel = 'safe';
      if (currentUtilization > 0.95) warningLevel = 'critical';
      else if (currentUtilization > 0.8) warningLevel = 'warning';

      return {
        maxBorrowable: maxBorrowable,
        currentUtilization: currentUtilization,
        warningLevel: warningLevel,
        collateralAmount: collateralAmount,
        currentDebt: currentDebt,
        maxTotalDebt: maxTotalDebt
      };
    } catch (error) {
      console.error('Error calculating borrowing capacity:', error);
      return { maxBorrowable: 0, currentUtilization: 0, warningLevel: 'safe' };
    }
  };

  const borrowingCapacity = calculateBorrowingCapacity();

  const getCreditScore = async () => {
    if (!isConnected) return;

    setLoadingScore(true);
    try {
      // Try to fetch real credit score from contract
      if (creditScore) {
        // Credit score is already available from the hook
        return;
      } else {
        // Try to update credit score
        await updateCreditScore();
      }
    } catch (error) {
      console.log('Contract credit score fetch failed, using simulation:', error);
      // Fallback to simulated score for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.info('Using simulated credit score for demo');
    } finally {
      setLoadingScore(false);
    }
  };

  const handleBorrow = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      toast.error('Please enter a valid borrowing amount');
      return;
    }

    // Check if user has existing CDP
    const hasActiveCDP = cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5];

    if (hasActiveCDP) {
      // For existing CDP, check borrowing capacity
      const requestedAmount = parseFloat(borrowAmount);

      if (requestedAmount > borrowingCapacity.maxBorrowable) {
        toast.error(
          `Cannot borrow $${requestedAmount}. Maximum available: $${borrowingCapacity.maxBorrowable.toFixed(6)}. Your CDP is at ${(borrowingCapacity.currentUtilization * 100).toFixed(1)}% capacity.`
        );
        return;
      }

      if (borrowingCapacity.warningLevel === 'critical') {
        toast.warning('Your CDP is at critical borrowing capacity. Consider adding more collateral.');
      }
    } else {
      // For new CDP, validate collateral
      if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
        toast.error('Please enter collateral amount');
        return;
      }

      const collateralRatio = (parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100;
      if (collateralRatio < 150) {
        toast.error('Minimum collateral ratio is 150%');
        return;
      }
    }

    setIsProcessing(true);

    try {
      toast.loading('Preparing loan application...', { id: 'borrow' });

      // Check if user already has an active CDP
      console.log('Checking existing CDP before borrowing:', cdpInfo);

      // Try to use real contract interaction first
      let txHash;
      try {
        // Safely parse amounts with strong validation to prevent NaN
        const borrowAmountValue = borrowAmount ? parseFloat(borrowAmount.replace(/,/g, '')) : 0;
        const collateralAmountValue = collateralAmount ? parseFloat(collateralAmount.replace(/,/g, '')) : 0;

        // Enhanced validation for borrow amount
        if (isNaN(borrowAmountValue) || borrowAmountValue <= 0) {
          console.error("Invalid borrow amount:", borrowAmount, "parsed as:", borrowAmountValue);
          throw new Error('Invalid borrow amount. Please enter a valid number.');
        }

        // Safe conversion to BigInt with validation
        const borrowInWei = BigInt(Math.floor(borrowAmountValue * 1e18));
        const creditScoreValue = Math.floor(parseFloat(creditScore || '700'));

        // Only convert collateral if it's needed (for new CDPs)
        let collateralInWei = 0n;
        if (collateralAmount && collateralAmountValue > 0) {
          // Enhanced validation for collateral amount
          if (isNaN(collateralAmountValue)) {
            console.error("Invalid collateral amount:", collateralAmount, "parsed as:", collateralAmountValue);
            throw new Error('Invalid collateral amount. Please enter a valid number.');
          }
          collateralInWei = BigInt(Math.floor(collateralAmountValue * 1e18));
        }

        console.log('Starting borrowing process:', {
          collateralAmount: collateralAmount || 'N/A (existing CDP)',
          borrowAmount: borrowAmount,
          collateralInWei: collateralInWei.toString(),
          borrowInWei: borrowInWei.toString(),
          creditScore: creditScoreValue,
          collateralTokenAddress: CONTRACT_ADDRESSES.COLLATERAL_TOKEN,
          cdpVaultAddress: CONTRACT_ADDRESSES.CDP_VAULT
        });

        // Step 1: Check if user already has an active CDP
        const hasActiveCDP = cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5]; // isActive

        if (hasActiveCDP) {
          console.log('User already has active CDP, requesting additional loan...');
          console.log('Current CDP info:', {
            collateralAmount: formatEther(cdpInfo[0] || 0n),
            currentDebt: formatEther(cdpInfo[1] || 0n),
            creditScore: cdpInfo[2]?.toString() || 'Unknown'
          });

          // For existing CDP, we only need to request the loan
          toast.loading('Processing additional loan request...', { id: 'borrow' });
          txHash = await requestLoan(borrowInWei);
          console.log('✅ Additional loan request completed:', txHash);

        } else {
          console.log('User has no active CDP, creating new CDP and requesting loan...');

          // For new CDP, we need collateral, so approve and open CDP first
          toast.loading('Approving collateral tokens...', { id: 'borrow' });
          const approvalTx = await approveToken(CONTRACT_ADDRESSES.COLLATERAL_TOKEN, collateralInWei);
          console.log('✅ Collateral approval completed:', approvalTx);

          // Wait for approval to be mined
          toast.loading('Waiting for approval confirmation...', { id: 'borrow' });
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Open CDP with collateral and credit score
          toast.loading('Opening CDP with collateral...', { id: 'borrow' });
          const cdpTx = await openCDP(collateralInWei, creditScoreValue);
          console.log('✅ CDP opened:', cdpTx);

          // Wait for the CDP to be created
          toast.loading('Waiting for CDP creation...', { id: 'borrow' });
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Now request the loan
          toast.loading('Processing loan request...', { id: 'borrow' });
          txHash = await requestLoan(borrowInWei);
          console.log('✅ Loan requested:', txHash);
        }

        // Validate transaction hash
        if (!txHash) {
          throw new Error('Loan transaction hash is undefined');
        }

        // Set the real transaction hash
        setTransactionHash(txHash);

        toast.success(
          <div>
            <div>Loan of ${borrowAmount} approved and funded!</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {txHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'borrow', duration: 5000 }
        );

        // Wait for transaction to be mined and then refresh data
        setTimeout(async () => {
          console.log('🔄 Refreshing all data after successful borrowing...');
          await refreshAllData();
        }, 5000);

      } catch (contractError) {
        console.error('Contract borrowing error:', contractError);

        // Check for specific error messages
        if (contractError.message && contractError.message.includes('CDP already exists')) {
          toast.error('You already have an active CDP. Refreshing data...', { id: 'borrow' });
          // Refresh CDP info and try again with requestLoan only
          if (refetchCDPInfo) {
            await refreshAllData();
          }
          return;
        }

        if (contractError.message && contractError.message.includes('Insufficient collateral ratio')) {
          toast.error('Insufficient collateral ratio. Please add more collateral or request a smaller loan.', { id: 'borrow' });
          return;
        }

        if (contractError.message && contractError.message.includes('No active CDP')) {
          toast.error('No active CDP found. Please create a CDP first.', { id: 'borrow' });
          return;
        }

        if (contractError.message && contractError.message.includes('Collateral transfer failed')) {
          toast.error('Collateral transfer failed. Please check your token approval.', { id: 'borrow' });
          return;
        }

        if (contractError.message && contractError.message.includes('Loan transfer failed')) {
          toast.error('Loan disbursement failed. Contract may not have sufficient funds.', { id: 'borrow' });
          return;
        }

        console.log('Contract interaction failed, falling back to simulation:', contractError);

        // Fallback to simulation for demo purposes
        toast.loading('Simulating loan application (Demo Mode)...', { id: 'borrow' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Generate a mock transaction hash
        const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
        setTransactionHash(mockTxHash);

        toast.success(
          <div>
            <div>Loan application for ${borrowAmount} approved! (Demo)</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <span>Tx: {mockTxHash.substring(0, 10)}...</span>
              <ExternalLink size={10} />
            </div>
          </div>,
          { id: 'borrow', duration: 5000 }
        );

        // Create simulated loan for demo
        const simulatedLoan = {
          id: `demo_${Date.now()}`,
          amount: parseFloat(borrowAmount),
          collateral: parseFloat(collateralAmount),
          interestRate: calculateInterestRate(),
          dueDate: new Date(Date.now() + (parseInt(loanTerm) * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString(),
          txHash: mockTxHash,
          status: 'Active',
          type: 'simulation'
        };

        setActiveLoans(prev => [...prev, simulatedLoan]);
        console.log('✅ Updated active loans with simulation:', simulatedLoan);
      }

      setBorrowAmount('');
      setCollateralAmount('');
    } catch (error) {
      toast.error('Loan application failed. Please try again.', { id: 'borrow' });
      console.error('Borrowing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepayment = async (loanId, amount) => {
    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Payment of $${amount} processed successfully!`);
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if user has an active CDP
  const hasActiveCDP = cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5];

  // Calculate CDP metrics
  const cdpMetrics = React.useMemo(() => {
    if (!hasActiveCDP) return null;

    try {
      const collateral = parseFloat(formatEther(cdpInfo[0] || 0n));
      const debt = parseFloat(formatEther(cdpInfo[1] || 0n));
      const totalDebt = totalDebtWithInterest ? parseFloat(formatEther(totalDebtWithInterest)) : debt;
      const interest = accruedInterest ? parseFloat(formatEther(accruedInterest)) : 0;
      const collateralRatio = debt > 0 ? (collateral / totalDebt) * 100 : 0;
      const apr = cdpInfo[3] ? Number(cdpInfo[3]) / 100 : 0;
      const dueDate = cdpInfo[4] ? new Date(Number(cdpInfo[4]) * 1000) : null;

      return {
        collateral,
        debt,
        totalDebt,
        interest,
        collateralRatio,
        apr,
        dueDate,
        isHealthy: collateralRatio > 150
      };
    } catch (error) {
      console.error('Error calculating CDP metrics:', error);
      return null;
    }
  }, [cdpInfo, totalDebtWithInterest, accruedInterest, hasActiveCDP]);

  // Handle repayment
  const handleMakePayment = async () => {
    if (!repayAmount || !address) return;

    try {
      setIsProcessing(true);

      // Parse amount to wei
      const amountInWei = parseEther(repayAmount);

      // First approve the debt token
      await approveToken(CONTRACT_ADDRESSES.DEBT_TOKEN, amountInWei);

      // Then make the repayment
      const hash = await makeRepayment(amountInWei);
      setTransactionHash(hash);

      // Refresh data
      await Promise.all([
        refetchCDPInfo(),
        refetchTotalDebt(),
        refetchAccruedInterest(),
        refetchDebtBalance()
      ]);

      setRepayAmount('');
      toast.success('Payment made successfully!');
    } catch (error) {
      console.error('Repayment error:', error);
      toast.error('Failed to make payment: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle full repayment
  const handlePayFull = async () => {
    if (!cdpMetrics || !address) return;

    try {
      setIsProcessing(true);

      // Use total debt with interest for full payment
      const totalDebt = totalDebtWithInterest || cdpInfo[1];

      // First approve the debt token
      await approveToken(CONTRACT_ADDRESSES.DEBT_TOKEN, totalDebt);

      // Then make the full repayment
      const hash = await makeRepayment(totalDebt);
      setTransactionHash(hash);

      // Refresh data
      await Promise.all([
        refetchCDPInfo(),
        refetchTotalDebt(),
        refetchAccruedInterest(),
        refetchDebtBalance()
      ]);

      toast.success('Loan paid in full!');
    } catch (error) {
      console.error('Full payment error:', error);
      toast.error('Failed to pay in full: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle adding collateral
  const handleAddCollateral = async () => {
    if (!additionalCollateral || !address) return;

    try {
      setIsProcessing(true);

      // Parse amount to wei
      const amountInWei = parseEther(additionalCollateral);

      // First approve the collateral token
      await approveToken(CONTRACT_ADDRESSES.COLLATERAL_TOKEN, amountInWei);

      // Then add collateral
      const hash = await addCollateral(amountInWei);
      setTransactionHash(hash);

      // Refresh data
      await Promise.all([
        refetchCDPInfo(),
        refetchCollateralBalance()
      ]);

      setAdditionalCollateral('');
      toast.success('Collateral added successfully!');
    } catch (error) {
      console.error('Add collateral error:', error);
      toast.error('Failed to add collateral: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to refresh all data after successful transactions
  const refreshAllData = useCallback(async () => {
    if (!address) return;

    try {
      await Promise.all([
        refetchCDPInfo?.(),
        refetchDebtBalance?.(),
        refetchCollateralBalance?.()
      ]);
      console.log('✅ All data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [address, refetchCDPInfo, refetchDebtBalance, refetchCollateralBalance]);

  useEffect(() => {
    if (isConnected) {
      getCreditScore();
    }
  }, [isConnected]);

  const loanDetails = calculateLoanDetails();

  return (
    <div className="slide-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Apply for a Loan
        </h1>
        <p className="text-lg text-secondary max-w-2xl mx-auto">
          Get instant access to liquidity with competitive rates based on your credit profile.
          Secure your loan with crypto collateral and enjoy flexible repayment terms.
        </p>
      </div>

      <div className="grid grid-2 gap-8">
        {/* Loan Application Form */}
        <div className="space-y-6">
          <div className="card glass">
            <div className="card-header">
              <h3 className="card-title">Loan Application</h3>
              <p className="card-subtitle">Configure your loan parameters</p>
            </div>

            {/* Credit Score Display */}
            {isConnected && (
              <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-primary">Your Credit Score</div>
                      <div className="text-sm text-secondary">Based on on-chain activity</div>
                    </div>
                  </div>
                  {loadingScore || isCreditLoading ? (
                    <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {creditScore ? Number(creditScore) : Math.floor(Math.random() * 200) + 600}
                      </div>
                      <div className="text-sm text-secondary">
                        {(() => {
                          const score = creditScore ? Number(creditScore) : Math.floor(Math.random() * 200) + 600;
                          return score >= 750 ? 'Excellent' :
                            score >= 700 ? 'Good' :
                              score >= 650 ? 'Fair' : 'Poor';
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loan Amount */}
            <div className="form-group">
              <label className="form-label">Loan Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  className="form-input pl-12"
                  placeholder="Enter loan amount"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                />
                <DollarSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
              </div>

              {/* Show borrowing capacity for existing CDPs */}
              {cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5] && (
                <div className="mt-3 p-3 bg-card-bg rounded-lg border border-border-color">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={16} className="text-primary" />
                    <span className="text-sm font-medium text-primary">Your CDP Status</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Current Debt:</span>
                      <span className="text-foreground">${borrowingCapacity.currentDebt?.toFixed(6) || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Max Borrowable:</span>
                      <span className={`font-medium ${borrowingCapacity.warningLevel === 'critical' ? 'text-red-400' :
                        borrowingCapacity.warningLevel === 'warning' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                        ${borrowingCapacity.maxBorrowable?.toFixed(6) || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Capacity Used:</span>
                      <span className={`font-medium ${borrowingCapacity.warningLevel === 'critical' ? 'text-red-400' :
                        borrowingCapacity.warningLevel === 'warning' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                        {((borrowingCapacity.currentUtilization || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {borrowingCapacity.warningLevel === 'critical' && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                      ⚠️ Critical: Your CDP is near maximum capacity. Consider adding collateral.
                    </div>
                  )}

                  {borrowingCapacity.warningLevel === 'warning' && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs">
                      ⚠️ Warning: Your CDP is approaching maximum capacity.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loan Term Selection */}
            <div className="form-group">
              <label className="form-label">Loan Term</label>
              <div className="grid grid-3 gap-3">
                {loanOptions.map((option) => (
                  <div
                    key={option.term}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-center ${loanTerm === option.term
                      ? 'border-primary bg-primary/10'
                      : 'border-border-color hover:border-primary/50'
                      }`}
                    onClick={() => setLoanTerm(option.term)}
                  >
                    <div className="font-semibold text-primary">{option.label}</div>
                    <div className="text-sm text-green-400 font-medium">{option.interestRate}</div>
                    <div className="text-xs text-secondary mt-1">{option.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collateral Amount - Only show for new CDPs */}
            {!(cdpInfo && Array.isArray(cdpInfo) && cdpInfo.length >= 6 && cdpInfo[5]) && (
              <div className="form-group">
                <label className="form-label">Collateral Amount (ETH)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="form-input pl-12"
                    placeholder="Enter collateral amount"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                  />
                  <CreditCard size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
                </div>
                {borrowAmount && collateralAmount && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted">Collateral Ratio: </span>
                    <span className={`font-medium ${(parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100 >= 150
                      ? 'text-green-400'
                      : 'text-red-400'
                      }`}>
                      {((parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100).toFixed(1)}%
                    </span>
                    <span className="text-muted ml-2">(Min: 150%)</span>
                  </div>
                )}
              </div>
            )}

            {/* Loan Calculator */}
            {borrowAmount && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={20} className="text-primary" />
                  <h4 className="font-semibold text-primary">Loan Summary</h4>
                </div>
                <div className="grid grid-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted">Monthly Payment</div>
                    <div className="text-lg font-bold text-primary">${loanDetails.monthlyPayment}</div>
                  </div>
                  <div>
                    <div className="text-muted">Total Interest</div>
                    <div className="text-lg font-bold text-yellow-400">${loanDetails.totalInterest}</div>
                  </div>
                  <div>
                    <div className="text-muted">Total Repayment</div>
                    <div className="text-lg font-bold text-red-400">${loanDetails.totalAmount}</div>
                  </div>
                  <div>
                    <div className="text-muted">Interest Rate</div>
                    <div className="text-lg font-bold text-green-400">
                      {loanOptions.find(option => option.term === loanTerm)?.interestRate}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleBorrow}
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
                  <FileText size={20} />
                  Apply for Loan
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
          {/* Interest Rate Information */}
          {/* Interest Rate Information */}
          <div className="pt-6">
            <div className="card glass">
              <div className="card-header">
                <h3 className="card-title">Interest Rate Factors</h3>
                <p className="card-subtitle">How we determine your rate</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div>
                    <div className="font-medium text-primary">Credit Score</div>
                    <div className="text-sm text-secondary">On-chain reputation analysis</div>
                  </div>
                  <div className="text-sm font-medium text-green-400">-2% to +5%</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div>
                    <div className="font-medium text-primary">Loan Term</div>
                    <div className="text-sm text-secondary">Longer terms have higher rates</div>
                  </div>
                  <div className="text-sm font-medium text-yellow-400">+0% to +7%</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div>
                    <div className="font-medium text-primary">Collateral Ratio</div>
                    <div className="text-sm text-secondary">Higher collateral = lower rates</div>
                  </div>
                  <div className="text-sm font-medium text-blue-400">-3% to +2%</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div>
                    <div className="font-medium text-primary">Market Conditions</div>
                    <div className="text-sm text-secondary">Current liquidity and demand</div>
                  </div>
                  <div className="text-sm font-medium text-purple-400">-1% to +3%</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Active Loans & Information */}
        <div className="space-y-6">
          {/* Active CDP */}
          <div className="card glass">
            <div className="card-header">
              <h3 className="card-title">Your CDP Status</h3>
              <p className="card-subtitle">Manage your collateralized debt position</p>
            </div>

            {hasActiveCDP && cdpMetrics ? (
              <div className="space-y-6">
                {/* CDP Overview */}
                <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50/50 to-green-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-primary">Active CDP</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${cdpMetrics.isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {cdpMetrics.isHealthy ? 'Healthy' : 'At Risk'}
                        </span>
                      </div>
                      <div className="text-sm text-secondary">APR: {cdpMetrics.apr.toFixed(2)}%</div>
                      {cdpMetrics.dueDate && (
                        <div className="text-xs text-muted mt-1">
                          Due: {cdpMetrics.dueDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">${cdpMetrics.totalDebt.toFixed(6)}</div>
                      <div className="text-sm text-yellow-400">Total Debt (incl. interest)</div>
                      <div className="text-xs text-muted">${cdpMetrics.debt.toFixed(6)} principal</div>
                    </div>
                  </div>

                  {/* CDP Metrics */}
                  <div className="grid grid-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted">Collateral</div>
                      <div className="font-medium text-primary">${cdpMetrics.collateral.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Collateral Ratio</div>
                      <div className={`font-medium ${cdpMetrics.isHealthy ? 'text-green-400' : 'text-red-400'}`}>
                        {cdpMetrics.collateralRatio.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Accrued Interest</div>
                      <div className="font-medium text-yellow-400">${cdpMetrics.interest.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Liquidation Risk</div>
                      <div className={`font-medium ${cdpMetrics.collateralRatio > 150 ? 'text-green-400' : 'text-red-400'}`}>
                        {cdpMetrics.collateralRatio > 150 ? 'Low' : 'High'}
                      </div>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  {!cdpMetrics.isHealthy && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm mb-4">
                      ⚠️ Warning: Your CDP is at risk of liquidation. Consider adding more collateral or paying down debt.
                    </div>
                  )}

                  {/* CDP Management Actions */}
                  <div className="space-y-4">
                    {/* Make Payment Section */}
                    <div className="p-3 bg-white/50 rounded-lg">
                      <h5 className="font-medium text-primary mb-2">Make Payment</h5>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="form-input flex-1"
                          placeholder="Payment amount"
                          value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)}
                        />
                        <button
                          onClick={handleMakePayment}
                          disabled={isProcessing || !repayAmount}
                          className="btn btn-primary"
                        >
                          {isProcessing ? 'Processing...' : 'Pay'}
                        </button>
                      </div>
                    </div>

                    {/* Add Collateral Section */}
                    <div className="p-3 bg-white/50 rounded-lg">
                      <h5 className="font-medium text-primary mb-2">Add Collateral</h5>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="form-input flex-1"
                          placeholder="Additional collateral amount"
                          value={additionalCollateral}
                          onChange={(e) => setAdditionalCollateral(e.target.value)}
                        />
                        <button
                          onClick={handleAddCollateral}
                          disabled={isProcessing || !additionalCollateral}
                          className="btn btn-secondary"
                        >
                          {isProcessing ? 'Processing...' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {/* View Details */}
                    <button
                      onClick={() => window.location.href = '/cdp-management'}
                      className="btn btn-outline w-full hover:bg-gray-50 transition-all"
                    >
                      View Detailed Management
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingDown size={48} className="text-muted mx-auto mb-4 opacity-50" />
                <p className="text-secondary">No active CDP</p>
                <p className="text-sm text-muted">Apply for your first loan to create a CDP</p>
              </div>
            )}
          </div>

          {/* Borrowing Requirements */}
          <div className="pt-6">
            <div className="card glass">
              <div className="card-header">
                <h3 className="card-title">Borrowing Requirements</h3>
                <p className="card-subtitle">What you need to qualify</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Connected Wallet</div>
                    <div className="text-sm text-secondary">Web3 wallet with sufficient funds for gas fees</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Minimum Collateral</div>
                    <div className="text-sm text-secondary">150% collateral ratio required (e.g., $150 ETH for $100 loan)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Credit Score Assessment</div>
                    <div className="text-sm text-secondary">On-chain activity analysis for interest rate determination</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-primary">Liquidation Risk</div>
                    <div className="text-sm text-secondary">Collateral may be liquidated if ratio falls below 120%</div>
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

export default BorrowingPage;
