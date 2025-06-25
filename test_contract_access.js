const { ethers } = require('hardhat');
const fs = require('fs');

async function testContractAccess() {
    console.log('🔍 Testing contract access and functions...');
    
    const [deployer] = await ethers.getSigners();
    console.log('User:', deployer.address);
    
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
    console.log('Expected addresses:', deploymentInfo.contracts);
    
    try {
        // Test basic contract access
        console.log('\n📋 Testing contract access:');
        
        const CollateralToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.collateralToken);
        const DebtToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
        const CDPVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
        
        // Test token contracts
        console.log('✅ Collateral Token:', await CollateralToken.getAddress());
        console.log('✅ Debt Token:', await DebtToken.getAddress());
        console.log('✅ CDP Vault:', await CDPVault.getAddress());
        
        // Test token names
        const collateralName = await CollateralToken.name();
        const debtName = await DebtToken.name();
        console.log('Collateral token name:', collateralName);
        console.log('Debt token name:', debtName);
        
        // Test user balances
        console.log('\n💰 Testing user balances:');
        const userCollateralBalance = await CollateralToken.balanceOf(deployer.address);
        const userDebtBalance = await DebtToken.balanceOf(deployer.address);
        console.log('User collateral balance:', ethers.formatEther(userCollateralBalance));
        console.log('User debt balance:', ethers.formatEther(userDebtBalance));
        
        // Test vault balance
        const vaultBalance = await DebtToken.balanceOf(await CDPVault.getAddress());
        console.log('Vault debt balance:', ethers.formatEther(vaultBalance));
        
        // Test CDP Vault functions
        console.log('\n🏦 Testing CDP Vault functions:');
        
        // Test getLenderInfo function
        try {
            const lenderInfo = await CDPVault.getLenderInfo(deployer.address);
            console.log('✅ getLenderInfo works:', {
                stakedAmount: ethers.formatEther(lenderInfo[0] || 0),
                accruedRewards: ethers.formatEther(lenderInfo[1] || 0),
                reputation: (lenderInfo[2] || 0).toString(),
                isActive: lenderInfo[3] || false
            });
        } catch (error) {
            console.log('❌ getLenderInfo failed:', error.message);
        }
        
        // Test CDP info
        try {
            const cdpInfo = await CDPVault.cdps(deployer.address);
            console.log('✅ CDP info works:', {
                collateralAmount: ethers.formatEther(cdpInfo[0] || 0),
                debtAmount: ethers.formatEther(cdpInfo[1] || 0),
                creditScore: (cdpInfo[2] || 0).toString(),
                isActive: cdpInfo[6] || false
            });
        } catch (error) {
            console.log('❌ CDP info failed:', error.message);
        }
        
        // If user has no tokens, let's mint some and test
        if (userCollateralBalance === 0n || userDebtBalance === 0n) {
            console.log('\n🪙 User has no tokens, minting test tokens...');
            
            const mintAmount = ethers.parseEther('10000');
            await CollateralToken.mint(deployer.address, mintAmount);
            await DebtToken.mint(deployer.address, mintAmount);
            
            console.log('✅ Minted test tokens');
            
            // Test lending
            console.log('\n🏦 Testing lending functionality:');
            const lendAmount = ethers.parseEther('1000');
            
            await DebtToken.approve(await CDPVault.getAddress(), lendAmount);
            await CDPVault.stakeLender(lendAmount);
            
            console.log('✅ Lending test successful');
            
            // Check lender info again
            const newLenderInfo = await CDPVault.getLenderInfo(deployer.address);
            console.log('Updated lender info:', {
                stakedAmount: ethers.formatEther(newLenderInfo[0]),
                accruedRewards: ethers.formatEther(newLenderInfo[1]),
                reputation: newLenderInfo[2].toString(),
                isActive: newLenderInfo[3]
            });
        }
        
    } catch (error) {
        console.error('❌ Contract access failed:', error.message);
        console.error('This might indicate:');
        console.error('1. Hardhat node is not running');
        console.error('2. Contracts are not deployed at expected addresses');
        console.error('3. Wrong network configuration');
    }
}

testContractAccess().catch(console.error);
