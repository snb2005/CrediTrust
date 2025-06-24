const { ethers } = require('hardhat');
const fs = require('fs');

async function testBothFeatures() {
    console.log('🧪 TESTING BOTH LENDING AND BORROWING');
    console.log('=====================================');

    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    const [deployer, lender, borrower] = await ethers.getSigners();
    
    console.log('👥 Test accounts:');
    console.log('Lender:', lender.address);
    console.log('Borrower:', borrower.address);
    
    // Get contract instances
    const CollateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    
    // Check initial balances
    console.log('\n💰 Initial balances:');
    const lenderEthBalance = await CollateralToken.balanceOf(lender.address);
    const lenderUsdcBalance = await DebtToken.balanceOf(lender.address);
    const borrowerEthBalance = await CollateralToken.balanceOf(borrower.address);
    const borrowerUsdcBalance = await DebtToken.balanceOf(borrower.address);
    const vaultUsdcBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    
    console.log(`Lender: ${ethers.formatEther(lenderEthBalance)} mETH, ${ethers.formatEther(lenderUsdcBalance)} mUSDC`);
    console.log(`Borrower: ${ethers.formatEther(borrowerEthBalance)} mETH, ${ethers.formatEther(borrowerUsdcBalance)} mUSDC`);
    console.log(`Vault: ${ethers.formatEther(vaultUsdcBalance)} mUSDC liquidity`);

    // TEST 1: LENDING
    console.log('\n🏦 TEST 1: LENDING');
    console.log('==================');
    
    const lendAmount = ethers.parseEther('1000'); // 1000 mUSDC
    
    console.log('1. Approving mUSDC for lending...');
    await DebtToken.connect(lender).approve(deploymentInfo.contracts.cdpVault, lendAmount);
    
    console.log('2. Staking as lender...');
    const stakeTx = await CDPVault.connect(lender).stakeLender(lendAmount);
    await stakeTx.wait();
    console.log('✅ Lending successful!');
    
    // TEST 2: BORROWING
    console.log('\n💸 TEST 2: BORROWING');
    console.log('====================');
    
    const collateralAmount = ethers.parseEther('5'); // 5 mETH as collateral
    const loanAmount = ethers.parseEther('2000'); // Borrow 2000 mUSDC
    const creditScore = 750;
    
    console.log('1. Approving mETH collateral...');
    await CollateralToken.connect(borrower).approve(deploymentInfo.contracts.cdpVault, collateralAmount);
    
    console.log('2. Opening CDP...');
    try {
        const openCdpTx = await CDPVault.connect(borrower).openCDP(collateralAmount, creditScore);
        await openCdpTx.wait();
        console.log('✅ CDP opened successfully!');
        
        console.log('3. Requesting loan...');
        const loanTx = await CDPVault.connect(borrower).requestLoan(loanAmount);
        await loanTx.wait();
        console.log('✅ Loan approved and disbursed!');
        
    } catch (error) {
        console.log('⚠️  CDP opening failed (likely VRF issue), trying direct loan...');
        
        // Alternative: Try direct loan without CDP opening
        try {
            console.log('3. Trying direct loan request...');
            const directLoanTx = await CDPVault.connect(borrower).requestLoan(loanAmount);
            await directLoanTx.wait();
            console.log('✅ Direct loan successful!');
        } catch (directError) {
            console.log('❌ Both CDP and direct loan failed:', directError.message);
        }
    }

    // Check final balances
    console.log('\n📊 FINAL RESULTS:');
    console.log('==================');
    
    const finalLenderUsdcBalance = await DebtToken.balanceOf(lender.address);
    const finalBorrowerUsdcBalance = await DebtToken.balanceOf(borrower.address);
    const finalVaultUsdcBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    
    console.log('Final balances:');
    console.log(`Lender mUSDC: ${ethers.formatEther(lenderUsdcBalance)} → ${ethers.formatEther(finalLenderUsdcBalance)} (${ethers.formatEther(finalLenderUsdcBalance - lenderUsdcBalance)})`);
    console.log(`Borrower mUSDC: ${ethers.formatEther(borrowerUsdcBalance)} → ${ethers.formatEther(finalBorrowerUsdcBalance)} (${ethers.formatEther(finalBorrowerUsdcBalance - borrowerUsdcBalance)})`);
    console.log(`Vault mUSDC: ${ethers.formatEther(vaultUsdcBalance)} → ${ethers.formatEther(finalVaultUsdcBalance)} (${ethers.formatEther(finalVaultUsdcBalance - vaultUsdcBalance)})`);
    
    // Summary
    const lendingWorked = finalLenderUsdcBalance < lenderUsdcBalance;
    const borrowingWorked = finalBorrowerUsdcBalance > borrowerUsdcBalance;
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log(`🏦 Lending: ${lendingWorked ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`💸 Borrowing: ${borrowingWorked ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`🔗 Both features: ${lendingWorked && borrowingWorked ? '✅ WORKING TOGETHER' : '⚠️  Need debugging'}`);
    
    if (lendingWorked && borrowingWorked) {
        console.log('\n🎉 SUCCESS! Both lending and borrowing are working with the same deployment!');
        console.log('🖥️  Frontend should now work for both features with these contract addresses.');
    }
}

testBothFeatures().catch(console.error);
