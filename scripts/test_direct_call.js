const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function testContractCall() {
    console.log('=== TESTING DIRECT CONTRACT CALL ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('User address:', deployer.address);
    console.log('Contract address:', deploymentInfo.contracts.collateralToken);
    
    // Test direct call
    try {
        const provider = ethers.provider;
        
        // Get balance using raw call
        const balanceOfSelector = '0x70a08231'; // balanceOf(address)
        const paddedAddress = ethers.zeroPadValue(deployer.address, 32);
        const callData = balanceOfSelector + paddedAddress.slice(2);
        
        console.log('Call data:', callData);
        
        const result = await provider.call({
            to: deploymentInfo.contracts.collateralToken,
            data: callData
        });
        
        console.log('Raw result:', result);
        
        if (result === '0x') {
            console.log('❌ Contract call returned empty result - contract might not exist or function not found');
        } else {
            const balance = ethers.getBigInt(result);
            console.log('Balance (raw):', balance.toString());
            console.log('Balance (formatted):', ethers.formatEther(balance));
        }
        
    } catch (error) {
        console.log('❌ Raw call failed:', error.message);
    }
    
    // Try with a simple contract creation to see if ethers works
    try {
        console.log('\n=== TESTING SIMPLE CONTRACT CREATION ===');
        const SimpleToken = await ethers.getContractFactory('MockERC20');
        const token = await SimpleToken.deploy('Test Token', 'TEST', 18);
        await token.waitForDeployment();
        
        const address = await token.getAddress();
        console.log('✅ Test token deployed to:', address);
        
        const name = await token.name();
        console.log('✅ Token name:', name);
        
        const symbol = await token.symbol();
        console.log('✅ Token symbol:', symbol);
        
        // Mint some tokens
        await token.mint(deployer.address, ethers.parseEther('1000'));
        const balance = await token.balanceOf(deployer.address);
        console.log('✅ Token balance:', ethers.formatEther(balance));
        
    } catch (error) {
        console.log('❌ Test contract creation failed:', error.message);
    }
}

testContractCall().catch(console.error);
