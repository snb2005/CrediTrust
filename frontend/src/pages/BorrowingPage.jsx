import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const BorrowingPage = () => {
  const { address, isConnected } = useAccount();
  const [borrowAmount, setBorrowAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState('12');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [creditScore, setCreditScore] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);

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

  const activeLoans = [
    {
      id: 1,
      amount: '5,000',
      remainingAmount: '3,750',
      interestRate: '12.3%',
      term: '12 months',
      nextPayment: '2024-07-15',
      paymentAmount: '456.83',
      status: 'active'
    },
    {
      id: 2,
      amount: '2,500',
      remainingAmount: '1,200',
      interestRate: '8.5%',
      term: '6 months',
      nextPayment: '2024-07-01',
      paymentAmount: '430.25',
      status: 'active'
    }
  ];

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

  const getCreditScore = async () => {
    if (!isConnected) return;
    
    setLoadingScore(true);
    try {
      // Simulate API call to get credit score
      await new Promise(resolve => setTimeout(resolve, 2000));
      const score = Math.floor(Math.random() * 200) + 600; // Random score between 600-800
      setCreditScore(score);
    } catch (error) {
      toast.error('Failed to fetch credit score');
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

    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast.error('Please enter collateral amount');
      return;
    }

    const collateralRatio = (parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100;
    if (collateralRatio < 150) {
      toast.error('Minimum collateral ratio is 150%');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate loan application
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Loan application for $${borrowAmount} submitted successfully!`);
      setBorrowAmount('');
      setCollateralAmount('');
    } catch (error) {
      toast.error('Loan application failed. Please try again.');
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
                  {loadingScore ? (
                    <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{creditScore || 'N/A'}</div>
                      <div className="text-sm text-secondary">
                        {creditScore >= 750 ? 'Excellent' : 
                         creditScore >= 700 ? 'Good' : 
                         creditScore >= 650 ? 'Fair' : 'Poor'}
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
            </div>

            {/* Loan Term Selection */}
            <div className="form-group">
              <label className="form-label">Loan Term</label>
              <div className="grid grid-3 gap-3">
                {loanOptions.map((option) => (
                  <div
                    key={option.term}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-center ${
                      loanTerm === option.term
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

            {/* Collateral Amount */}
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
                  <span className={`font-medium ${
                    (parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100 >= 150 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {((parseFloat(collateralAmount) / parseFloat(borrowAmount)) * 100).toFixed(1)}%
                  </span>
                  <span className="text-muted ml-2">(Min: 150%)</span>
                </div>
              )}
            </div>

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
        </div>

        {/* Active Loans & Information */}
        <div className="space-y-6">
          {/* Active Loans */}
          <div className="card glass">
            <div className="card-header">
              <h3 className="card-title">Your Active Loans</h3>
              <p className="card-subtitle">Manage your current borrowing positions</p>
            </div>

            {activeLoans.length > 0 ? (
              <div className="space-y-4">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="p-4 border border-border-color rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-primary">Loan #{loan.id}</h4>
                        <div className="text-sm text-secondary">{loan.term} • {loan.interestRate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">${loan.amount}</div>
                        <div className="text-sm text-yellow-400">${loan.remainingAmount} remaining</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="text-sm text-muted">Next Payment</div>
                        <div className="font-medium text-primary">{loan.nextPayment}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted">Payment Amount</div>
                        <div className="font-medium text-red-400">${loan.paymentAmount}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRepayment(loan.id, loan.paymentAmount)}
                        disabled={isProcessing}
                        className="btn btn-primary flex-1"
                      >
                        Make Payment
                      </button>
                      <button className="btn btn-outline">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingDown size={48} className="text-muted mx-auto mb-4 opacity-50" />
                <p className="text-secondary">No active loans</p>
                <p className="text-sm text-muted">Apply for your first loan to get started</p>
              </div>
            )}
          </div>

          {/* Borrowing Requirements */}
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

          {/* Interest Rate Information */}
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
    </div>
  );
};

export default BorrowingPage;
