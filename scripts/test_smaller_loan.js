const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function testWithSmallerLoan() {
    console.log('=== TEST WITH SMALLER LOAN ===');
    
    const [deployer] = await ethers.getSigners();
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const mockToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    // Get current CDP state
    const cdp = await cdpVault.cdps(deployer.address);
    
    console.log('Current CDP state:');
    console.log('Collateral:', ethers.formatEther(cdp.collateralAmount));
    console.log('Debt:', ethers.formatEther(cdp.debtAmount));
    
    // Calculate maximum loan amount possible
    const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
    const currentDebt = cdp.debtAmount;
    const collateral = cdp.collateralAmount;
    
    // Formula: (collateral * 10000) / (currentDebt + maxLoan) >= minRatio
    // Solve for maxLoan: maxLoan <= (collateral * 10000) / minRatio - currentDebt
    const maxPossibleDebt = (collateral * 10000n) / minRatio;
    const maxLoanAmount = maxPossibleDebt - currentDebt;
    
    console.log('Max possible total debt:', ethers.formatEther(maxPossibleDebt));
    console.log('Max additional loan amount:', ethers.formatEther(maxLoanAmount));
    
    if (maxLoanAmount <= 0n) {
        console.log('❌ Cannot borrow any more! CDP is at maximum capacity');
        
        // Show what would be needed to borrow more
        const neededCollateral = (currentDebt * minRatio) / 10000n;
        const additionalCollateral = neededCollateral - collateral;
        console.log('To maintain 120% ratio with current debt, need collateral:', ethers.formatEther(neededCollateral));
        console.log('Additional collateral needed:', ethers.formatEther(additionalCollateral));
        return;
    }
    
    // Try with a small loan that should work
    const testLoanAmount = maxLoanAmount / 2n; // Use half of max available
    console.log(`\nTesting with ${ethers.formatEther(testLoanAmount)} tokens...`);
    
    // Check vault balance
    const vaultBalance = await mockToken.balanceOf(deploymentInfo.contracts.cdpVault);
    console.log('Vault balance:', ethers.formatEther(vaultBalance));
    
    if (vaultBalance < testLoanAmount) {
        console.log('Minting more tokens to vault...');
        const mintAmount = ethers.parseEther('10000');
        const mintTx = await mockToken.mint(deploymentInfo.contracts.cdpVault, mintAmount);
        await mintTx.wait();
        
        const newBalance = await mockToken.balanceOf(deploymentInfo.contracts.cdpVault);
        console.log('New vault balance:', ethers.formatEther(newBalance));
    }
    
    try {
        const tx = await cdpVault.requestLoan(testLoanAmount);
        console.log('Transaction hash:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Loan successful!');
        
        const updatedCdp = await cdpVault.cdps(deployer.address);
        console.log('Updated debt:', ethers.formatEther(updatedCdp.debtAmount));
        
    } catch (error) {
        console.log('❌ requestLoan still failed:', error.message);
        
        // Try static call to get more details
        try {
            await cdpVault.callStatic.requestLoan(testLoanAmount);
        } catch (staticError) {
            console.log('Static call error:', staticError.message);
            if (staticError.reason) {
                console.log('Revert reason:', staticError.reason);
            }
        }
    }
}

testWithSmallerLoan();
