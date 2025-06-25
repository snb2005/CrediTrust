import { createConfig, http } from 'wagmi';
import { hardhat, sepolia, mainnet } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Define the Hardhat local network
const hardhatLocal = {
  ...hardhat,
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: 'CrediTrust',
  projectId: 'your-project-id', // Get this from WalletConnect Cloud
  chains: [hardhatLocal, sepolia, mainnet],
  transports: {
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

// Contract addresses (updated with deployed contracts)
export const CONTRACT_ADDRESSES = {
  CDP_VAULT: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  CREDIT_AGENT: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  X402_ROUTER: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
  COLLATERAL_TOKEN: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  DEBT_TOKEN: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
};

// Backend API URL
export const API_BASE_URL = 'http://localhost:5000/api';

export default wagmiConfig;
