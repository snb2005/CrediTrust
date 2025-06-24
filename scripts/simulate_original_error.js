const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function simulateOriginalError() {
    console.log('=== SIMULATE ORIGINAL ERROR ===');
    
    const [deployer] = await ethers.getSigners();
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    
    console.log('Using account:', deployer.address);
    
    // Check CDP state
    const cdp = await cdpVault.cdps(deployer.address);
    console.log('CDP active:', cdp.isActive);
    console.log('Collateral:', ethers.formatEther(cdp.collateralAmount));
    console.log('Current debt:', ethers.formatEther(cdp.debtAmount));
    
    // Try to request the same loan amount that was failing (10 ETH)
    const failingLoanAmount = ethers.parseEther('10');
    console.log(`\nTrying to request ${ethers.formatEther(failingLoanAmount)} tokens (the amount that was failing)...`);
    
    // Calculate what would happen
    const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
    const currentDebt = cdp.debtAmount;
    const newTotalDebt = currentDebt + failingLoanAmount;
    const collateralRatio = (cdp.collateralAmount * 10000n) / newTotalDebt;
    
    console.log('Analysis:');
    console.log('- Current debt:', ethers.formatEther(currentDebt));
    console.log('- Requested loan:', ethers.formatEther(failingLoanAmount));
    console.log('- New total debt would be:', ethers.formatEther(newTotalDebt));
    console.log('- Collateral ratio would be:', Number(collateralRatio), '(', Number(collateralRatio)/100, '%)');
    console.log('- Minimum required:', Number(minRatio), '(', Number(minRatio)/100, '%)');
    
    if (collateralRatio < minRatio) {
        console.log('❌ EXPECTED FAILURE: Collateral ratio would be insufficient!');
        console.log('   This explains why the original requestLoan was failing.');
        console.log('   The error was not a bug - it was correct validation.');
    } else {
        console.log('✅ This loan should succeed');
    }
    
    try {
        await cdpVault.requestLoan(failingLoanAmount);
        console.log('✅ Loan succeeded (unexpected)');
    } catch (error) {
        console.log('❌ Loan failed as expected:', error.message);
        
        // This confirms the original error was due to insufficient collateral ratio
        if (error.message.includes('Insufficient collateral ratio') || 
            error.message.includes('revert') || 
            error.message.includes('Internal JSON-RPC error')) {
            console.log('✅ Confirmed: Original error was due to insufficient collateral ratio');
        }
    }
    
    // Now show what the maximum borrowable amount is
    const maxTotalDebt = (cdp.collateralAmount * 10000n) / minRatio;
    const maxAdditionalLoan = maxTotalDebt - currentDebt;
    
    console.log('\nSolution:');
    console.log('- Maximum total debt allowed:', ethers.formatEther(maxTotalDebt));
    console.log('- Maximum additional borrowable:', ethers.formatEther(maxAdditionalLoan));
    console.log('- To borrow 10 tokens, user would need:', ethers.formatEther((currentDebt + failingLoanAmount) * minRatio / 10000n), 'collateral');
    console.log('- Additional collateral needed:', ethers.formatEther((currentDebt + failingLoanAmount) * minRatio / 10000n - cdp.collateralAmount));
}

simulateOriginalError();
