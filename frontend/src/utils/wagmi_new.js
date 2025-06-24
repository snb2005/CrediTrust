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
  CDP_VAULT: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319',
  CREDIT_AGENT: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
  X402_ROUTER: '0x09635F643e140090A9A8Dcd712eD6285858ceBef',
  COLLATERAL_TOKEN: '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
  DEBT_TOKEN: '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f',
};

// Backend API URL
export const API_BASE_URL = 'http://localhost:5000/api';

export default wagmiConfig;
