const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function testNewCDPFlow() {
    console.log('=== TEST NEW CDP FLOW WITH UPDATED CONTRACTS ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('Using account:', deployer.address);
    
    // Get contract instances
    const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    const collateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const debtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    console.log('\n📊 Initial Balances:');
    const collateralBalance = await collateralToken.balanceOf(deployer.address);
    const debtBalance = await debtToken.balanceOf(deployer.address);
    console.log('Collateral tokens:', ethers.formatEther(collateralBalance));
    console.log('Debt tokens:', ethers.formatEther(debtBalance));
    
    // Check if CDP already exists
    try {
        const existingCdp = await cdpVault.cdps(deployer.address);
        if (existingCdp.isActive) {
            console.log('\n⚠️  CDP already exists for this account');
            console.log('Existing collateral:', ethers.formatEther(existingCdp.collateralAmount));
            console.log('Existing debt:', ethers.formatEther(existingCdp.debtAmount));
            
            // Test the new functions instead
            await testCDPManagementFunctions(cdpVault, collateralToken, debtToken, deployer);
            return;
        }
    } catch (error) {
        console.log('No existing CDP found, proceeding with new CDP creation');
    }
    
    console.log('\n=== STEP 1: Create New CDP ===');
    
    const collateralAmount = ethers.parseEther('1000'); // 1000 tokens
    const creditScore = 750;
    
    try {
        // Approve collateral
        console.log('🔐 Approving collateral...');
        const approveTx = await collateralToken.approve(deploymentInfo.contracts.cdpVault, collateralAmount);
        await approveTx.wait();
        console.log('✅ Collateral approved');
        
        // Open CDP
        console.log('🏗️  Opening CDP...');
        const openTx = await cdpVault.openCDP(collateralAmount, creditScore);
        await openTx.wait();
        console.log('✅ CDP opened successfully');
        
        // Check CDP info
        const newCdp = await cdpVault.getCDPInfo(deployer.address);
        console.log('\nNew CDP info:');
        console.log('- Collateral:', ethers.formatEther(newCdp[0]));
        console.log('- Debt:', ethers.formatEther(newCdp[1]));
        console.log('- Credit Score:', newCdp[2].toString());
        console.log('- APR:', newCdp[3].toString(), 'basis points');
        console.log('- Active:', newCdp[5]);
        
    } catch (error) {
        console.log('❌ Error creating CDP:', error.message);
        return;
    }
    
    console.log('\n=== STEP 2: Request Initial Loan ===');
    
    // Ensure vault has debt tokens
    const vaultBalance = await debtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    if (vaultBalance < ethers.parseEther('5000')) {
        console.log('🪙 Minting debt tokens to vault...');
        const mintTx = await debtToken.mint(deploymentInfo.contracts.cdpVault, ethers.parseEther('10000'));
        await mintTx.wait();
        console.log('✅ Debt tokens minted to vault');
    }
    
    const initialLoanAmount = ethers.parseEther('400'); // 400 tokens
    
    try {
        console.log(`💰 Requesting initial loan of ${ethers.formatEther(initialLoanAmount)} tokens...`);
        const loanTx = await cdpVault.requestLoan(initialLoanAmount);
        await loanTx.wait();
        console.log('✅ Initial loan successful');
        
        // Check updated state
        const cdpAfterLoan = await cdpVault.getCDPInfo(deployer.address);
        console.log('After initial loan:');
        console.log('- CDP debt:', ethers.formatEther(cdpAfterLoan[1]));
        
        const borrowerBalance = await debtToken.balanceOf(deployer.address);
        console.log('- Borrower balance:', ethers.formatEther(borrowerBalance));
        
    } catch (error) {
        console.log('❌ Initial loan failed:', error.message);
        return;
    }
    
    console.log('\n=== STEP 3: Test CDP Management Functions ===');
    await testCDPManagementFunctions(cdpVault, collateralToken, debtToken, deployer);
}

async function testCDPManagementFunctions(cdpVault, collateralToken, debtToken, deployer) {
    console.log('\n🔧 Testing CDP Management Functions...');
    
    // Test 1: Add Collateral
    console.log('\n--- Test 1: Add Collateral ---');
    try {
        const additionalCollateral = ethers.parseEther('200');
        
        // Approve additional collateral
        const approveTx = await collateralToken.approve(cdpVault.target, additionalCollateral);
        await approveTx.wait();
        
        // Add collateral
        const addCollateralTx = await cdpVault.addCollateral(additionalCollateral);
        await addCollateralTx.wait();
        console.log(`✅ Added ${ethers.formatEther(additionalCollateral)} collateral`);
        
        // Check updated CDP
        const updatedCdp = await cdpVault.getCDPInfo(deployer.address);
        console.log('New collateral amount:', ethers.formatEther(updatedCdp[0]));
        
    } catch (error) {
        console.log('❌ Add collateral failed:', error.message);
    }
    
    // Test 2: Get Total Debt with Interest
    console.log('\n--- Test 2: Get Total Debt with Interest ---');
    try {
        const totalDebtWithInterest = await cdpVault.getTotalDebtWithInterest(deployer.address);
        const accruedInterest = await cdpVault.calculateAccruedInterest(deployer.address);
        
        console.log('Total debt with interest:', ethers.formatEther(totalDebtWithInterest));
        console.log('Accrued interest:', ethers.formatEther(accruedInterest));
        
    } catch (error) {
        console.log('❌ Get total debt failed:', error.message);
    }
    
    // Test 3: Make Partial Repayment
    console.log('\n--- Test 3: Make Partial Repayment ---');
    try {
        const repaymentAmount = ethers.parseEther('50');
        
        // Approve debt tokens for repayment
        const approveTx = await debtToken.approve(cdpVault.target, repaymentAmount);
        await approveTx.wait();
        
        // Make repayment
        const repayTx = await cdpVault.makeRepayment(repaymentAmount);
        await repayTx.wait();
        console.log(`✅ Repaid ${ethers.formatEther(repaymentAmount)} tokens`);
        
        // Check updated debt
        const updatedCdp = await cdpVault.getCDPInfo(deployer.address);
        console.log('New debt amount:', ethers.formatEther(updatedCdp[1]));
        
    } catch (error) {
        console.log('❌ Partial repayment failed:', error.message);
    }
    
    // Test 4: Request Additional Loan
    console.log('\n--- Test 4: Request Additional Loan ---');
    try {
        const additionalLoan = ethers.parseEther('50');
        
        const loanTx = await cdpVault.requestLoan(additionalLoan);
        await loanTx.wait();
        console.log(`✅ Additional loan of ${ethers.formatEther(additionalLoan)} tokens successful`);
        
        // Check final state
        const finalCdp = await cdpVault.getCDPInfo(deployer.address);
        const finalBorrowerBalance = await debtToken.balanceOf(deployer.address);
        
        console.log('\n📊 Final State:');
        console.log('- Collateral:', ethers.formatEther(finalCdp[0]));
        console.log('- Debt:', ethers.formatEther(finalCdp[1]));
        console.log('- Borrower balance:', ethers.formatEther(finalBorrowerBalance));
        
        // Calculate collateral ratio
        const totalDebtWithInterest = await cdpVault.getTotalDebtWithInterest(deployer.address);
        const collateralRatio = (finalCdp[0] * 10000n) / totalDebtWithInterest;
        console.log('- Collateral ratio:', Number(collateralRatio) / 100, '%');
        
    } catch (error) {
        console.log('❌ Additional loan failed:', error.message);
        console.log('This might be expected if borrowing capacity is exceeded');
    }
    
    console.log('\n🎉 CDP Management Function Tests Completed!');
}

testNewCDPFlow();
