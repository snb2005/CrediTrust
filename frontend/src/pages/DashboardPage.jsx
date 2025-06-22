import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const DashboardPage = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  const mockData = {
    userStats: {
      totalBorrowed: '15,000',
      totalLent: '32,500',
      creditScore: 742,
      activeLoans: 3,
      repaymentRate: 98.5,
      interestEarned: '2,340'
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
    { id: 1, type: 'borrow', amount: '5,000', status: 'completed', date: '2024-06-20' },
    { id: 2, type: 'repay', amount: '1,250', status: 'completed', date: '2024-06-19' },
    { id: 3, type: 'lend', amount: '10,000', status: 'active', date: '2024-06-18' },
    { id: 4, type: 'interest', amount: '150', status: 'completed', date: '2024-06-17' },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUserStats(mockData.userStats);
      setLoading(false);
    }, 1000);
  }, []);

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
      {/* Header Stats */}
      <div className="grid grid-4 mb-8">
        <div className="metric-card glass">
          <div className="metric-label">Total Borrowed</div>
          <div className="metric-value">${userStats.totalBorrowed}</div>
          <div className="metric-change positive">+12.5% this month</div>
        </div>
        
        <div className="metric-card glass">
          <div className="metric-label">Total Lent</div>
          <div className="metric-value">${userStats.totalLent}</div>
          <div className="metric-change positive">+8.3% this month</div>
        </div>
        
        <div className="metric-card glass">
          <div className="metric-label">Credit Score</div>
          <div className="metric-value">{userStats.creditScore}</div>
          <div className="metric-change positive">+17 points</div>
        </div>
        
        <div className="metric-card glass">
          <div className="metric-label">Interest Earned</div>
          <div className="metric-value">${userStats.interestEarned}</div>
          <div className="metric-change positive">+15.2% APY</div>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData.loanHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)'
                  }}
                />
                <Bar dataKey="lent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="borrowed" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card glass">
          <div className="card-header">
            <h3 className="card-title">Credit Score Trend</h3>
            <p className="card-subtitle">Your credit score improvement over time</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData.creditTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4facfe" 
                  strokeWidth={3}
                  dot={{ fill: '#4facfe', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
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
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData.portfolioDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockData.portfolioDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {mockData.portfolioDistribution.map((item, index) => (
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
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-opacity-50 hover:bg-opacity-70 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'borrow' ? 'bg-red-500/20 text-red-400' :
                    tx.type === 'lend' ? 'bg-green-500/20 text-green-400' :
                    tx.type === 'repay' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {tx.type === 'borrow' && <TrendingDown size={16} />}
                    {tx.type === 'lend' && <TrendingUp size={16} />}
                    {tx.type === 'repay' && <CheckCircle size={16} />}
                    {tx.type === 'interest' && <DollarSign size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-primary capitalize">{tx.type}</div>
                    <div className="text-sm text-secondary">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">${tx.amount}</div>
                  <div className={`text-sm flex items-center gap-1 ${
                    tx.status === 'completed' ? 'text-green-400' :
                    tx.status === 'active' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {tx.status === 'completed' && <CheckCircle size={12} />}
                    {tx.status === 'active' && <Activity size={12} />}
                    {tx.status === 'pending' && <Clock size={12} />}
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-3">
        <div className="card glass text-center">
          <TrendingUp size={32} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Start Lending</h3>
          <p className="text-secondary mb-4">Earn passive income by providing liquidity to borrowers</p>
          <button className="btn btn-primary w-full">Provide Liquidity</button>
        </div>

        <div className="card glass text-center">
          <DollarSign size={32} className="text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Apply for Loan</h3>
          <p className="text-secondary mb-4">Get instant access to capital with competitive rates</p>
          <button className="btn btn-secondary w-full">Apply Now</button>
        </div>

        <div className="card glass text-center">
          <Users size={32} className="text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Refer Friends</h3>
          <p className="text-secondary mb-4">Earn rewards by inviting others to CrediTrust</p>
          <button className="btn btn-outline w-full">Share Link</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
