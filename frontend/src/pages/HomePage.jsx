import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Lock, 
  Zap, 
  BarChart3,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: <Shield size={24} />,
      title: 'Autonomous Risk Assessment',
      description: 'AI-powered credit scoring using machine learning algorithms to evaluate borrower risk profiles automatically.'
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'Dynamic Interest Rates',
      description: 'Risk-based interest rates that adjust automatically based on market conditions and borrower profiles.'
    },
    {
      icon: <Lock size={24} />,
      title: 'Secure Smart Contracts',
      description: 'Audited smart contracts ensure transparent and secure lending operations on the blockchain.'
    },
    {
      icon: <Zap size={24} />,
      title: 'Instant Processing',
      description: 'Lightning-fast loan approvals and disbursements through automated decision-making systems.'
    },
    {
      icon: <Users size={24} />,
      title: 'Decentralized Governance',
      description: 'Community-driven protocol governance allowing stakeholders to participate in key decisions.'
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboards with real-time metrics and performance analytics for all participants.'
    }
  ];

  const stats = [
    { value: '$2.5M+', label: 'Total Value Locked' },
    { value: '1,250+', label: 'Active Loans' },
    { value: '95.2%', label: 'Repayment Rate' },
    { value: '24/7', label: 'Uptime' }
  ];

  const benefits = [
    'No traditional credit checks required',
    'Global accessibility with crypto wallets',
    'Transparent and auditable processes',
    'Lower fees than traditional lending',
    'Instant liquidity for lenders',
    'Risk-adjusted returns'
  ];

  return (
    <div className="slide-in-up">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">
          The Future of
          <br />
          Decentralized Lending
        </h1>
        <p className="hero-subtitle">
          CrediTrust revolutionizes microcredit with autonomous risk assessment, 
          smart contracts, and AI-powered credit scoring. Experience the next 
          generation of decentralized finance.
        </p>
        <div className="hero-cta">
          <Link to="/borrow" className="btn btn-primary">
            Start Borrowing
            <ArrowRight size={20} />
          </Link>
          <Link to="/lend" className="btn btn-secondary">
            Start Lending
            <TrendingUp size={20} />
          </Link>
          <Link to="/dashboard" className="btn btn-outline">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card glass">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Why Choose CrediTrust?
          </h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Our platform combines cutting-edge technology with financial innovation 
            to create a seamless lending experience.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card slide-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mt-16">
        <div className="card glass-intense">
          <div className="grid grid-2">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-6">
                Platform Benefits
              </h3>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle 
                      size={20} 
                      className="text-green-500 flex-shrink-0" 
                    />
                    <span className="text-secondary">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/dashboard" className="btn btn-primary">
                  Get Started Today
                  <ArrowRight size={20} />
                </Link>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-64 h-64 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Shield size={48} className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center mt-16">
        <div className="card glass">
          <h3 className="text-2xl font-bold text-primary mb-4">
            Ready to Join the DeFi Revolution?
          </h3>
          <p className="text-secondary mb-6">
            Connect your wallet and start participating in the future of finance today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/borrow" className="btn btn-primary">
              Apply for Loan
            </Link>
            <Link to="/lend" className="btn btn-secondary">
              Provide Liquidity
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
