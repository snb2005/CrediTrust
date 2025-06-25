const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing CDP for deployer address (the one you'll use in MetaMask)...");
    
    // Get deployment info
    const deploymentInfo = require('./deployment-info.json');
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    
    // Use deployer address (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    const testUser = deployer;
    console.log("👤 Testing with deployer address:", testUser.address);
    
    // Get contract instances
    const cdpVaultAddress = deploymentInfo.contracts.cdpVault;
    const collateralTokenAddress = deploymentInfo.contracts.collateralToken;
    const debtTokenAddress = deploymentInfo.contracts.debtToken;
    
    const CDPVault = await ethers.getContractFactory("CDPVault");
    const cdpVault = CDPVault.attach(cdpVaultAddress);
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateralToken = MockERC20.attach(collateralTokenAddress);
    const debtToken = MockERC20.attach(debtTokenAddress);
    
    // Check current CDP status for deployer
    console.log("\n📊 Current CDP status for deployer:", testUser.address);
    const currentCDP = await cdpVault.getCDPInfo(testUser.address);
    console.log("Current CDP:", {
        collateralAmount: ethers.formatEther(currentCDP[0]),
        debtAmount: ethers.formatEther(currentCDP[1]),
        creditScore: currentCDP[2].toString(),
        apr: currentCDP[3].toString(),
        isActive: currentCDP[5],
        assignedLender: currentCDP[6]
    });
    
    if (currentCDP[5]) {
        console.log("✅ Deployer already has an active CDP!");
        
        // Show balances
        const collateralBalance = await collateralToken.balanceOf(testUser.address);
        const debtBalance = await debtToken.balanceOf(testUser.address);
        console.log("\n💰 Current balances:");
        console.log(`Collateral (CTK): ${ethers.formatEther(collateralBalance)}`);
        console.log(`Debt (DTK): ${ethers.formatEther(debtBalance)}`);
        
        return;
    }
    
    // Check balances
    console.log("\n💰 Current balances:");
    const deployerCollateralBalance = await collateralToken.balanceOf(testUser.address);
    const deployerDebtBalance = await debtToken.balanceOf(testUser.address);
    const vaultDebtBalance = await debtToken.balanceOf(cdpVaultAddress);
    
    console.log(`Deployer Collateral: ${ethers.formatEther(deployerCollateralBalance)} CTK`);
    console.log(`Deployer Debt: ${ethers.formatEther(deployerDebtBalance)} DTK`);
    console.log(`Vault Debt: ${ethers.formatEther(vaultDebtBalance)} DTK`);
    
    // Check if we have sufficient balance for CDP
    if (deployerCollateralBalance < ethers.parseEther("100")) {
        console.log("❌ Insufficient collateral balance for CDP creation");
        return;
    }
    
    // Create CDP for deployer
    console.log("\n💳 Creating new CDP for deployer...");
    
    // Approve collateral
    const collateralAmount = ethers.parseEther("500"); // Use 500 CTK
    console.log("📝 Approving", ethers.formatEther(collateralAmount), "CTK...");
    const approveTx = await collateralToken.connect(testUser).approve(cdpVaultAddress, collateralAmount);
    await approveTx.wait();
    console.log("✅ Collateral approved");
    
    // Open CDP
    const creditScore = 750; // Good credit score for deployer
    console.log("🏦 Opening CDP with", ethers.formatEther(collateralAmount), "CTK collateral and credit score", creditScore);
    const openCDPTx = await cdpVault.connect(testUser).openCDP(collateralAmount, creditScore);
    await openCDPTx.wait();
    console.log("✅ CDP opened successfully!");
    
    // Check CDP after creation
    const newCDP = await cdpVault.getCDPInfo(testUser.address);
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
        const loanAmount = ethers.parseEther("200"); // Request 200 DTK loan
        console.log("Requesting loan of", ethers.formatEther(loanAmount), "DTK");
        
        const loanTx = await cdpVault.connect(testUser).requestLoan(loanAmount);
        await loanTx.wait();
        console.log("✅ Loan request successful!");
        
        // Check final CDP state
        const finalCDP = await cdpVault.getCDPInfo(testUser.address);
        console.log("\n📊 Final CDP Info:", {
            collateralAmount: ethers.formatEther(finalCDP[0]),
            debtAmount: ethers.formatEther(finalCDP[1]),
            creditScore: finalCDP[2].toString(),
            apr: finalCDP[3].toString(),
            isActive: finalCDP[5],
            assignedLender: finalCDP[6]
        });
        
        // Check final balances
        const finalCollateralBalance = await collateralToken.balanceOf(testUser.address);
        const finalDebtBalance = await debtToken.balanceOf(testUser.address);
        console.log("\n💰 Final balances:");
        console.log(`Collateral (CTK): ${ethers.formatEther(finalCollateralBalance)}`);
        console.log(`Debt (DTK): ${ethers.formatEther(finalDebtBalance)}`);
        
        console.log("\n🎉 Perfect! Now the deployer address has an active CDP!");
        console.log("📝 Summary for MetaMask user (deployer):");
        console.log(`- Address: ${testUser.address}`);
        console.log(`- Collateral: ${ethers.formatEther(finalCDP[0])} CTK`);
        console.log(`- Debt: ${ethers.formatEther(finalCDP[1])} DTK`);
        console.log(`- Credit Score: ${finalCDP[2].toString()}`);
        console.log(`- APR: ${finalCDP[3].toString()} basis points (${(Number(finalCDP[3]) / 100).toFixed(1)}%)`);
        console.log(`- Assigned Lender: ${finalCDP[6]}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
