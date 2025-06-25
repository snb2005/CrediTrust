const { ethers } = require('hardhat');

async function quickTest() {
    try {
        const [signer] = await ethers.getSigners();
        console.log('Signer:', signer.address);
        
        const balance = await signer.provider.getBalance(signer.address);
        console.log('Balance:', ethers.formatEther(balance));
        
        // Test a simple contract call
        const code = await signer.provider.getCode('0x5FbDB2315678afecb367f032d93F642f64180aa3');
        console.log('Contract code length:', code.length);
        
        if (code === '0x') {
            console.log('❌ No contract deployed at that address');
        } else {
            console.log('✅ Contract exists');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

quickTest();
