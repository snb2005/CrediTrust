const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function testProperBorrowing() {
    console.log('=== TEST PROPER BORROWING FLOW ===');
    
    const [deployer] = await ethers.getSigners();
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const mockToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    // Get current CDP state
    let cdp;
    try {
        cdp = await cdpVault.cdps(deployer.address);
    } catch (error) {
        console.log('No CDP found, creating one first...');
        
        // Create a new CDP with some collateral
        const collateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
        const collateralAmount = ethers.parseEther('100'); // 100 tokens as collateral
        
        // Ensure user has collateral tokens
        const userBalance = await collateralToken.balanceOf(deployer.address);
        if (userBalance < collateralAmount) {
            console.log('Minting collateral tokens...');
            await collateralToken.mint(deployer.address, collateralAmount);
        }
        
        // Approve and open CDP
        await collateralToken.approve(deploymentInfo.contracts.cdpVault, collateralAmount);
        const tx = await cdpVault.openCDP(collateralAmount, 750); // Credit score 750
        await tx.wait();
        console.log('✅ CDP created successfully');
        
        // Get the newly created CDP
        cdp = await cdpVault.cdps(deployer.address);
    }
    
    if (!cdp.isActive) {
        console.log('❌ CDP is not active');
        return;
    }
    
    console.log('Current CDP state:');
    console.log('Collateral:', ethers.formatEther(cdp.collateralAmount), 'tokens');
    console.log('Debt:', ethers.formatEther(cdp.debtAmount), 'tokens');
    
    // Calculate borrowing capacity
    const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
    const currentDebt = cdp.debtAmount;
    const collateral = cdp.collateralAmount;
    const maxPossibleDebt = (collateral * 10000n) / minRatio;
    const maxLoanAmount = maxPossibleDebt - currentDebt;
    
    console.log('\nBorrowing Capacity Analysis:');
    console.log('Max possible total debt:', ethers.formatEther(maxPossibleDebt));
    console.log('Current debt:', ethers.formatEther(currentDebt));
    console.log('Available to borrow:', ethers.formatEther(maxLoanAmount));
    
    if (maxLoanAmount <= 0n) {
        console.log('❌ Cannot borrow any more! CDP is at maximum capacity');
        return;
    }
    
    // Test with a reasonable amount (25% of available capacity)
    const testLoanAmount = maxLoanAmount / 4n;
    console.log(`\n✅ Testing with ${ethers.formatEther(testLoanAmount)} tokens (25% of available)...`);
    
    // Ensure vault has enough tokens
    const vaultBalance = await mockToken.balanceOf(deploymentInfo.contracts.cdpVault);
    console.log('Vault balance:', ethers.formatEther(vaultBalance));
    
    if (vaultBalance < testLoanAmount) {
        console.log('Minting more tokens to vault...');
        const mintAmount = ethers.parseEther('10000');
        await mockToken.mint(deploymentInfo.contracts.cdpVault, mintAmount);
        console.log('✅ Tokens minted to vault');
    }
    
    try {
        console.log('🔄 Requesting loan...');
        const balanceBefore = await mockToken.balanceOf(deployer.address);
        
        const tx = await cdpVault.requestLoan(testLoanAmount);
        console.log('Transaction hash:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Loan successful! Gas used:', receipt.gasUsed.toString());
        
        // Check results
        const balanceAfter = await mockToken.balanceOf(deployer.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        console.log('\n📊 Results:');
        console.log('Token balance increase:', ethers.formatEther(balanceIncrease));
        console.log('Expected loan amount:', ethers.formatEther(testLoanAmount));
        
        const updatedCdp = await cdpVault.cdps(deployer.address);
        console.log('Updated debt:', ethers.formatEther(updatedCdp.debtAmount));
        
        // Calculate new borrowing capacity
        const newMaxLoanAmount = maxPossibleDebt - updatedCdp.debtAmount;
        console.log('Remaining borrowing capacity:', ethers.formatEther(newMaxLoanAmount));
        
        console.log('\n🎉 Borrowing flow completed successfully!');
        
    } catch (error) {
        console.log('❌ Loan failed:', error.message);
        
        if (error.reason) {
            console.log('Revert reason:', error.reason);
        }
    }
}

testProperBorrowing();
