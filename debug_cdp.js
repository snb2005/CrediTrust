const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging CDP contract...");
    
    // Get contract addresses
    const deploymentInfo = require('./deployment-info.json');
    console.log("📄 Contract addresses:", deploymentInfo.contracts);
    
    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("👤 User addresses:");
    console.log("Deployer:", deployer.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    
    // Get contract instances
    const cdpVaultAddress = deploymentInfo.contracts.cdpVault;
    const collateralTokenAddress = deploymentInfo.contracts.collateralToken;
    const debtTokenAddress = deploymentInfo.contracts.debtToken;
    
    const CDPVault = await ethers.getContractFactory("CDPVault");
    const cdpVault = CDPVault.attach(cdpVaultAddress);
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateralToken = MockERC20.attach(collateralTokenAddress);
    const debtToken = MockERC20.attach(debtTokenAddress);
    
    console.log("\n🏦 Contract instances created successfully");
    
    // Check balances
    console.log("\n💰 Current balances:");
    const deployerCollateralBalance = await collateralToken.balanceOf(deployer.address);
    const deployerDebtBalance = await debtToken.balanceOf(deployer.address);
    const user1CollateralBalance = await collateralToken.balanceOf(user1.address);
    const user1DebtBalance = await debtToken.balanceOf(user1.address);
    const vaultDebtBalance = await debtToken.balanceOf(cdpVaultAddress);
    
    console.log(`Deployer Collateral: ${ethers.formatEther(deployerCollateralBalance)} CTK`);
    console.log(`Deployer Debt: ${ethers.formatEther(deployerDebtBalance)} DTK`);
    console.log(`User1 Collateral: ${ethers.formatEther(user1CollateralBalance)} CTK`);
    console.log(`User1 Debt: ${ethers.formatEther(user1DebtBalance)} DTK`);
    console.log(`Vault Debt: ${ethers.formatEther(vaultDebtBalance)} DTK`);
    
    // Check CDP info for all users
    console.log("\n📊 CDP Information:");
    try {
        const deployerCDP = await cdpVault.getCDPInfo(deployer.address);
        console.log("Deployer CDP:", {
            collateralAmount: ethers.formatEther(deployerCDP[0]),
            debtAmount: ethers.formatEther(deployerCDP[1]),
            creditScore: deployerCDP[2].toString(),
            apr: deployerCDP[3].toString(),
            dueDate: new Date(Number(deployerCDP[4]) * 1000).toLocaleString(),
            isActive: deployerCDP[5],
            assignedLender: deployerCDP[6]
        });
    } catch (error) {
        console.log("❌ Error getting deployer CDP:", error.message);
    }
    
    try {
        const user1CDP = await cdpVault.getCDPInfo(user1.address);
        console.log("User1 CDP:", {
            collateralAmount: ethers.formatEther(user1CDP[0]),
            debtAmount: ethers.formatEther(user1CDP[1]),
            creditScore: user1CDP[2].toString(),
            apr: user1CDP[3].toString(),
            dueDate: new Date(Number(user1CDP[4]) * 1000).toLocaleString(),
            isActive: user1CDP[5],
            assignedLender: user1CDP[6]
        });
    } catch (error) {
        console.log("❌ Error getting user1 CDP:", error.message);
    }
    
    // Check if vault has the required tokens to operate
    console.log("\n🔧 Vault Status:");
    console.log(`Vault has ${ethers.formatEther(vaultDebtBalance)} DTK for lending`);
    
    // If no one has a CDP, let's try to open one
    const user1CDP = await cdpVault.getCDPInfo(user1.address);
    if (!user1CDP[5]) { // isActive is false
        console.log("\n🆕 No active CDP found for user1. Let's create one...");
        
        // Check if user1 has collateral
        if (user1CollateralBalance > 0) {
            try {
                // Approve collateral
                console.log("✅ Approving collateral...");
                await (await collateralToken.connect(user1).approve(cdpVaultAddress, ethers.parseEther("1000"))).wait();
                
                // Open CDP
                console.log("🏦 Opening CDP...");
                const collateralAmount = ethers.parseEther("100");
                const creditScore = 700;
                await (await cdpVault.connect(user1).openCDP(collateralAmount, creditScore)).wait();
                
                console.log("✅ CDP opened successfully!");
                
                // Check CDP info again
                const newCDP = await cdpVault.getCDPInfo(user1.address);
                console.log("New CDP:", {
                    collateralAmount: ethers.formatEther(newCDP[0]),
                    debtAmount: ethers.formatEther(newCDP[1]),
                    creditScore: newCDP[2].toString(),
                    apr: newCDP[3].toString(),
                    dueDate: new Date(Number(newCDP[4]) * 1000).toLocaleString(),
                    isActive: newCDP[5],
                    assignedLender: newCDP[6]
                });
                
            } catch (error) {
                console.log("❌ Error opening CDP:", error.message);
            }
        } else {
            console.log("❌ User1 has no collateral tokens");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
