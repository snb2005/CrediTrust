const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function investigateLoanPersistence() {
    console.log('=== INVESTIGATE LOAN PERSISTENCE ISSUE ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('Using account:', deployer.address);
    
    // Get contract instances
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const debtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    console.log('\n📊 Initial State:');
    
    // Check debt token balances
    const userBalance = await debtToken.balanceOf(deployer.address);
    const vaultBalance = await debtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    const totalSupply = await debtToken.totalSupply();
    
    console.log('User debt token balance:', ethers.formatEther(userBalance));
    console.log('Vault debt token balance:', ethers.formatEther(vaultBalance));
    console.log('Total debt token supply:', ethers.formatEther(totalSupply));
    
    // Check CDP state
    const cdp = await cdpVault.cdps(deployer.address);
    if (cdp.isActive) {
        console.log('\nCDP State:');
        console.log('Collateral:', ethers.formatEther(cdp.collateralAmount));
        console.log('Debt:', ethers.formatEther(cdp.debtAmount));
        console.log('APR:', cdp.apr.toString());
        console.log('Active:', cdp.isActive);
        
        // Check total debt with interest
        const totalDebtWithInterest = await cdpVault.getTotalDebtWithInterest(deployer.address);
        console.log('Total debt with interest:', ethers.formatEther(totalDebtWithInterest));
    } else {
        console.log('No active CDP found');
    }
    
    // Test a small loan request
    console.log('\n=== TESTING LOAN PERSISTENCE ===');
    
    if (!cdp.isActive) {
        console.log('❌ No active CDP to test with');
        return;
    }
    
    // Calculate safe loan amount
    const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
    const maxTotalDebt = (cdp.collateralAmount * 10000n) / minRatio;
    const availableCapacity = maxTotalDebt - cdp.debtAmount;
    
    if (availableCapacity <= 0n) {
        console.log('❌ No borrowing capacity available');
        return;
    }
    
    const testLoanAmount = availableCapacity / 10n; // Use 10% of available capacity
    console.log(`\nTesting loan of ${ethers.formatEther(testLoanAmount)} tokens...`);
    
    try {
        // Record balances before loan
        const balanceBefore = await debtToken.balanceOf(deployer.address);
        const vaultBalanceBefore = await debtToken.balanceOf(deploymentInfo.contracts.cdpVault);
        
        console.log('Before loan:');
        console.log('- User balance:', ethers.formatEther(balanceBefore));
        console.log('- Vault balance:', ethers.formatEther(vaultBalanceBefore));
        
        // Request loan
        const tx = await cdpVault.requestLoan(testLoanAmount);
        const receipt = await tx.wait();
        console.log('✅ Loan transaction successful, hash:', tx.hash);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Check balances after loan
        const balanceAfter = await debtToken.balanceOf(deployer.address);
        const vaultBalanceAfter = await debtToken.balanceOf(deploymentInfo.contracts.cdpVault);
        
        console.log('\nAfter loan:');
        console.log('- User balance:', ethers.formatEther(balanceAfter));
        console.log('- Vault balance:', ethers.formatEther(vaultBalanceAfter));
        
        // Calculate changes
        const userBalanceChange = balanceAfter - balanceBefore;
        const vaultBalanceChange = vaultBalanceBefore - vaultBalanceAfter;
        
        console.log('\nBalance Changes:');
        console.log('- User balance change:', ethers.formatEther(userBalanceChange));
        console.log('- Vault balance change:', ethers.formatEther(vaultBalanceChange));
        console.log('- Expected loan amount:', ethers.formatEther(testLoanAmount));
        
        // Verify the changes match expectations
        if (userBalanceChange === testLoanAmount && vaultBalanceChange === testLoanAmount) {
            console.log('✅ Loan persistence working correctly!');
        } else {
            console.log('❌ Loan persistence issue detected:');
            console.log('   Expected user increase:', ethers.formatEther(testLoanAmount));
            console.log('   Actual user increase:', ethers.formatEther(userBalanceChange));
            console.log('   Expected vault decrease:', ethers.formatEther(testLoanAmount));
            console.log('   Actual vault decrease:', ethers.formatEther(vaultBalanceChange));
        }
        
        // Wait a bit and check if balances persist
        console.log('\n⏰ Waiting 5 seconds to check persistence...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const persistentBalance = await debtToken.balanceOf(deployer.address);
        console.log('Balance after 5 seconds:', ethers.formatEther(persistentBalance));
        
        if (persistentBalance === balanceAfter) {
            console.log('✅ Balances are persistent!');
        } else {
            console.log('❌ Balance persistence issue:');
            console.log('   Expected:', ethers.formatEther(balanceAfter));
            console.log('   Actual:', ethers.formatEther(persistentBalance));
        }
        
        // Check if the loan shows up in CDP debt
        const updatedCdp = await cdpVault.cdps(deployer.address);
        console.log('\nUpdated CDP debt:', ethers.formatEther(updatedCdp.debtAmount));
        
        // Check transaction events
        console.log('\nTransaction Events:');
        for (const log of receipt.logs) {
            try {
                const parsed = cdpVault.interface.parseLog(log);
                console.log('- Event:', parsed.name, parsed.args);
            } catch (e) {
                // Ignore unparseable logs
            }
        }
        
    } catch (error) {
        console.log('❌ Loan test failed:', error.message);
        if (error.reason) {
            console.log('Revert reason:', error.reason);
        }
    }
}

investigateLoanPersistence();
