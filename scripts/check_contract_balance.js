const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking contract balances...");
    
    // Load deployment info
    const deploymentInfo = require("../deployment-info.json");
    console.log("Using contracts from deployment:", deploymentInfo.contracts);
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
    
    console.log("\n📊 Checking token balances...");
    const contractDebtBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    const totalSupply = await DebtToken.totalSupply();
    
    console.log("CDP Vault debt token balance:", ethers.formatEther(contractDebtBalance));
    console.log("Total debt token supply:", ethers.formatEther(totalSupply));
    
    // Get all accounts to see who has tokens
    const [deployer, account1, account2] = await ethers.getSigners();
    const accounts = [deployer, account1, account2];
    
    console.log("\n👥 Account balances:");
    for (let i = 0; i < accounts.length; i++) {
        const balance = await DebtToken.balanceOf(accounts[i].address);
        console.log(`Account ${i} (${accounts[i].address}): ${ethers.formatEther(balance)}`);
    }
    
    // Check lender info for deployer
    const lenderInfo = await CDPVault.getLenderInfo(deployer.address);
    console.log("\n📊 Deployer's lender info:");
    console.log({
        stakedAmount: ethers.formatEther(lenderInfo[0]),
        accruedRewards: ethers.formatEther(lenderInfo[1]),
        reputation: lenderInfo[2].toString(),
        isActive: lenderInfo[3]
    });
    
    // Calculate how much the contract needs to have for withdrawal
    const totalNeeded = lenderInfo[0] + lenderInfo[1]; // stakingAmount + rewards
    console.log("\n💰 Contract needs at least:", ethers.formatEther(totalNeeded), "tokens for withdrawal");
    console.log("Contract currently has:", ethers.formatEther(contractDebtBalance), "tokens");
    console.log("Shortfall:", ethers.formatEther(totalNeeded - contractDebtBalance), "tokens");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
