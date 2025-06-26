## 📢 Disclosure

This project was developed during the parallel timelines of the *Coinbase Agents in Action Hackathon* and *Chromion: A Chainlink Hackathon*.

The **Chainlink-powered decentralized lending protocol** was enhanced with Coinbase technologies such as:

- 🛡️ **CDP Wallet** – for secure, programmable wallet integration  
- 💸 **x402pay** – for monetization of on-chain credit-scoring agents

The project satisfies the unique requirements of **both hackathons**, and all development occurred **within their official timeframes**.

# CrediTrust: Autonomous Risk-Based Microcredit Protocol

## Overview
CrediTrust is a complete decentralized lending protocol that combines CDP Vault, x402Pay, and AgentKit for on-chain lending with an integrated React frontend application.

## Repository Structure

### Smart Contracts (`/contracts`)
- **CDPVault.sol** - Manages collateralized positions and APR logic
- **CreditAgent.sol** - Handles automated monitoring and actions  
- **x402Router.sol** - Routes payments using x402Pay
- **MockERC20.sol** - Test token for development

### Frontend Application (`/frontend`)
- **React-based Web Interface** - Complete DeFi lending UI
- **Web3 Integration** - Wagmi v2 + RainbowKit for wallet connections
- **Responsive Design** - Modern UI with gradient themes
- **Smart Contract Integration** - Direct interaction with deployed contracts

### Backend API (`/backend`)
- **app.py** - Flask-based ML credit scoring API
- **creditrust.db** - SQLite database for credit data
- **requirements.txt** - Python dependencies

### Deployment (`/scripts`)
- **deploy.js** - Contract deployment script
- **agent_watch.js** - AgentKit monitoring logic
- **automation_tasks.js** - Chainlink automation setup

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.8+

### Quick Start
```bash
# Install all dependencies
npm install
npm run frontend:install

# Start the frontend development server
npm run dev

# Or start individual services
npm run frontend:dev  # React app on http://localhost:3003
npm run backend       # Python API
npm run compile       # Compile smart contracts
```
- Hardhat
- Hardhat
- MetaMask or CDP Wallet

### Installation

1. Clone and install dependencies:
```bash
npm install
cd backend && pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Fill in your API keys and contract addresses
```

3. Deploy contracts:
```bash
npx hardhat deploy --network base-sepolia
```

4. Start backend:
```bash
cd backend && python app.py
```

5. Start frontend:
```bash
npm run dev
```

## Demo Flow

1. **Open Credit Line**: User connects CDP Wallet and locks collateral
2. **Risk Assessment**: Backend ML API calculates credit score and APR
3. **Loan Disbursal**: Funds disbursed via x402Pay with calculated APR
4. **Autonomous Monitoring**: AgentKit monitors repayment status
5. **Automated Actions**: Agents send reminders and trigger liquidation if needed
6. **Repayment Success**: Successful repayments improve credit score

## Tech Stack
- **Blockchain**: Solidity, Hardhat, Base Network
- **Wallets**: CDP Wallet, x402Pay
- **Automation**: Chainlink Automation, Chainlink VRF
- **Agents**: AgentKit
- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Flask, scikit-learn
- **Libraries**: Ethers.js, Viem

