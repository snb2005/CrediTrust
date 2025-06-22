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

// Contract addresses (update these with your deployed contracts)
export const CONTRACT_ADDRESSES = {
  CDP_VAULT: '0x5FbDB2315678afecb367f032d93F642f64180a59', // Replace with actual address
  CREDIT_AGENT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Replace with actual address
  X402_ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Replace with actual address
};

// Backend API URL
export const API_BASE_URL = 'http://localhost:5000/api';

export default wagmiConfig;
