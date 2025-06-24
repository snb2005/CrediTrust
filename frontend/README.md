# CrediTrust React Frontend

## Overview
Modern React frontend application for the CrediTrust decentralized lending protocol. Features a beautiful UI with Web3 integration for managing credit positions, borrowing, lending, and CDP management.

## Features
- 🔗 **Web3 Integration** - Connect with MetaMask, WalletConnect, and other wallets
- 💰 **Complete DeFi Interface** - Borrow, lend, and manage CDPs
- 📊 **Real-time Dashboard** - Track credit scores, positions, and market data
- 🎨 **Modern UI/UX** - Responsive design with gradient themes and animations
- ⚡ **Fast Performance** - Optimized React 18 with code splitting

## Tech Stack
- **React 18** - Modern functional components with hooks
- **Wagmi v2** - Ethereum interactions and wallet management
- **RainbowKit** - Beautiful wallet connection UI
- **React Router v6** - Client-side routing
- **Ethers v6** - Blockchain interactions
- **React Hot Toast** - User notifications

## Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Navigation.jsx
│   ├── WalletConnect.jsx
│   ├── CreditScoreCard.jsx
│   ├── DashboardOverview.jsx
│   ├── MarketStats.jsx
│   ├── RepaymentTracker.jsx
│   ├── CDPManager.jsx
│   └── NetworkGuide.jsx
├── pages/              # Page components
│   ├── HomePage.jsx
│   ├── DashboardPage.jsx
│   ├── LendingPage.jsx
│   └── BorrowingPage.jsx
├── hooks/              # Custom React hooks
│   └── useContracts.js
├── utils/              # Web3 configuration
│   └── wagmi.js
├── contracts/          # Contract ABIs
│   └── abis.js
└── styles/             # CSS styling
    └── index.css
```

## Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation
```bash
cd /home/snb/Desktop/CrediTrust-React
npm install
```

### Development
```bash
npm start
```
Open [http://localhost:3002](http://localhost:3002) in your browser.

### Build for Production
```bash
npm run build
```

## Smart Contracts Integ🔍 Checking current lender info...
Lender info: {
  stakedAmount: '117.0',
  accruedRewards: '0.000012799657534246',
  reputation: '100',
  isActive: true
}ration
Update contract addresses in `src/contracts/abis.js` to connect to deployed contracts:

```javascript
export const CONTRACT_ADDRESSES = {
  CDP_VAULT: "0x...",      // Your deployed CDP Vault address
  CREDIT_AGENT: "0x...",   // Your deployed Credit Agent address
  USDC: "0x..."            // USDC token address
};
```

## Environment Setup
The app automatically connects to Base Sepolia testnet. To change networks, update the configuration in `src/utils/wagmi.js`.

## Features Overview

### 🏠 Homepage
- Protocol overview and statistics
- Quick access to main features
- Market highlights

### 📋 Dashboard  
- Personal credit score and history
- Active positions and loans
- Portfolio overview

### 💸 Lending
- Browse available lending opportunities
- Stake in lending pools
- Track lending returns

### 🏦 Borrowing
- Open credit lines with collateral
- Manage existing loans
- Real-time APR calculations

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
MIT License - see LICENSE file for details
