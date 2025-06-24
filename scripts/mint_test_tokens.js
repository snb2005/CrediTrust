const hre = require("hardhat");

async function main() {
  console.log("🔄 Minting test tokens for users...");
  
  // Get signers (first 10 accounts)
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  
  console.log("Deployer:", deployer.address);
  console.log("Deployer ETH balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  
  // Token addresses from deployment
  const COLLATERAL_TOKEN = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const DEBT_TOKEN = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  
  // Simple ERC20 ABI for minting
  const ERC20_ABI = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)"
  ];
  
  // Connect to contracts
  const collateralToken = new hre.ethers.Contract(COLLATERAL_TOKEN, ERC20_ABI, deployer);
  const debtToken = new hre.ethers.Contract(DEBT_TOKEN, ERC20_ABI, deployer);
  
  console.log("Collateral Token:", await collateralToken.name(), await collateralToken.symbol());
  console.log("Debt Token:", await debtToken.name(), await debtToken.symbol());
  
  // Mint amount: 10,000 tokens
  const mintAmount = hre.ethers.parseEther("10000");
  
  // Mint for first 5 accounts (including deployer)
  for (let i = 0; i < Math.min(5, signers.length); i++) {
    const account = signers[i];
    console.log(`\n📝 Account ${i + 1}: ${account.address}`);
    
    try {
      // Check current balances
      const currentCollateral = await collateralToken.balanceOf(account.address);
      const currentDebt = await debtToken.balanceOf(account.address);
      
      console.log(`   Current collateral: ${hre.ethers.formatEther(currentCollateral)}`);
      console.log(`   Current debt: ${hre.ethers.formatEther(currentDebt)}`);
      
      // Mint collateral tokens
      if (currentCollateral.lt(mintAmount)) {
        const tx1 = await collateralToken.mint(account.address, mintAmount);
        await tx1.wait();
        console.log(`   ✅ Minted 10,000 collateral tokens`);
      } else {
        console.log(`   ⚡ Already has enough collateral tokens`);
      }
      
      // Mint debt tokens
      if (currentDebt.lt(mintAmount)) {
        const tx2 = await debtToken.mint(account.address, mintAmount);
        await tx2.wait();
        console.log(`   ✅ Minted 10,000 debt tokens`);
      } else {
        console.log(`   ⚡ Already has enough debt tokens`);
      }
      
      // Final balances
      const finalCollateral = await collateralToken.balanceOf(account.address);
      const finalDebt = await debtToken.balanceOf(account.address);
      
      console.log(`   💰 Final collateral: ${hre.ethers.formatEther(finalCollateral)}`);
      console.log(`   💰 Final debt: ${hre.ethers.formatEther(finalDebt)}`);
      
    } catch (error) {
      console.error(`   ❌ Error for ${account.address}:`, error.message);
    }
  }
  
  console.log("\n🎉 Token minting completed!");
  console.log("\n📋 Summary:");
  console.log("- Users now have 10,000 collateral tokens for borrowing");
  console.log("- Users now have 10,000 debt tokens for lending");
  console.log("- Switch to the first few accounts in MetaMask to use these tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
