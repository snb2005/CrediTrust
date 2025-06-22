// Contract ABIs for CrediTrust React App
export const CDP_VAULT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_collateralToken", "type": "address"},
      {"internalType": "address", "name": "_debtToken", "type": "address"},
      {"internalType": "address", "name": "_vrfCoordinator", "type": "address"},
      {"internalType": "uint64", "name": "_subscriptionId", "type": "uint64"},
      {"internalType": "bytes32", "name": "_gasLane", "type": "bytes32"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "depositCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "borrowDebt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "repayDebt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "withdrawCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getAccountInformation",
    "outputs": [
      {"internalType": "uint256", "name": "totalCollateralValueInUsd", "type": "uint256"},
      {"internalType": "uint256", "name": "totalDebtValueInUsd", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getHealthFactor",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const CREDIT_AGENT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_vrfCoordinator", "type": "address"},
      {"internalType": "uint64", "name": "_subscriptionId", "type": "uint64"},
      {"internalType": "bytes32", "name": "_gasLane", "type": "bytes32"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getCreditScore",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "loanAmount", "type": "uint256"}
    ],
    "name": "assessRisk",
    "outputs": [
      {"internalType": "uint256", "name": "riskScore", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRate", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "updateCreditScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "balanceOf",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {"internalType": "uint8", "name": "", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
