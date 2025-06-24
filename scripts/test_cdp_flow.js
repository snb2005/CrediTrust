const { ethers } = require('hardhat');

async function testCDPFlow() {
    console.log('=== COMPLETE CDP FLOW TEST ===');

    const [deployer] = await ethers.getSigners();
    console.log('User address:', deployer.address);

    // Deploy contracts manually
    console.log('\n=== DEPLOYING CONTRACTS ===');

    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    const collateralToken = await MockERC20.deploy('Collateral Token', 'COLL', 18);
    await collateralToken.waitForDeployment();

    const debtToken = await MockERC20.deploy('Debt Token', 'DEBT', 18);
    await debtToken.waitForDeployment();

    console.log('✅ Collateral Token:', await collateralToken.getAddress());
    console.log('✅ Debt Token:', await debtToken.getAddress());

    // Deploy CDP Vault
    const CDPVault = await ethers.getContractFactory('CDPVault');
    const cdpVault = await CDPVault.deploy(
        await collateralToken.getAddress(),
        await debtToken.getAddress(),
        '0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B', // Mock VRF coordinator
        1, // subscription ID
        '0xd4bb89654db74673a187bd804519e65e3f71a52bc55f9c808f9e8ea8c7ad12c3' // gas lane
    );
    await cdpVault.waitForDeployment();

    console.log('✅ CDP Vault:', await cdpVault.getAddress());

    // Deploy CreditAgent
    console.log("\n3. Deploying CreditAgent...");
    const CreditAgent = await hre.ethers.getContractFactory("CreditAgent");
    const creditAgent = await CreditAgent.deploy(await cdpVault.getAddress());
    await creditAgent.waitForDeployment();
    console.log("CreditAgent deployed to:", await creditAgent.getAddress());

    // Deploy x402Router
    console.log("\n4. Deploying x402Router...");
    const x402Router = await hre.ethers.getContractFactory("x402Router");
    const router = await x402Router.deploy(
        50, // 0.5% fee rate
        deployer.address, // Fee recipient
        hre.ethers.parseUnits("0.01", 18), // Min payment: 0.01 tokens
        hre.ethers.parseUnits("1000", 18) // Max payment: 1000 tokens
    );
    await router.waitForDeployment();
    console.log("x402Router deployed to:", await router.getAddress());

    // Mint tokens to user and vault
    console.log('\n=== MINTING TOKENS ===');
    await collateralToken.mint(deployer.address, ethers.parseEther('10000'));
    await debtToken.mint(await cdpVault.getAddress(), ethers.parseEther('10000'));

    const userCollateralBalance = await collateralToken.balanceOf(deployer.address);
    const vaultDebtBalance = await debtToken.balanceOf(await cdpVault.getAddress());

    console.log('✅ User collateral balance:', ethers.formatEther(userCollateralBalance));
    console.log('✅ Vault debt balance:', ethers.formatEther(vaultDebtBalance));

    // Test opening CDP
    console.log('\n=== OPENING CDP ===');
    const collateralAmount = ethers.parseEther('1000');
    const creditScore = 700;

    // Approve collateral
    await collateralToken.approve(await cdpVault.getAddress(), collateralAmount);
    console.log('✅ Collateral approved');

    // Open CDP
    const tx = await cdpVault.openCDP(collateralAmount, creditScore);
    const receipt = await tx.wait();
    console.log('✅ CDP opened! Gas used:', receipt.gasUsed.toString());

    // Check CDP details
    const cdp = await cdpVault.cdps(deployer.address);
    console.log('\n=== CDP DETAILS ===');
    console.log('Active:', cdp.isActive);
    console.log('Collateral:', ethers.formatEther(cdp.collateralAmount));
    console.log('Debt:', ethers.formatEther(cdp.debtAmount));
    console.log('Credit Score:', cdp.creditScore.toString());
    console.log('APR:', cdp.apr.toString());

    // Test borrowing
    console.log('\n=== TESTING BORROWING ===');
    const loanAmount = ethers.parseEther('100');

    const userDebtBalanceBefore = await debtToken.balanceOf(deployer.address);
    console.log('User debt balance before:', ethers.formatEther(userDebtBalanceBefore));

    const borrowTx = await cdpVault.requestLoan(loanAmount);
    await borrowTx.wait();
    console.log('✅ Loan requested and approved');

    const userDebtBalanceAfter = await debtToken.balanceOf(deployer.address);
    console.log('User debt balance after:', ethers.formatEther(userDebtBalanceAfter));
    console.log('Loan amount received:', ethers.formatEther(userDebtBalanceAfter - userDebtBalanceBefore));

    // Check updated CDP
    const updatedCdp = await cdpVault.cdps(deployer.address);
    console.log('\n=== UPDATED CDP DETAILS ===');
    console.log('Collateral:', ethers.formatEther(updatedCdp.collateralAmount));
    console.log('Debt:', ethers.formatEther(updatedCdp.debtAmount));

    // Test repayment
    console.log('\n=== TESTING REPAYMENT ===');
    const repayAmount = ethers.parseEther('50');

    // Approve repayment
    await debtToken.approve(await cdpVault.getAddress(), repayAmount);

    const repayTx = await cdpVault.makeRepayment(repayAmount);
    await repayTx.wait();
    console.log('✅ Repayment made');

    const finalCdp = await cdpVault.cdps(deployer.address);
    console.log('\n=== FINAL CDP DETAILS ===');
    console.log('Collateral:', ethers.formatEther(finalCdp.collateralAmount));
    console.log('Debt:', ethers.formatEther(finalCdp.debtAmount));

    const finalUserDebtBalance = await debtToken.balanceOf(deployer.address);
    console.log('Final user debt balance:', ethers.formatEther(finalUserDebtBalance));

    console.log('\n🎉 ALL CDP OPERATIONS SUCCESSFUL!');
}

testCDPFlow().catch(console.error);
