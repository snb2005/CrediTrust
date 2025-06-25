const { ethers } = require('hardhat');

async function findActualContracts() {
    const [signer] = await ethers.getSigners();
    
    console.log('🔍 Finding actually deployed contracts...');
    
    // Get current block number
    const blockNumber = await signer.provider.getBlockNumber();
    console.log('Current block:', blockNumber);
    
    // Check recent blocks for contract deployments
    for (let i = Math.max(0, blockNumber - 10); i <= blockNumber; i++) {
        try {
            const block = await signer.provider.getBlock(i, true);
            if (block && block.transactions.length > 0) {
                console.log(`\nBlock ${i} has ${block.transactions.length} transactions:`);
                for (const tx of block.transactions) {
                    if (tx.to === null) { // Contract deployment
                        const receipt = await signer.provider.getTransactionReceipt(tx.hash);
                        if (receipt && receipt.contractAddress) {
                            console.log(`  📄 Contract deployed: ${receipt.contractAddress}`);
                            
                            // Try to identify what type of contract
                            const code = await signer.provider.getCode(receipt.contractAddress);
                            if (code.length > 100) {
                                try {
                                    const token = await ethers.getContractAt('MockERC20', receipt.contractAddress);
                                    const name = await token.name();
                                    console.log(`    Token: ${name}`);
                                } catch {
                                    try {
                                        const vault = await ethers.getContractAt('CDPVault', receipt.contractAddress);
                                        console.log(`    CDP Vault`);
                                    } catch {
                                        console.log(`    Unknown contract`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Skip blocks that don't exist
        }
    }
}

findActualContracts().catch(console.error);
