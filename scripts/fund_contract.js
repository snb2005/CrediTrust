const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Funding contract for withdrawals...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Funding from account:", deployer.address);
    
    // Load deployment info
    const deploymentInfo = require("../deployment-info.json");
    console.log("Using contracts from deployment:", deploymentInfo.contracts);
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
    
    // Check current balances
    const contractBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    const deployerBalance = await DebtToken.balanceOf(deployer.address);
    
    console.log("Contract current balance:", ethers.formatEther(contractBalance));
    console.log("Deployer balance:", ethers.formatEther(deployerBalance));
    
    // Transfer some tokens to the contract for rewards pool
    const fundAmount = ethers.parseEther("1000"); // Add 1000 tokens for rewards
    console.log("Transferring", ethers.formatEther(fundAmount), "tokens to contract for rewards pool...");
    
    try {
        const transferTx = await DebtToken.transfer(deploymentInfo.contracts.cdpVault, fundAmount);
        await transferTx.wait();
        console.log("✅ Successfully funded contract");
        
        // Check new balance
        const newContractBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
        console.log("Contract new balance:", ethers.formatEther(newContractBalance));
        
        // Now test withdrawal
        console.log("\n💸 Testing withdrawal after funding...");
        const withdrawTx = await CDPVault.withdrawLender(0); // Withdraw all
        await withdrawTx.wait();
        console.log("✅ Withdrawal successful!");
        
        // Check final balances
        const finalContractBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
        const finalDeployerBalance = await DebtToken.balanceOf(deployer.address);
        console.log("Final contract balance:", ethers.formatEther(finalContractBalance));
        console.log("Final deployer balance:", ethers.formatEther(finalDeployerBalance));
        
        // Check lender info
        const lenderInfo = await CDPVault.getLenderInfo(deployer.address);
        console.log("Final lender info:", {
            stakedAmount: ethers.formatEther(lenderInfo[0]),
            accruedRewards: ethers.formatEther(lenderInfo[1]),
            reputation: lenderInfo[2].toString(),
            isActive: lenderInfo[3]
        });
        
    } catch (error) {
        console.error("❌ Operation failed:", error.message);
    }
    
    console.log("\n✅ Contract funding completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
