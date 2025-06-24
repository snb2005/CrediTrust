const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    const [deployer, user1] = await ethers.getSigners();
    
    console.log('🔍 Debugging lending issue...');
    console.log('Deployer:', deployer.address);
    console.log('User1:', user1.address);
    
    // Get contract instances
    const CollateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
    const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
    const CDPVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
    
    console.log('\n📊 Current Token Balances:');
    
    // Check deployer balances
    const deployerEthBalance = await CollateralToken.balanceOf(deployer.address);
    const deployerUsdcBalance = await DebtToken.balanceOf(deployer.address);
    console.log(`Deployer ETH tokens: ${ethers.formatEther(deployerEthBalance)}`);
    console.log(`Deployer USDC tokens: ${ethers.formatEther(deployerUsdcBalance)}`);
    
    // Check user1 balances
    const user1EthBalance = await CollateralToken.balanceOf(user1.address);
    const user1UsdcBalance = await DebtToken.balanceOf(user1.address);
    console.log(`User1 ETH tokens: ${ethers.formatEther(user1EthBalance)}`);
    console.log(`User1 USDC tokens: ${ethers.formatEther(user1UsdcBalance)}`);
    
    // Check allowances
    const deployerAllowance = await DebtToken.allowance(deployer.address, deploymentInfo.contracts.cdpVault);
    const user1Allowance = await DebtToken.allowance(user1.address, deploymentInfo.contracts.cdpVault);
    console.log(`\n💰 Allowances for CDP Vault:`);
    console.log(`Deployer USDC allowance: ${ethers.formatEther(deployerAllowance)}`);
    console.log(`User1 USDC allowance: ${ethers.formatEther(user1Allowance)}`);
    
    // Mint USDC tokens if user1 doesn't have enough
    if (user1UsdcBalance < ethers.parseEther('1000')) {
        console.log('\n🪙 Minting USDC tokens for user1...');
        const mintAmount = ethers.parseEther('10000'); // 10,000 USDC
        const tx = await DebtToken.mint(user1.address, mintAmount);
        await tx.wait();
        console.log(`✅ Minted ${ethers.formatEther(mintAmount)} USDC for user1`);
        
        // Check new balance
        const newBalance = await DebtToken.balanceOf(user1.address);
        console.log(`New user1 USDC balance: ${ethers.formatEther(newBalance)}`);
    }
    
    // Test approval process
    console.log('\n🔐 Testing approval process...');
    try {
        const approveAmount = ethers.parseEther('500'); // 500 USDC
        const approveTx = await DebtToken.connect(user1).approve(deploymentInfo.contracts.cdpVault, approveAmount);
        await approveTx.wait();
        console.log(`✅ Approved ${ethers.formatEther(approveAmount)} USDC for CDP Vault`);
        
        // Check new allowance
        const newAllowance = await DebtToken.allowance(user1.address, deploymentInfo.contracts.cdpVault);
        console.log(`New allowance: ${ethers.formatEther(newAllowance)}`);
        
        // Test staking (small amount)
        console.log('\n🏦 Testing stakeLender function...');
        const stakeAmount = ethers.parseEther('100'); // 100 USDC
        const stakeTx = await CDPVault.connect(user1).stakeLender(stakeAmount);
        await stakeTx.wait();
        console.log(`✅ Successfully staked ${ethers.formatEther(stakeAmount)} USDC`);
        
        // Check lender info
        const lenderInfo = await CDPVault.getLenderInfo(user1.address);
        console.log('Lender info:', {
            stakedAmount: ethers.formatEther(lenderInfo[0]),
            accruedRewards: ethers.formatEther(lenderInfo[1]),
            reputation: lenderInfo[2].toString(),
            isActive: lenderInfo[3]
        });
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
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
