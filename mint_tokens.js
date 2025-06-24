const { ethers } = require('hardhat');

async function main() {
  console.log('Minting test tokens for the first 10 accounts...');
  
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  // Get token contracts
  const collateralToken = await ethers.getContractAt('MockERC20', '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0');
  const debtToken = await ethers.getContractAt('MockERC20', '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  
  // Mint tokens for first 10 accounts (including deployer)
  const mintAmount = ethers.utils.parseEther('10000'); // 10,000 tokens each
  
  const allAccounts = [deployer, ...accounts.slice(0, 9)]; // First 10 accounts
  
  for (let i = 0; i < allAccounts.length; i++) {
    const account = allAccounts[i];
    console.log(`\nMinting tokens for account ${i + 1}: ${account.address}`);
    
    try {
      // Mint collateral tokens
      const tx1 = await collateralToken.connect(deployer).mint(account.address, mintAmount);
      await tx1.wait();
      console.log(`✅ Minted 10,000 collateral tokens`);
      
      // Mint debt tokens  
      const tx2 = await debtToken.connect(deployer).mint(account.address, mintAmount);
      await tx2.wait();
      console.log(`✅ Minted 10,000 debt tokens`);
      
      // Check balances
      const collateralBalance = await collateralToken.balanceOf(account.address);
      const debtBalance = await debtToken.balanceOf(account.address);
      console.log(`   Collateral balance: ${ethers.utils.formatEther(collateralBalance)}`);
      console.log(`   Debt balance: ${ethers.utils.formatEther(debtBalance)}`);
      
    } catch (error) {
      console.error(`❌ Failed to mint for ${account.address}:`, error.message);
    }
  }
  
  console.log('\n🎉 Token minting complete!');
  console.log('\nNow users can:');
  console.log('1. Use collateral tokens for borrowing (openCDP)');
  console.log('2. Use debt tokens for lending (stakeLender)');
}

main().catch(console.error);
