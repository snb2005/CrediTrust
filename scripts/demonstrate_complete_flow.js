const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function demonstrateCompleteBorrowingFlow() {
    console.log('=== COMPLETE BORROWING FLOW DEMONSTRATION ===');
    
    const signers = await ethers.getSigners();
    const newBorrower = signers[1]; // Use second account as a new borrower
    console.log('Using new borrower account:', newBorrower.address);
    
    // Get contracts
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const collateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const debtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    console.log('\n📊 Initial Balances:');
    const initialCollateralBalance = await collateralToken.balanceOf(newBorrower.address);
    const initialDebtBalance = await debtToken.balanceOf(newBorrower.address);
    console.log('Collateral tokens:', ethers.formatEther(initialCollateralBalance));
    console.log('Debt tokens:', ethers.formatEther(initialDebtBalance));
    
    // Mint some collateral tokens to the new borrower
    if (initialCollateralBalance < ethers.parseEther('2000')) {
        console.log('\n🪙 Minting collateral tokens to new borrower...');
        const mintTx = await collateralToken.mint(newBorrower.address, ethers.parseEther('2000'));
        await mintTx.wait();
        console.log('✅ Minted 2000 collateral tokens');
    }
    
    // Mint some debt tokens to the vault
    console.log('\n🏦 Ensuring vault has debt tokens...');
    const vaultBalance = await debtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    if (vaultBalance < ethers.parseEther('5000')) {
        const mintTx = await debtToken.mint(deploymentInfo.contracts.cdpVault, ethers.parseEther('10000'));
        await mintTx.wait();
        console.log('✅ Minted debt tokens to vault');
    }
    
    console.log('\n=== STEP 1: Open New CDP ===');
    
    const collateralAmount = ethers.parseEther('1000'); // 1000 tokens
    const creditScore = 750;
    
    // Check if CDP already exists
    try {
        const existingCdp = await cdpVault.cdps(newBorrower.address);
        if (existingCdp.isActive) {
            console.log('⚠️  CDP already exists for this account');
            console.log('Existing collateral:', ethers.formatEther(existingCdp.collateralAmount));
            console.log('Existing debt:', ethers.formatEther(existingCdp.debtAmount));
        } else {
            // Approve collateral
            console.log('🔐 Approving collateral...');
            const approveTx = await collateralToken.connect(newBorrower).approve(deploymentInfo.contracts.cdpVault, collateralAmount);
            await approveTx.wait();
            console.log('✅ Collateral approved');
            
            // Open CDP
            console.log('🏗️  Opening CDP...');
            const openTx = await cdpVault.connect(newBorrower).openCDP(collateralAmount, creditScore);
            await openTx.wait();
            console.log('✅ CDP opened successfully');
            
            // Check CDP info
            const newCdp = await cdpVault.cdps(newBorrower.address);
            console.log('New CDP info:');
            console.log('- Collateral:', ethers.formatEther(newCdp.collateralAmount));
            console.log('- Debt:', ethers.formatEther(newCdp.debtAmount));
            console.log('- APR:', newCdp.apr.toString(), 'basis points');
            console.log('- Active:', newCdp.isActive);
        }
    } catch (error) {
        console.log('❌ Error opening CDP:', error.message);
        return;
    }
    
    console.log('\n=== STEP 2: Request First Loan ===');
    
    const loanAmount1 = ethers.parseEther('300'); // 300 tokens
    
    try {
        console.log(`💰 Requesting loan of ${ethers.formatEther(loanAmount1)} tokens...`);
        const loanTx1 = await cdpVault.connect(newBorrower).requestLoan(loanAmount1);
        await loanTx1.wait();
        console.log('✅ First loan successful');
        
        // Check updated state
        const cdpAfterLoan1 = await cdpVault.cdps(newBorrower.address);
        const borrowerBalance1 = await debtToken.balanceOf(newBorrower.address);
        
        console.log('After first loan:');
        console.log('- CDP debt:', ethers.formatEther(cdpAfterLoan1.debtAmount));
        console.log('- Borrower balance:', ethers.formatEther(borrowerBalance1));
        
        // Calculate remaining capacity
        const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
        const maxTotalDebt = (cdpAfterLoan1.collateralAmount * 10000n) / minRatio;
        const remainingCapacity = maxTotalDebt - cdpAfterLoan1.debtAmount;
        console.log('- Remaining borrowing capacity:', ethers.formatEther(remainingCapacity));
        
    } catch (error) {
        console.log('❌ First loan failed:', error.message);
        return;
    }
    
    console.log('\n=== STEP 3: Request Additional Loan ===');
    
    const loanAmount2 = ethers.parseEther('100'); // 100 tokens
    
    try {
        console.log(`💰 Requesting additional loan of ${ethers.formatEther(loanAmount2)} tokens...`);
        const loanTx2 = await cdpVault.connect(newBorrower).requestLoan(loanAmount2);
        await loanTx2.wait();
        console.log('✅ Second loan successful');
        
        // Check final state
        const finalCdp = await cdpVault.cdps(newBorrower.address);
        const finalBorrowerBalance = await debtToken.balanceOf(newBorrower.address);
        
        console.log('Final state:');
        console.log('- CDP debt:', ethers.formatEther(finalCdp.debtAmount));
        console.log('- Borrower balance:', ethers.formatEther(finalBorrowerBalance));
        console.log('- Total borrowed:', ethers.formatEther(finalBorrowerBalance - initialDebtBalance));
        
        // Calculate collateral ratio
        const finalRatio = (finalCdp.collateralAmount * 10000n) / finalCdp.debtAmount;
        console.log('- Final collateral ratio:', Number(finalRatio) / 100, '%');
        
    } catch (error) {
        console.log('❌ Second loan failed:', error.message);
        console.log('This is expected if the borrowing capacity was exceeded');
        
        // Show what the issue is
        const currentCdp = await cdpVault.cdps(newBorrower.address);
        const minRatio = await cdpVault.MIN_COLLATERAL_RATIO();
        const maxTotalDebt = (currentCdp.collateralAmount * 10000n) / minRatio;
        const availableCapacity = maxTotalDebt - currentCdp.debtAmount;
        
        console.log('Analysis:');
        console.log('- Requested loan:', ethers.formatEther(loanAmount2));
        console.log('- Available capacity:', ethers.formatEther(availableCapacity));
        console.log('- Max total debt allowed:', ethers.formatEther(maxTotalDebt));
        console.log('- Current debt:', ethers.formatEther(currentCdp.debtAmount));
    }
    
    console.log('\n🎉 Complete borrowing flow demonstration finished!');
}

demonstrateCompleteBorrowingFlow();
