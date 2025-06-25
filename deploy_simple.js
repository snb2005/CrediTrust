const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting simple deployment for testing...");
    
    // Get signers
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    
    // Deploy tokens
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
    
    // Use deployer address as mock VRF coordinator for testing
    const vrfCoordinator = deployer.address;
    const subscriptionId = 1;
    const gasLane = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    
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
    const feeRate = 250;
    const feeRecipient = deployer.address;
    const minPayment = ethers.parseEther("1");
    const maxPayment = ethers.parseEther("10000");
    const x402Router = await X402Router.deploy(feeRate, feeRecipient, minPayment, maxPayment);
    await x402Router.waitForDeployment();
    const routerAddress = await x402Router.getAddress();
    console.log("✅ x402Router deployed to:", routerAddress);
    
    // Mint tokens
    console.log("\n💰 Minting tokens...");
    
    // Mint collateral tokens to users
    const collateralAmount = ethers.parseEther("10000");
    await (await collateralToken.mint(user1.address, collateralAmount)).wait();
    await (await collateralToken.mint(user2.address, collateralAmount)).wait();
    await (await collateralToken.mint(user3.address, collateralAmount)).wait();
    await (await collateralToken.mint(deployer.address, collateralAmount)).wait();
    console.log("✅ Minted 10,000 CTK to each user");
    
    // Mint debt tokens to vault
    const vaultDebtAmount = ethers.parseEther("1000000");
    await (await debtToken.mint(vaultAddress, vaultDebtAmount)).wait();
    console.log("✅ Minted 1,000,000 DTK to vault");
    
    // Mint debt tokens to users for staking and repayments
    const userDebtAmount = ethers.parseEther("100000");
    await (await debtToken.mint(user1.address, userDebtAmount)).wait();
    await (await debtToken.mint(user2.address, userDebtAmount)).wait();
    await (await debtToken.mint(user3.address, userDebtAmount)).wait();
    await (await debtToken.mint(deployer.address, userDebtAmount)).wait();
    console.log("✅ Minted 100,000 DTK to each user");
    
    // Set up lenders
    console.log("\n🏛️ Setting up lenders...");
    const lenderStakeAmount = ethers.parseEther("50000");
    
    // User2 as lender
    await (await debtToken.connect(user2).approve(vaultAddress, lenderStakeAmount)).wait();
    await (await cdpVault.connect(user2).stakeLender(lenderStakeAmount)).wait();
    console.log("✅ User2 staked as lender");
    
    // User3 as lender
    await (await debtToken.connect(user3).approve(vaultAddress, lenderStakeAmount)).wait();
    await (await cdpVault.connect(user3).stakeLender(lenderStakeAmount)).wait();
    console.log("✅ User3 staked as lender");
    
    // Test - User1 tries to open CDP WITHOUT VRF
    console.log("\n💳 Testing manual CDP creation (bypassing VRF)...");
    
    try {
        // Approve collateral
        const cdpCollateralAmount = ethers.parseEther("1000");
        await (await collateralToken.connect(user1).approve(vaultAddress, cdpCollateralAmount)).wait();
        console.log("✅ User1 approved collateral");
        
        // Manually create CDP by calling the contract directly
        const creditScore = 700;
        
        // Create CDP data directly
        const tx = await cdpVault.connect(user1).openCDP(cdpCollateralAmount, creditScore);
        console.log("📝 CDP creation transaction sent:", tx.hash);
        
        // Wait for confirmation
        await tx.wait();
        console.log("✅ CDP transaction confirmed");
        
        // Manually assign lender (since VRF won't work)
        console.log("🔧 Manually assigning lender...");
        
        // Check if CDP exists
        const cdpInfo = await cdpVault.getCDPInfo(user1.address);
        console.log("CDP Info after creation:", {
            collateralAmount: ethers.formatEther(cdpInfo[0]),
            debtAmount: ethers.formatEther(cdpInfo[1]),
            creditScore: cdpInfo[2].toString(),
            apr: cdpInfo[3].toString(),
            isActive: cdpInfo[5],
            assignedLender: cdpInfo[6]
        });
        
    } catch (error) {
        console.error("❌ Error creating CDP:", error.message);
        console.log("📝 This is expected if VRF isn't working. Let's create a simpler test...");
    }
    
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
    
    // Test balances
    console.log("\n📊 Final balances:");
    const user1CollateralBalance = await collateralToken.balanceOf(user1.address);
    const user1DebtBalance = await debtToken.balanceOf(user1.address);
    const vaultDebtBalance = await debtToken.balanceOf(vaultAddress);
    
    console.log(`User1 Collateral: ${ethers.formatEther(user1CollateralBalance)} CTK`);
    console.log(`User1 Debt: ${ethers.formatEther(user1DebtBalance)} DTK`);
    console.log(`Vault Debt: ${ethers.formatEther(vaultDebtBalance)} DTK`);
    
    console.log("\n🎉 Basic deployment complete!");
    console.log("⚠️  Note: VRF functions may not work on local hardhat. Consider implementing a test mode.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
