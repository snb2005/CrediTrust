const { ethers } = require('hardhat');
const deploymentInfo = require('../deployment-info.json');

async function debugRequestLoan() {
    console.log('=== DEBUG REQUEST LOAN ===');
    
    const [deployer] = await ethers.getSigners();
    console.log('Deployer address:', deployer.address);
    
    try {
        // Get contracts
        const mockToken = await ethers.getContractAt('MockERC20', deploymentInfo.contracts.debtToken);
        const cdpVault = await ethers.getContractAt('CDPVault', deploymentInfo.contracts.cdpVault);
        
        console.log('\n1. Contract Addresses:');
        console.log('MockERC20 (debt token):', deploymentInfo.contracts.debtToken);
        console.log('CDPVault:', deploymentInfo.contracts.cdpVault);
        
        console.log('\n2. Token Balances:');
        const vaultBalance = await mockToken.balanceOf(deploymentInfo.contracts.cdpVault);
        const deployerBalance = await mockToken.balanceOf(deployer.address);
        const totalSupply = await mockToken.totalSupply();
        
        console.log('CDP Vault balance:', ethers.formatEther(vaultBalance));
        console.log('Deployer balance:', ethers.formatEther(deployerBalance));
        console.log('Total supply:', ethers.formatEther(totalSupply));
        
        console.log('\n3. CDP State:');
        const cdp = await cdpVault.cdps(deployer.address);
        console.log('CDP active:', cdp.isActive);
        console.log('CDP collateral:', ethers.formatEther(cdp.collateralAmount));
        console.log('CDP debt:', ethers.formatEther(cdp.debtAmount));
        console.log('CDP APR:', cdp.apr.toString());
        console.log('CDP borrower:', cdp.borrower);
        
        if (!cdp.isActive) {
            console.log('\n❌ CDP is not active! Need to open CDP first.');
            return;
        }
        
        console.log('\n4. Contract Constants:');
        const minCollateralRatio = await cdpVault.MIN_COLLATERAL_RATIO();
        console.log('Min collateral ratio:', minCollateralRatio.toString());
        
        console.log('\n5. Testing requestLoan with 100 tokens:');
        const loanAmount = ethers.parseEther('100');
        
        // Calculate what the collateral ratio would be
        const currentDebt = cdp.debtAmount;
        const newTotalDebt = currentDebt + loanAmount;
        const collateralRatio = (cdp.collateralAmount * 10000n) / newTotalDebt;
        
        console.log('Current debt:', ethers.formatEther(currentDebt));
        console.log('New total debt:', ethers.formatEther(newTotalDebt));
        console.log('Collateral ratio (calculated):', collateralRatio.toString());
        console.log('Min required ratio:', minCollateralRatio.toString());
        
        if (collateralRatio < minCollateralRatio) {
            console.log('❌ Collateral ratio would be insufficient!');
            console.log('   Current ratio:', collateralRatio.toString());
            console.log('   Required ratio:', minCollateralRatio.toString());
            return;
        }
        
        // Check if vault has enough tokens
        if (vaultBalance < loanAmount) {
            console.log('❌ Vault does not have enough tokens!');
            console.log('   Vault balance:', ethers.formatEther(vaultBalance));
            console.log('   Loan amount:', ethers.formatEther(loanAmount));
            
            // Try to mint tokens to the vault
            console.log('\n6. Attempting to mint tokens to vault...');
            const mintAmount = ethers.parseEther('10000');
            const mintTx = await mockToken.mint(deploymentInfo.contracts.cdpVault, mintAmount);
            await mintTx.wait();
            
            const newVaultBalance = await mockToken.balanceOf(deploymentInfo.contracts.cdpVault);
            console.log('New vault balance:', ethers.formatEther(newVaultBalance));
        }
        
        console.log('\n7. Attempting requestLoan...');
        try {
            const tx = await cdpVault.requestLoan(loanAmount);
            console.log('Transaction hash:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Transaction successful!');
            console.log('Gas used:', receipt.gasUsed.toString());
            
            // Check updated state
            const updatedCdp = await cdpVault.cdps(deployer.address);
            console.log('\n8. Updated CDP State:');
            console.log('New debt amount:', ethers.formatEther(updatedCdp.debtAmount));
            
        } catch (error) {
            console.log('❌ requestLoan failed:', error.message);
            
            // Try to get more specific error
            try {
                await cdpVault.callStatic.requestLoan(loanAmount);
            } catch (staticError) {
                console.log('Static call error:', staticError.message);
                if (staticError.reason) {
                    console.log('Revert reason:', staticError.reason);
                }
            }
        }
        
    } catch (error) {
        console.error('Error in debug script:', error);
    }
}

debugRequestLoan();
