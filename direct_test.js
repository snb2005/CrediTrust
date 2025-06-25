const { ethers } = require('hardhat');

async function directTest() {
    console.log('🔧 Direct contract test...');
    
    const [signer] = await ethers.getSigners();
    console.log('User:', signer.address);
    
    // Use the exact addresses from Hardhat logs
    const addresses = {
        collateral: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
        debt: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
        vault: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0'
    };
    
    try {
        // Test if contracts exist
        for (const [name, addr] of Object.entries(addresses)) {
            const code = await signer.provider.getCode(addr);
            console.log(`${name}: ${code.length > 2 ? '✅' : '❌'} (${code.length} bytes)`);
        }
        
        // Try to create contract instances and call functions
        console.log('\n🧪 Testing contract calls...');
        
        // Test simple calls first
        const CollateralToken = await ethers.getContractAt('MockERC20', addresses.collateral);
        
        console.log('Calling name()...');
        const name = await CollateralToken.name();
        console.log('Token name:', name);
        
        console.log('Calling balanceOf()...');
        const balance = await CollateralToken.balanceOf(signer.address);
        console.log('Balance:', ethers.formatEther(balance));
        
        // Test CDP Vault
        const CDPVault = await ethers.getContractAt('CDPVault', addresses.vault);
        
        console.log('Calling CDP info...');
        const cdpInfo = await CDPVault.cdps(signer.address);
        console.log('CDP active:', cdpInfo[6]);
        console.log('CDP collateral:', ethers.formatEther(cdpInfo[0]));
        
    } catch (error) {
        console.error('Direct test failed:', error.message);
        
        // Check if it's a network issue
        const balance = await signer.provider.getBalance(signer.address);
        console.log('ETH balance:', ethers.formatEther(balance));
        
        const block = await signer.provider.getBlockNumber();
        console.log('Current block:', block);
    }
}

directTest().catch(console.error);
