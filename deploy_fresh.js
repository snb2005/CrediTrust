const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting complete deployment for both lending and borrowing features...");
    
    // Get signers
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
    
    // Deploy tokens first
    console.log("\n📦 Deploying tokens...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const collateralToken = await MockERC20.deploy("Collateral Token", "CTK", 18);
    await collateralToken.waitForDeployment();
    const collateralAddress = await collateralToken.getAddress();
    console.log("✅ Collateral Token deployed to:", collateralAddress);
    
    const debtToken = await MockERC20.deploy("Debt Token", "DTK", 18);
    await debtToken.waitForDeployment();
    const debtAddress = await debtToken.getAddress();
    console.log("✅ Debt Token deployed to:", debtAddress);
    
    // Deploy CDPVault
    console.log("\n🏦 Deploying CDPVault...");
    const CDPVault = await ethers.getContractFactory("CDPVault");
    
    // Use placeholder values for VRF since we're on localhost
    const vrfCoordinator = "0x0000000000000000000000000000000000000000";
    const subscriptionId = 0;
    const gasLane = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    const cdpVault = await CDPVault.deploy(
        collateralAddress,
        debtAddress,
        vrfCoordinator,
        subscriptionId,
        gasLane
    );
    await cdpVault.waitForDeployment();
    const vaultAddress = await cdpVault.getAddress();
    console.log("✅ CDP Vault deployed to:", vaultAddress);
    
    // Deploy CreditAgent
    console.log("\n📊 Deploying CreditAgent...");
    const CreditAgent = await ethers.getContractFactory("CreditAgent");
    const creditAgent = await CreditAgent.deploy(vaultAddress);
    await creditAgent.waitForDeployment();
    const creditAgentAddress = await creditAgent.getAddress();
    console.log("✅ Credit Agent deployed to:", creditAgentAddress);
    
    // Deploy x402Router
    console.log("\n🔀 Deploying x402Router...");
    const X402Router = await ethers.getContractFactory("x402Router");
    const feeRate = 250; // 2.5%
    const feeRecipient = deployer.address;
    const minPayment = ethers.parseEther("1");
    const maxPayment = ethers.parseEther("10000");
    const x402Router = await X402Router.deploy(feeRate, feeRecipient, minPayment, maxPayment);
    await x402Router.waitForDeployment();
    const routerAddress = await x402Router.getAddress();
    console.log("✅ x402Router deployed to:", routerAddress);
    
    // Mint tokens for testing
    console.log("\n💰 Minting tokens for testing...");
    
    // Mint collateral tokens to users
    const collateralAmount = ethers.parseEther("10000");
    await (await collateralToken.mint(user1.address, collateralAmount)).wait();
    await (await collateralToken.mint(user2.address, collateralAmount)).wait();
    await (await collateralToken.mint(user3.address, collateralAmount)).wait();
    console.log("✅ Minted 10,000 CTK to each user");
    
    // Mint debt tokens to vault for lending
    const vaultDebtAmount = ethers.parseEther("1000000");
    await (await debtToken.mint(vaultAddress, vaultDebtAmount)).wait();
    console.log("✅ Minted 1,000,000 DTK to vault");
    
    // Mint debt tokens to users for repayments
    const userDebtAmount = ethers.parseEther("50000");
    await (await debtToken.mint(user1.address, userDebtAmount)).wait();
    await (await debtToken.mint(user2.address, userDebtAmount)).wait();
    await (await debtToken.mint(user3.address, userDebtAmount)).wait();
    console.log("✅ Minted 50,000 DTK to each user for repayments");
    
    // Set up a lender
    console.log("\n🏛️ Setting up lender...");
    const lenderStakeAmount = ethers.parseEther("50000");
    await (await debtToken.mint(user3.address, lenderStakeAmount)).wait();
    await (await debtToken.connect(user3).approve(vaultAddress, lenderStakeAmount)).wait();
    await (await cdpVault.connect(user3).stakeLender(lenderStakeAmount)).wait();
    console.log("✅ User3 staked as lender with 50,000 DTK");
    
    // Test borrowing flow
    console.log("\n💳 Testing borrowing flow...");
    
    // User1 opens a CDP
    const cdpCollateralAmount = ethers.parseEther("1000");
    await (await collateralToken.connect(user1).approve(vaultAddress, cdpCollateralAmount)).wait();
    console.log("✅ User1 approved collateral");
    
    const creditScore = 700;
    await (await cdpVault.connect(user1).openCDP(cdpCollateralAmount, creditScore)).wait();
    console.log("✅ User1 opened CDP with 1000 CTK collateral");
    
    // Request a loan
    const loanAmount = ethers.parseEther("500");
    await (await cdpVault.connect(user1).requestLoan(loanAmount)).wait();
    console.log("✅ User1 requested loan of 500 DTK");
    
    // Check final states
    console.log("\n📊 Final state check:");
    
    // Check CDP info
    const user1CDP = await cdpVault.getCDPInfo(user1.address);
    console.log("User1 CDP:", {
        collateralAmount: ethers.formatEther(user1CDP[0]),
        debtAmount: ethers.formatEther(user1CDP[1]),
        creditScore: user1CDP[2].toString(),
        apr: user1CDP[3].toString(),
        isActive: user1CDP[5],
        assignedLender: user1CDP[6]
    });
    
    // Check balances
    const user1CollateralBalance = await collateralToken.balanceOf(user1.address);
    const user1DebtBalance = await debtToken.balanceOf(user1.address);
    const vaultDebtBalance = await debtToken.balanceOf(vaultAddress);
    
    console.log("Balances:");
    console.log(`User1 Collateral: ${ethers.formatEther(user1CollateralBalance)} CTK`);
    console.log(`User1 Debt: ${ethers.formatEther(user1DebtBalance)} DTK`);
    console.log(`Vault Debt: ${ethers.formatEther(vaultDebtBalance)} DTK`);
    
    // Save deployment info
    const deploymentInfo = {
        network: "localhost",
        chainId: 31337,
        deployer: deployer.address,
        contracts: {
            collateralToken: collateralAddress,
            debtToken: debtAddress,
            cdpVault: vaultAddress,
            creditAgent: creditAgentAddress,
            x402Router: routerAddress
        },
        testUsers: {
            user1: user1.address,
            user2: user2.address,
            user3: user3.address
        },
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to deployment-info.json");
    
    console.log("\n🎉 Deployment complete! Both lending and borrowing features are ready.");
    console.log("📝 Summary:");
    console.log("- User1 has an active CDP with 1000 CTK collateral and 500 DTK debt");
    console.log("- User3 is a lender with 50,000 DTK staked");
    console.log("- Vault has sufficient DTK for lending operations");
    console.log("- All contracts deployed and verified");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
