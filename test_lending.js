const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    const [deployer, user1] = await ethers.getSigners();
    
    console.log('🧪 Testing lending functionality...');
    console.log('User1:', user1.address);
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    
    // Test lending process
    const lendAmount = ethers.parseEther('137'); // 137 USDC
    
    console.log('\n1. Approving USDC for CDP Vault...');
    const approveTx = await DebtToken.connect(user1).approve(deploymentInfo.contracts.cdpVault, lendAmount);
    await approveTx.wait();
    console.log('✅ Approval completed');
    
    console.log('\n2. Staking as lender...');
    try {
        const stakeTx = await CDPVault.connect(user1).stakeLender(lendAmount);
        await stakeTx.wait();
        console.log('✅ Successfully staked as lender!');
        
        console.log('\n3. Checking lender info...');
        const lenderInfo = await CDPVault.getLenderInfo(user1.address);
        console.log('Lender info:', {
            stakedAmount: ethers.formatEther(lenderInfo[0]),
            accruedRewards: ethers.formatEther(lenderInfo[1]),
            reputation: lenderInfo[2].toString(),
            isActive: lenderInfo[3]
        });
        
    } catch (error) {
        console.error('❌ Staking failed:', error.message);
        if (error.reason) {
            console.error('Revert reason:', error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
