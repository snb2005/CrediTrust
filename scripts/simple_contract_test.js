const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function simpleContractTest() {
    console.log('=== SIMPLE CONTRACT TEST ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('User address:', deployer.address);
    
    // Test if we can get basic chain info
    const network = await ethers.provider.getNetwork();
    console.log('Network:', network);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('ETH Balance:', ethers.formatEther(balance));
    
    // Test contract instance creation
    try {
        const collateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
        console.log('✅ Collateral token contract instance created');
        
        // Try to get contract name
        const name = await collateralToken.name();
        console.log('Token name:', name);
        
        const symbol = await collateralToken.symbol();
        console.log('Token symbol:', symbol);
        
        const balance = await collateralToken.balanceOf(deployer.address);
        console.log('Token balance:', ethers.formatEther(balance));
        
    } catch (error) {
        console.log('❌ Error with collateral token:', error.message);
    }
    
    // Test CDP Vault
    try {
        const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
        console.log('✅ CDP Vault contract instance created');
        
        const totalCollateral = await cdpVault.totalCollateral();
        console.log('Total collateral in vault:', ethers.formatEther(totalCollateral));
        
    } catch (error) {
        console.log('❌ Error with CDP vault:', error.message);
    }
}

simpleContractTest().catch(console.error);
