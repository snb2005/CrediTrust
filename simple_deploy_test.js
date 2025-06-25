const { ethers } = require('hardhat');

async function simpleTest() {
    console.log('🔧 Simple deployment test...');
    
    const [signer] = await ethers.getSigners();
    console.log('Deployer:', signer.address);
    
    // Check network
    const network = await signer.provider.getNetwork();
    console.log('Network:', network.name, 'ChainId:', network.chainId);
    
    // Deploy a simple token
    console.log('\n📋 Deploying token...');
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    const token = await MockERC20.deploy('Test Token', 'TEST', 18);
    
    // Wait for deployment
    await token.waitForDeployment();
    const address = await token.getAddress();
    console.log('✅ Token deployed to:', address);
    
    // Test the deployed contract
    console.log('\n🧪 Testing deployed contract...');
    const code = await signer.provider.getCode(address);
    console.log('Contract code length:', code.length);
    
    if (code.length > 2) {
        console.log('✅ Contract successfully deployed and accessible!');
        
        // Test a function call
        const name = await token.name();
        console.log('Token name:', name);
        
        return address;
    } else {
        console.log('❌ Contract not properly deployed');
        return null;
    }
}

simpleTest()
    .then((address) => {
        if (address) {
            console.log('\n🎉 Simple deployment works! Issue might be with complex deployment scripts.');
        } else {
            console.log('\n❌ Even simple deployment failed - network issue.');
        }
    })
    .catch(console.error);
