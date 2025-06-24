const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    
    console.log('🪙 Minting tokens for test accounts...');
    
    // Get contract instances
    const CollateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    
    const accounts = [deployer, user1, user2, user3];
    const mintAmount = ethers.parseEther('10000'); // 10,000 tokens each
    
    console.log('\n🏦 Minting tokens to accounts:');
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(`Account ${i} (${account.address}): Minting...`);
        
        // Mint ETH tokens (collateral)
        const ethTx = await CollateralToken.mint(account.address, mintAmount);
        await ethTx.wait();
        
        // Mint USDC tokens (debt)
        const usdcTx = await DebtToken.mint(account.address, mintAmount);
        await usdcTx.wait();
        
        console.log(`  ✅ Minted 10,000 ETH and 10,000 USDC tokens`);
    }
    
    console.log('\n✅ Token minting completed!');
    console.log('\nContract addresses for frontend:');
    console.log(`CDP_VAULT: '${deploymentInfo.contracts.cdpVault}'`);
    console.log(`COLLATERAL_TOKEN: '${deploymentInfo.contracts.collateralToken}'`);
    console.log(`DEBT_TOKEN: '${deploymentInfo.contracts.debtToken}'`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
