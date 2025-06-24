const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function debugCDPIssue() {
    console.log('=== DEBUGGING CDP OPENING ISSUE ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('User address:', deployer.address);
    
    // Get contract instances
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const collateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const debtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    console.log('\n=== CONTRACT ADDRESSES ===');
    console.log('CDP Vault:', deploymentInfo.contracts.cdpVault);
    console.log('Collateral Token:', deploymentInfo.contracts.collateralToken);
    console.log('Debt Token:', deploymentInfo.contracts.debtToken);
    
    // Check balances
    const collateralBalance = await collateralToken.balanceOf(deployer.address);
    const debtBalance = await debtToken.balanceOf(deployer.address);
    
    console.log('\n=== USER BALANCES ===');
    console.log('Collateral Token Balance:', ethers.formatEther(collateralBalance));
    console.log('Debt Token Balance:', ethers.formatEther(debtBalance));
    
    // Check allowances
    const collateralAllowance = await collateralToken.allowance(deployer.address, deploymentInfo.contracts.cdpVault);
    
    console.log('\n=== ALLOWANCES ===');
    console.log('Collateral Token Allowance for CDP Vault:', ethers.formatEther(collateralAllowance));
    
    // Check if CDP already exists
    try {
        const existingCDP = await cdpVault.cdps(deployer.address);
        console.log('\n=== EXISTING CDP ===');
        console.log('Is Active:', existingCDP.isActive);
        console.log('Collateral Amount:', ethers.formatEther(existingCDP.collateralAmount));
        console.log('Debt Amount:', ethers.formatEther(existingCDP.debtAmount));
    } catch (error) {
        console.log('\n=== EXISTING CDP ===');
        console.log('No existing CDP found or error:', error.message);
    }
    
    // Test parameters
    const testCollateralAmount = ethers.parseEther('1000'); // 1000 tokens
    const testCreditScore = 700;
    
    console.log('\n=== TESTING REQUIREMENTS ===');
    console.log('Test Collateral Amount:', ethers.formatEther(testCollateralAmount));
    console.log('Test Credit Score:', testCreditScore);
    
    // Check if user has enough balance
    if (collateralBalance < testCollateralAmount) {
        console.log('❌ Insufficient collateral balance');
        console.log('Minting collateral tokens...');
        
        try {
            const mintTx = await collateralToken.mint(deployer.address, testCollateralAmount);
            await mintTx.wait();
            console.log('✅ Collateral tokens minted');
            
            const newBalance = await collateralToken.balanceOf(deployer.address);
            console.log('New balance:', ethers.formatEther(newBalance));
        } catch (error) {
            console.log('❌ Failed to mint tokens:', error.message);
            return;
        }
    } else {
        console.log('✅ Sufficient collateral balance');
    }
    
    // Check if allowance is sufficient
    if (collateralAllowance < testCollateralAmount) {
        console.log('❌ Insufficient allowance');
        console.log('Approving CDP vault...');
        
        try {
            const approveTx = await collateralToken.approve(deploymentInfo.contracts.cdpVault, testCollateralAmount);
            await approveTx.wait();
            console.log('✅ CDP vault approved');
            
            const newAllowance = await collateralToken.allowance(deployer.address, deploymentInfo.contracts.cdpVault);
            console.log('New allowance:', ethers.formatEther(newAllowance));
        } catch (error) {
            console.log('❌ Failed to approve:', error.message);
            return;
        }
    } else {
        console.log('✅ Sufficient allowance');
    }
    
    // Now try to open CDP
    console.log('\n=== ATTEMPTING TO OPEN CDP ===');
    try {
        const openTx = await cdpVault.openCDP(testCollateralAmount, testCreditScore);
        const receipt = await openTx.wait();
        console.log('✅ CDP opened successfully!');
        console.log('Transaction hash:', receipt.hash);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Check the created CDP
        const newCDP = await cdpVault.cdps(deployer.address);
        console.log('\n=== NEW CDP DETAILS ===');
        console.log('Is Active:', newCDP.isActive);
        console.log('Collateral Amount:', ethers.formatEther(newCDP.collateralAmount));
        console.log('Debt Amount:', ethers.formatEther(newCDP.debtAmount));
        console.log('Credit Score:', newCDP.creditScore.toString());
        console.log('APR:', newCDP.apr.toString());
        
    } catch (error) {
        console.log('❌ Failed to open CDP:', error.message);
        
        // Try to get more detailed error info
        if (error.reason) {
            console.log('Revert reason:', error.reason);
        }
        if (error.data) {
            console.log('Error data:', error.data);
        }
    }
}

debugCDPIssue().catch(console.error);
