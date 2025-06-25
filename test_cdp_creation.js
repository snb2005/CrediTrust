const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing CDP creation directly...");
    
    // Get deployment info
    const deploymentInfo = require('./deployment-info.json');
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    
    console.log("👤 Using address:", user1.address);
    
    // Get contract instances
    const cdpVaultAddress = deploymentInfo.contracts.cdpVault;
    const collateralTokenAddress = deploymentInfo.contracts.collateralToken;
    const debtTokenAddress = deploymentInfo.contracts.debtToken;
    
    const CDPVault = await ethers.getContractFactory("CDPVault");
    const cdpVault = CDPVault.attach(cdpVaultAddress);
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateralToken = MockERC20.attach(collateralTokenAddress);
    const debtToken = MockERC20.attach(debtTokenAddress);
    
    // Check current CDP status
    console.log("\n📊 Current CDP status for", user1.address);
    const currentCDP = await cdpVault.getCDPInfo(user1.address);
    console.log("Current CDP:", {
        collateralAmount: ethers.formatEther(currentCDP[0]),
        debtAmount: ethers.formatEther(currentCDP[1]),
        creditScore: currentCDP[2].toString(),
        apr: currentCDP[3].toString(),
        isActive: currentCDP[5],
        assignedLender: currentCDP[6]
    });
    
    if (currentCDP[5]) {
        console.log("✅ CDP already exists and is active!");
        return;
    }
    
    // Check balances
    console.log("\n💰 Current balances:");
    const user1CollateralBalance = await collateralToken.balanceOf(user1.address);
    const user1DebtBalance = await debtToken.balanceOf(user1.address);
    const vaultDebtBalance = await debtToken.balanceOf(cdpVaultAddress);
    
    console.log(`User1 Collateral: ${ethers.formatEther(user1CollateralBalance)} CTK`);
    console.log(`User1 Debt: ${ethers.formatEther(user1DebtBalance)} DTK`);
    console.log(`Vault Debt: ${ethers.formatEther(vaultDebtBalance)} DTK`);
    
    // Check lenders
    console.log("\n🏛️ Checking lenders...");
    try {
        const user2LenderInfo = await cdpVault.getLenderInfo(user2.address);
        console.log("User2 Lender Info:", {
            stakedAmount: ethers.formatEther(user2LenderInfo[0]),
            accruedRewards: ethers.formatEther(user2LenderInfo[1]),
            reputation: user2LenderInfo[2].toString(),
            isActive: user2LenderInfo[3]
        });
    } catch (error) {
        console.log("❌ User2 is not a lender or error:", error.message);
    }
    
    // Create CDP if it doesn't exist
    console.log("\n💳 Creating new CDP...");
    
    // Approve collateral
    const collateralAmount = ethers.parseEther("100");
    console.log("📝 Approving", ethers.formatEther(collateralAmount), "CTK...");
    const approveTx = await collateralToken.connect(user1).approve(cdpVaultAddress, collateralAmount);
    await approveTx.wait();
    console.log("✅ Collateral approved");
    
    // Open CDP
    const creditScore = 700;
    console.log("🏦 Opening CDP with", ethers.formatEther(collateralAmount), "CTK collateral and credit score", creditScore);
    const openCDPTx = await cdpVault.connect(user1).openCDP(collateralAmount, creditScore);
    await openCDPTx.wait();
    console.log("✅ CDP opened successfully!");
    
    // Check CDP after creation
    const newCDP = await cdpVault.getCDPInfo(user1.address);
    console.log("\n📊 New CDP Info:", {
        collateralAmount: ethers.formatEther(newCDP[0]),
        debtAmount: ethers.formatEther(newCDP[1]),
        creditScore: newCDP[2].toString(),
        apr: newCDP[3].toString(),
        isActive: newCDP[5],
        assignedLender: newCDP[6]
    });
    
    // Test loan request
    if (newCDP[5]) {
        console.log("\n💸 Testing loan request...");
        const loanAmount = ethers.parseEther("50");
        console.log("Requesting loan of", ethers.formatEther(loanAmount), "DTK");
        
        const loanTx = await cdpVault.connect(user1).requestLoan(loanAmount);
        await loanTx.wait();
        console.log("✅ Loan request successful!");
        
        // Check final CDP state
        const finalCDP = await cdpVault.getCDPInfo(user1.address);
        console.log("\n📊 Final CDP Info:", {
            collateralAmount: ethers.formatEther(finalCDP[0]),
            debtAmount: ethers.formatEther(finalCDP[1]),
            creditScore: finalCDP[2].toString(),
            apr: finalCDP[3].toString(),
            isActive: finalCDP[5],
            assignedLender: finalCDP[6]
        });
        
        // Check final balances
        const finalCollateralBalance = await collateralToken.balanceOf(user1.address);
        const finalDebtBalance = await debtToken.balanceOf(user1.address);
        console.log("\n💰 Final balances:");
        console.log(`User1 Collateral: ${ethers.formatEther(finalCollateralBalance)} CTK`);
        console.log(`User1 Debt: ${ethers.formatEther(finalDebtBalance)} DTK`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
