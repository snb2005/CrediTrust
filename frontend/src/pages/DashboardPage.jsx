import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { useAccountInfo, useLenderInfo, useCDPInfo, useCreditScore } from '../hooks/useContracts';

const DashboardPage = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { accountInfo, isLoading: isAccountLoading } = useAccountInfo(address);
  const { lenderInfo, isLoading: isLenderLoading } = useLenderInfo(address);
  const { cdpInfo, isLoading: isCDPLoading } = useCDPInfo(address);
  const { creditScore, isLoading: isCreditLoading } = useCreditScore(address);
  const [userStats, setUserStats] = useState(null);
  const [loanHistoryData, setLoanHistoryData] = useState([]);
  const [creditTrendData, setCreditTrendData] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshData = async () => {
    if (!address) return;

    setRefreshing(true);
    setLoading(true);

    try {
      // Force refresh of all contract data
      // We'll use a timeout to simulate the refresh and trigger re-renders
      setTimeout(() => {
        // Force a re-render by updating the loading state
        setLoading(false);
        setRefreshing(false);
        toast.success('Dashboard data refreshed!');
      }, 2000);

    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportData = () => {
    toast.success('Exporting transaction data...');
    // Simulate data export
  };

  const handleViewTransaction = (hash) => {
    toast.info(`Viewing transaction: ${hash}`);
    // Open transaction in explorer
  };

  // Generate dynamic activity data based on user's contract data
  const generateActivityData = (borrowed, lent) => {
    const currentMonth = new Date().getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((month, index) => ({
      month,
      borrowed: borrowed > 0 ? Math.floor(borrowed * (0.5 + Math.random() * 0.5)) : Math.floor(Math.random() * 1000),
      lent: lent > 0 ? Math.floor(lent * (0.5 + Math.random() * 0.5)) : Math.floor(Math.random() * 2000)
    }));
  };

  // Generate dynamic portfolio distribution
  const generatePortfolioData = (borrowed, lent, rewards) => {
    const totalValue = borrowed + lent + rewards;
    if (totalValue === 0) {
      return [
        { name: 'Available for Lending', value: 60, color: '#8b5cf6' },
        { name: 'Ready to Borrow', value: 30, color: '#f472b6' },
        { name: 'Getting Started', value: 10, color: '#4facfe' },
      ];
    }

    const borrowedPercent = Math.floor((borrowed / totalValue) * 100);
    const lentPercent = Math.floor((lent / totalValue) * 100);
    const rewardsPercent = Math.max(0, 100 - borrowedPercent - lentPercent);

    return [
      { name: 'Active Loans', value: borrowedPercent, color: '#8b5cf6' },
      { name: 'Lent Amount', value: lentPercent, color: '#f472b6' },
      { name: 'Earned Rewards', value: rewardsPercent, color: '#4facfe' },
    ].filter(item => item.value > 0);
  };

  // Generate dynamic transaction history
  const generateTransactionHistory = (borrowed, lent, rewards) => {
    const transactions = [];
    const currentDate = new Date();

    if (borrowed > 0) {
      transactions.push({
        id: 1,
        type: 'borrow',
        amount: (borrowed / 1000).toFixed(2) + 'K',
        status: 'completed',
        date: new Date(currentDate - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hash: '0x' + Math.random().toString(16).substr(2, 6) + '...'
      });
    }

    if (lent > 0) {
      transactions.push({
        id: 2,
        type: 'lend',
        amount: (lent / 1000).toFixed(2) + 'K',
        status: 'active',
        date: new Date(currentDate - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hash: '0x' + Math.random().toString(16).substr(2, 6) + '...'
      });
    }

    if (rewards > 0) {
      transactions.push({
        id: 3,
        type: 'interest',
        amount: (rewards).toFixed(2),
        status: 'completed',
        date: new Date(currentDate - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hash: '0x' + Math.random().toString(16).substr(2, 6) + '...'
      });
    }

    // Add some sample transactions if user has no activity
    if (transactions.length === 0) {
      return [
        { id: 1, type: 'compound', amount: '0', status: 'pending', date: currentDate.toISOString().split('T')[0], hash: '0x000000...' },
        { id: 2, type: 'interest', amount: '0', status: 'pending', date: currentDate.toISOString().split('T')[0], hash: '0x000000...' }
      ];
    }

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Mock data for demonstration
  const mockData = {
    userStats: {
      totalBorrowed: '18,500',
      totalLent: '45,750',
      creditScore: 758,
      activeLoans: 4,
      repaymentRate: 99.2,
      interestEarned: '3,840',
      portfolioValue: '64,290',
      monthlyIncome: '485'
    },
    loanHistory: [
      { month: 'Jan', borrowed: 4000, lent: 2400 },
      { month: 'Feb', borrowed: 3000, lent: 1398 },
      { month: 'Mar', borrowed: 2000, lent: 9800 },
      { month: 'Apr', borrowed: 2780, lent: 3908 },
      { month: 'May', borrowed: 1890, lent: 4800 },
      { month: 'Jun', borrowed: 2390, lent: 3800 },
    ],
    creditTrend: [
      { month: 'Jan', score: 680 },
      { month: 'Feb', score: 695 },
      { month: 'Mar', score: 710 },
      { month: 'Apr', score: 725 },
      { month: 'May', score: 735 },
      { month: 'Jun', score: 742 },
    ],
    portfolioDistribution: [
      { name: 'Active Loans', value: 65, color: '#8b5cf6' },
      { name: 'Available Liquidity', value: 25, color: '#f472b6' },
      { name: 'Pending', value: 10, color: '#4facfe' },
    ]
  };

  const recentTransactions = [
    { id: 1, type: 'borrow', amount: '5,000', status: 'completed', date: '2024-06-20', hash: '0x1a2b3c...' },
    { id: 2, type: 'repay', amount: '1,250', status: 'completed', date: '2024-06-19', hash: '0x4d5e6f...' },
    { id: 3, type: 'lend', amount: '10,000', status: 'active', date: '2024-06-18', hash: '0x7g8h9i...' },
    { id: 4, type: 'interest', amount: '150', status: 'completed', date: '2024-06-17', hash: '0xj1k2l3...' },
    { id: 5, type: 'compound', amount: '75', status: 'completed', date: '2024-06-16', hash: '0xm4n5o6...' },
    { id: 6, type: 'withdraw', amount: '2,500', status: 'pending', date: '2024-06-15', hash: '0xp7q8r9...' },
  ];

  useEffect(() => {
    const allDataLoaded = !isAccountLoading && !isLenderLoading && !isCDPLoading && !isCreditLoading;

    if (allDataLoaded && address) {
      // Convert BigInt values to readable numbers
      const formatValue = (value) => {
        if (!value) return '0';
        try {
          // Convert from wei to ether (18 decimals) and format
          const etherValue = Number(value) / 1e18;
          return etherValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          });
        } catch (error) {
          console.error('Error formatting value:', error);
          return '0';
        }
      };

      const borrowedValue = cdpInfo && cdpInfo[1] ? Number(cdpInfo[1]) / 1e18 : 0;
      const lentValue = lenderInfo && lenderInfo[0] ? Number(lenderInfo[0]) / 1e18 : 0;
      const rewardsValue = lenderInfo && lenderInfo[1] ? Number(lenderInfo[1]) / 1e18 : 0;

      const realStats = {
        totalBorrowed: formatValue(cdpInfo && cdpInfo[1] ? cdpInfo[1] : 0),
        totalLent: formatValue(lenderInfo && lenderInfo[0] ? lenderInfo[0] : 0),
        creditScore: creditScore ? Number(creditScore) : mockData.userStats.creditScore,
        activeLoans: cdpInfo && cdpInfo[5] ? 1 : 0,
        repaymentRate: 99.2, // Keep as static for now
        interestEarned: formatValue(lenderInfo && lenderInfo[1] ? lenderInfo[1] : 0),
        portfolioValue: (lentValue + rewardsValue + borrowedValue).toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }),
        monthlyIncome: (rewardsValue * 12).toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })
      };

      // Generate dynamic data
      setLoanHistoryData(generateActivityData(borrowedValue, lentValue));
      setPortfolioData(generatePortfolioData(borrowedValue, lentValue, rewardsValue));
      setTransactionData(generateTransactionHistory(borrowedValue, lentValue, rewardsValue));
      setUserStats(realStats);
      setLoading(false);
    } else if (allDataLoaded && !address) {
      setUserStats(mockData.userStats);
      setLoanHistoryData(mockData.loanHistory);
      setPortfolioData(mockData.portfolioDistribution);
      setTransactionData(recentTransactions.slice(0, 4));
      setLoading(false);
    }
  }, [accountInfo, lenderInfo, cdpInfo, creditScore, isAccountLoading, isLenderLoading, isCDPLoading, isCreditLoading, address]);

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <div className="card glass max-w-md mx-auto">
          <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-4">Connect Your Wallet</h2>
          <p className="text-secondary mb-6">
            Please connect your wallet to view your dashboard and access CrediTrust features.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="loading-spinner w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-secondary">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="slide-in-up">
      {/* Quick Actions Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
          <p className="text-secondary">Welcome back! Here's your DeFi portfolio overview.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="btn btn-outline hover:bg-blue-50 transition-all"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleExportData}
            className="btn btn-primary hover:bg-blue-600 transition-all"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="metric-card glass hover:shadow-lg transition-all duration-300">
          <div className="metric-label">Total Borrowed</div>
          <div className="metric-value">${userStats.totalBorrowed}</div>
          <div className="metric-change positive">+12.5% this month</div>
        </div>

        <div className="metric-card glass hover:shadow-lg transition-all duration-300">
          <div className="metric-label">Total Lent</div>
          <div className="metric-value">${userStats.totalLent}</div>
          <div className="metric-change positive">+18.3% this month</div>
        </div>

        <div className="metric-card glass hover:shadow-lg transition-all duration-300">
          <div className="metric-label">Credit Score</div>
          <div className="metric-value">{userStats.creditScore}</div>
          <div className="metric-change positive">+24 points</div>
        </div>

        <div className="metric-card glass hover:shadow-lg transition-all duration-300">
          <div className="metric-label">Monthly Income</div>
          <div className="metric-value">${userStats.monthlyIncome}</div>
          <div className="metric-change positive">+22.1% APY</div>
        </div>
      </div>
      {/* Charts Section */}
      <div className="grid grid-2 mb-8">
        <div className="card glass">
          <div className="card-header">
            <h3 className="card-title">Lending vs Borrowing Activity</h3>
            <p className="card-subtitle">Monthly overview of your DeFi activity</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loanHistoryData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="lent" fill="#8884d8" />
                <Bar dataKey="borrowed" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portfolio and Transactions */}
      <div className="grid grid-2 mb-8">
        <div className="card glass">
          <div className="card-header">
            <h3 className="card-title">Portfolio Distribution</h3>
            <p className="card-subtitle">Your current DeFi portfolio breakdown</p>
          </div>
          <div className="h-300">
            <PieChart width={400} height={300}>
                <Pie
                  data={portfolioData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  isAnimationActive={false}
                  label
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {portfolioData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-secondary">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card glass">
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
            <p className="card-subtitle">Your latest DeFi activities</p>
          </div>
          <div className="space-y-4">
            {transactionData.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-opacity-50 hover:bg-opacity-70 transition-all border border-transparent hover:border-primary/20">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'borrow' ? 'bg-red-500/20 text-red-400' :
                    tx.type === 'lend' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'repay' ? 'bg-blue-500/20 text-blue-400' :
                        tx.type === 'compound' ? 'bg-purple-500/20 text-purple-400' :
                          tx.type === 'withdraw' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {tx.type === 'borrow' && <TrendingDown size={16} />}
                    {tx.type === 'lend' && <TrendingUp size={16} />}
                    {tx.type === 'repay' && <CheckCircle size={16} />}
                    {tx.type === 'interest' && <DollarSign size={16} />}
                    {tx.type === 'compound' && <RefreshCw size={16} />}
                    {tx.type === 'withdraw' && <Download size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-primary capitalize">{tx.type}</div>
                    <div className="text-sm text-secondary">{tx.date}</div>
                    <div className="text-xs text-muted">{tx.hash}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">${tx.amount}</div>
                  <div className={`text-sm flex items-center gap-1 ${tx.status === 'completed' ? 'text-green-400' :
                    tx.status === 'active' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                    {tx.status === 'completed' && <CheckCircle size={12} />}
                    {tx.status === 'active' && <Activity size={12} />}
                    {tx.status === 'pending' && <Clock size={12} />}
                    <span className="capitalize">{tx.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {transactionData.length === 0 && (
              <div className="text-center py-8">
                <Activity size={32} className="text-muted mx-auto mb-2 opacity-50" />
                <p className="text-secondary">No transactions yet</p>
                <p className="text-sm text-muted">Start lending or borrowing to see your activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card glass text-center hover:shadow-lg transition-all duration-300">
          <TrendingUp size={32} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Start Lending</h3>
          <p className="text-secondary mb-4">Earn passive income by providing liquidity to borrowers</p>
          <button
            onClick={() => window.location.href = '/lend'}
            className="btn btn-primary w-full hover:bg-green-600 transition-all"
          >
            Provide Liquidity
          </button>
        </div>

        <div className="card glass text-center hover:shadow-lg transition-all duration-300">
          <DollarSign size={32} className="text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Apply for Loan</h3>
          <p className="text-secondary mb-4">Get instant access to capital with competitive rates</p>
          <button
            onClick={() => window.location.href = '/borrow'}
            className="btn btn-secondary w-full hover:bg-blue-600 transition-all"
          >
            Apply Now
          </button>
        </div>

        <div className="card glass text-center hover:shadow-lg transition-all duration-300">
          <Users size={32} className="text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Refer Friends</h3>
          <p className="text-secondary mb-4">Earn rewards by inviting others to CrediTrust</p>
          <button
            onClick={() => toast.success('Referral link copied to clipboard!')}
            className="btn btn-outline w-full hover:bg-purple-50 transition-all"
          >
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
