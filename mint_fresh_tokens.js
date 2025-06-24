const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    
    console.log('🪙 Minting tokens for test accounts...');
    console.log('Deployment info loaded:', deploymentInfo.contracts);
    
    // Get contract instances
    const CollateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    const accounts = [deployer, user1, user2, user3];
    const mintAmount = ethers.parseEther('10000'); // 10,000 tokens each
    
    console.log('\n🏦 Minting tokens to accounts:');
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(`\nAccount ${i} (${account.address}):`);
        
        // Mint ETH tokens (collateral)
        const ethTx = await CollateralToken.mint(account.address, mintAmount);
        await ethTx.wait();
        console.log(`  ✅ Minted ${ethers.formatEther(mintAmount)} ETH tokens`);
        
        // Mint USDC tokens (debt)
        const usdcTx = await DebtToken.mint(account.address, mintAmount);
        await usdcTx.wait();
        console.log(`  ✅ Minted ${ethers.formatEther(mintAmount)} USDC tokens`);
        
        // Check balances
        const ethBalance = await CollateralToken.balanceOf(account.address);
        const usdcBalance = await DebtToken.balanceOf(account.address);
        console.log(`  📊 ETH balance: ${ethers.formatEther(ethBalance)}`);
        console.log(`  📊 USDC balance: ${ethers.formatEther(usdcBalance)}`);
    }
    
    console.log('\n✅ Token minting completed!');
    console.log('\n📋 Summary:');
    console.log(`- ETH Token (Collateral): ${deploymentInfo.contracts.collateralToken}`);
    console.log(`- USDC Token (Debt): ${deploymentInfo.contracts.debtToken}`);
    console.log(`- CDP Vault: ${deploymentInfo.contracts.cdpVault}`);
    console.log('- Each account has 10,000 ETH and 10,000 USDC tokens');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
