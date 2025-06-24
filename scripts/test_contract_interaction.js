const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing contract interactions...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Load deployment info
    const deploymentInfo = require("../deployment-info.json");
    console.log("Using contracts from deployment:", deploymentInfo.contracts);
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
    const CollateralToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.collateralToken);
    const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
    
    console.log("\n📊 Checking balances...");
    const debtBalance = await DebtToken.balanceOf(deployer.address);
    const collateralBalance = await CollateralToken.balanceOf(deployer.address);
    console.log("Debt token balance:", ethers.formatEther(debtBalance));
    console.log("Collateral token balance:", ethers.formatEther(collateralBalance));
    
    console.log("\n🔍 Checking current lender info...");
    const lenderInfo = await CDPVault.getLenderInfo(deployer.address);
    console.log("Lender info:", {
        stakedAmount: ethers.formatEther(lenderInfo[0]),
        accruedRewards: ethers.formatEther(lenderInfo[1]),
        reputation: lenderInfo[2].toString(),
        isActive: lenderInfo[3]
    });
    
    // Test staking if user has tokens and no active position
    if (debtBalance > 0 && !lenderInfo[3]) {
        console.log("\n💰 Testing staking...");
        const stakeAmount = ethers.parseEther("1000");
        
        try {
            // Approve first
            console.log("Approving tokens...");
            const approveTx = await DebtToken.approve(deploymentInfo.contracts.cdpVault, stakeAmount);
            await approveTx.wait();
            console.log("✅ Approval successful");
            
            // Then stake
            console.log("Staking tokens...");
            const stakeTx = await CDPVault.stakeLender(stakeAmount);
            await stakeTx.wait();
            console.log("✅ Staking successful");
            
            // Check updated lender info
            const updatedLenderInfo = await CDPVault.getLenderInfo(deployer.address);
            console.log("Updated lender info:", {
                stakedAmount: ethers.formatEther(updatedLenderInfo[0]),
                accruedRewards: ethers.formatEther(updatedLenderInfo[1]),
                reputation: updatedLenderInfo[2].toString(),
                isActive: updatedLenderInfo[3]
            });
            
        } catch (error) {
            console.error("❌ Staking failed:", error.message);
        }
    }
    
    // Test withdrawal if user has active position
    if (lenderInfo[3]) {
        console.log("\n💸 Testing withdrawal...");
        try {
            const withdrawTx = await CDPVault.withdrawLender(0); // Withdraw all
            await withdrawTx.wait();
            console.log("✅ Withdrawal successful");
            
            // Check updated lender info
            const updatedLenderInfo = await CDPVault.getLenderInfo(deployer.address);
            console.log("Updated lender info after withdrawal:", {
                stakedAmount: ethers.formatEther(updatedLenderInfo[0]),
                accruedRewards: ethers.formatEther(updatedLenderInfo[1]),
                reputation: updatedLenderInfo[2].toString(),
                isActive: updatedLenderInfo[3]
            });
            
        } catch (error) {
            console.error("❌ Withdrawal failed:", error.message);
        }
    }
    
    console.log("\n✅ Contract interaction test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
