const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Testing complete lending flow...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Load deployment info
    const deploymentInfo = require("../deployment-info.json");
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
    
    console.log("\n📊 Initial state:");
    const initialBalance = await DebtToken.balanceOf(deployer.address);
    const initialLenderInfo = await CDPVault.getLenderInfo(deployer.address);
    console.log("User balance:", ethers.formatEther(initialBalance));
    console.log("Is active lender:", initialLenderInfo[3]);
    
    // Step 1: Stake tokens
    console.log("\n💰 Step 1: Staking tokens...");
    const stakeAmount = ethers.parseEther("500");
    
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
        
        // Check state after staking
        const afterStakeBalance = await DebtToken.balanceOf(deployer.address);
        const afterStakeLenderInfo = await CDPVault.getLenderInfo(deployer.address);
        console.log("User balance after staking:", ethers.formatEther(afterStakeBalance));
        console.log("Staked amount:", ethers.formatEther(afterStakeLenderInfo[0]));
        console.log("Is active lender:", afterStakeLenderInfo[3]);
        
    } catch (error) {
        console.error("❌ Staking failed:", error.message);
        return;
    }
    
    // Step 2: Wait a bit for rewards to accrue
    console.log("\n⏳ Step 2: Waiting for rewards to accrue...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Try withdrawal
    console.log("\n💸 Step 3: Testing withdrawal...");
    try {
        const beforeWithdrawLenderInfo = await CDPVault.getLenderInfo(deployer.address);
        console.log("Before withdrawal - Staked:", ethers.formatEther(beforeWithdrawLenderInfo[0]));
        console.log("Before withdrawal - Rewards:", ethers.formatEther(beforeWithdrawLenderInfo[1]));
        
        const withdrawTx = await CDPVault.withdrawLender(0); // Withdraw all
        await withdrawTx.wait();
        console.log("✅ Withdrawal successful");
        
        // Check final state
        const finalBalance = await DebtToken.balanceOf(deployer.address);
        const finalLenderInfo = await CDPVault.getLenderInfo(deployer.address);
        console.log("Final user balance:", ethers.formatEther(finalBalance));
        console.log("Final staked amount:", ethers.formatEther(finalLenderInfo[0]));
        console.log("Is active lender:", finalLenderInfo[3]);
        
        // Calculate what was received
        const received = finalBalance - initialBalance;
        console.log("Net received:", ethers.formatEther(received));
        
    } catch (error) {
        console.error("❌ Withdrawal failed:", error.message);
    }
    
    console.log("\n✅ Complete lending flow test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
