const { ethers } = require('hardhat');

async function checkDeployedContracts() {
    const [signer] = await ethers.getSigners();
    
    const addresses = [
        '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Collateral
        '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Debt  
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // CDP Vault
        '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Credit Agent
        '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'  // Router
    ];
    
    console.log('🔍 Checking all deployed contracts:');
    for (let i = 0; i < addresses.length; i++) {
        const code = await signer.provider.getCode(addresses[i]);
        console.log(`${addresses[i]}: ${code.length > 2 ? '✅ EXISTS' : '❌ MISSING'} (${code.length} bytes)`);
        
        if (code.length > 2) {
            // Try to call a function to verify it's working
            try {
                if (i < 2) { // Token contracts
                    const token = await ethers.getContractAt('MockERC20', addresses[i]);
                    const name = await token.name();
                    console.log(`  Name: ${name}`);
                } else if (i === 2) { // CDP Vault
                    const vault = await ethers.getContractAt('CDPVault', addresses[i]);
                    const lenderInfo = await vault.getLenderInfo(signer.address);
                    console.log(`  Lender staked: ${ethers.formatEther(lenderInfo[0])}`);
                }
            } catch (error) {
                console.log(`  ⚠️  Contract exists but function call failed: ${error.message}`);
            }
        }
    }
}

checkDeployedContracts().catch(console.error);
