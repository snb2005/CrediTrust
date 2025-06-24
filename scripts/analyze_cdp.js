const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function analyzeOriginalCDP() {
    console.log('=== ANALYZE ORIGINAL CDP ===');
    
    const [deployer] = await ethers.getSigners();
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    
    // Get current CDP state
    const cdp = await cdpVault.cdps(deployer.address);
    
    console.log('Current CDP Analysis:');
    console.log('Collateral:', ethers.formatEther(cdp.collateralAmount), 'tokens');
    console.log('Debt:', ethers.formatEther(cdp.debtAmount), 'tokens');  
    console.log('APR:', cdp.apr.toString(), 'basis points');
    console.log('Last interest update:', new Date(Number(cdp.lastInterestUpdate) * 1000));
    console.log('Due date:', new Date(Number(cdp.dueDate) * 1000));
    
    // Calculate current ratio
    const currentRatio = (cdp.collateralAmount * 10000n) / cdp.debtAmount;
    console.log('Current collateral ratio:', currentRatio.toString(), '(should be >=', (await cdpVault.MIN_COLLATERAL_RATIO()).toString(), ')');
    console.log('Current ratio percentage:', Number(currentRatio) / 100, '%');
    
    // Calculate initial loan amount (when opened)
    // The debt has grown due to interest
    const timeElapsed = BigInt(Math.floor(Date.now() / 1000)) - cdp.lastInterestUpdate;
    console.log('Time since last interest update:', timeElapsed.toString(), 'seconds');
    
    // Estimate original loan amount
    // Assuming simple interest calculation: debt = principal * (1 + rate * time)
    const annualRate = Number(cdp.apr) / 10000; // Convert basis points to decimal
    const timeInYears = Number(timeElapsed) / (365 * 24 * 3600);
    const estimatedPrincipal = Number(ethers.formatEther(cdp.debtAmount)) / (1 + annualRate * timeInYears);
    
    console.log('Annual rate:', annualRate * 100, '%');
    console.log('Time elapsed (years):', timeInYears);
    console.log('Estimated original loan amount:', estimatedPrincipal.toFixed(6), 'tokens');
    console.log('Interest accrued:', (Number(ethers.formatEther(cdp.debtAmount)) - estimatedPrincipal).toFixed(6), 'tokens');
    
    // Check what the original ratio was
    const originalRatio = (Number(ethers.formatEther(cdp.collateralAmount)) * 100) / estimatedPrincipal;
    console.log('Original collateral ratio (estimated):', originalRatio.toFixed(2), '%');
    
    // Calculate how much more can be borrowed
    const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
    const maxTotalDebt = (cdp.collateralAmount * 10000n) / minRatio;
    const availableToBorrow = maxTotalDebt - cdp.debtAmount;
    
    console.log('\nBorrowing Capacity:');
    console.log('Max total debt allowed:', ethers.formatEther(maxTotalDebt), 'tokens');
    console.log('Current debt:', ethers.formatEther(cdp.debtAmount), 'tokens');
    console.log('Available to borrow:', ethers.formatEther(availableToBorrow), 'tokens');
}

analyzeOriginalCDP();
