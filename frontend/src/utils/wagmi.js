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
  CDP_VAULT: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
  CREDIT_AGENT: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
  X402_ROUTER: '0x59b670e9fA9D0A427751Af201D676719a970857b',
  COLLATERAL_TOKEN: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
  DEBT_TOKEN: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
};

// Backend API URL
export const API_BASE_URL = 'http://localhost:5000/api';

export default wagmiConfig;
