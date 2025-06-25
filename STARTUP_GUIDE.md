# CrediTrust Startup Guide

This document provides step-by-step instructions to start the CrediTrust DeFi platform.

## Prerequisites
- Node.js v16+ and npm
- Python 3.8+ for the backend server

## Step 1: Start the Local Blockchain
```bash
# Kill any existing hardhat processes
pkill -f "hardhat node" || true

# Start the Hardhat local blockchain in a terminal
cd /home/snb/Desktop/coinbase/CrediTrust
npx hardhat node --port 8545
```

## Step 2: Deploy Smart Contracts
```bash
# In a new terminal, clean compile contracts
cd /home/snb/Desktop/coinbase/CrediTrust
rm -rf cache/ artifacts/
npx hardhat compile

# Deploy the contracts
npx hardhat run scripts/deploy.js --network localhost
```

## Step 3: Update Contract ABIs for Frontend
```bash
# Update the ABIs to match newly deployed contracts
cd /home/snb/Desktop/coinbase/CrediTrust
node update-abis.js
```

## Step 4: Test Contract Functionality (Optional)
```bash
# Test the complete CDP flow to ensure everything works
cd /home/snb/Desktop/coinbase/CrediTrust
node scripts/test_cdp_flow.js
```

## Step 5: Start the Backend Server
```bash
# Start the Python backend server
cd /home/snb/Desktop/coinbase/CrediTrust/backend
python app.py
```

## Step 6: Start the Frontend Application
```bash
# Start the React frontend
cd /home/snb/Desktop/coinbase/CrediTrust/frontend
npm start
```

## Accessing the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Troubleshooting

### Contract Interaction Errors (NaN to BigInt)
The NaN to BigInt conversion errors have been fixed in BorrowingPage.jsx. If you still encounter them:
1. Ensure you're entering valid numeric values in the borrowing form
2. Clear the browser cache and reload the page
3. Check that all contract addresses are correct in wagmi.js

### Internal JSON-RPC Error / Contract Function Reverted
This typically indicates one of the following issues:

1. **Insufficient Collateral Token Balance**: 
   - The user doesn't have enough collateral tokens
   - Run: `node scripts/test_cdp_flow.js` to mint test tokens

2. **Missing Approval**: 
   - The CDP vault hasn't been approved to spend user's collateral tokens
   - This should be handled automatically by the frontend

3. **CDP Already Exists**: 
   - User already has an active CDP
   - Use the CDP management interface to add collateral or make payments

4. **Contract Address Mismatch**: 
   - Frontend is using outdated contract addresses
   - Ensure deployment-info.json and wagmi.js have matching addresses

### Port Already in Use
If you see "address already in use" errors:
```bash
# Find and kill processes on the port
sudo lsof -i:8545 -t | xargs kill -9
```

### Contract Deployment Issues
If contracts aren't working properly:
1. Kill all hardhat processes: `pkill -f "hardhat node"`
2. Clean compile: `rm -rf cache/ artifacts/ && npx hardhat compile`
3. Start fresh hardhat node: `npx hardhat node --port 8545`
4. Redeploy: `npx hardhat run scripts/deploy.js --network localhost`
5. Update ABIs: `node update-abis.js`

### Loans Not Persistent
If borrowed loans don't appear in user wallet:
1. Check that the hardhat node is still running
2. Verify contract addresses match between frontend and backend
3. Ensure the CDP was created successfully before borrowing
4. Check browser console for any JavaScript errors

### Testing Contract Functions
To verify contracts are working correctly:
```bash
# Test complete CDP flow including borrowing and repayment
node scripts/test_cdp_flow.js
```

This should show successful CDP creation, borrowing, and repayment operations.

cd /home/snb/Desktop/coinbase/CrediTrust && npx hardhat run deploy_real.js --network localhost

cd /home/snb/Desktop/coinbase/CrediTrust && npx hardhat run test_cdp_creation.js --network localhost