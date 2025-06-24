const { ethers } = require("hardhat");

async function mintTokensForTestAccounts() {
  const [deployer] = await ethers.getSigners();
  
  // Get all test accounts (Hardhat provides 20 accounts by default)
  const accounts = await ethers.getSigners();
  
  // Contract addresses from latest deployment
  const collateralTokenAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const debtTokenAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  
  console.log("Minting tokens for test accounts...");
  
  try {
    // Get contract instances
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateralToken = MockERC20.attach(collateralTokenAddress);
    const debtToken = MockERC20.attach(debtTokenAddress);
    
    // Mint tokens for first 5 accounts (including deployer)
    for (let i = 0; i < Math.min(5, accounts.length); i++) {
      const account = accounts[i];
      const mintAmount = ethers.parseEther("10000"); // 10,000 tokens
      
      console.log(`Minting tokens for account ${i}: ${account.address}`);
      
      // Mint collateral tokens
      await collateralToken.mint(account.address, mintAmount);
      
      // Mint debt tokens
      await debtToken.mint(account.address, mintAmount);
      
      console.log(`✅ Minted 10,000 tokens of each type for ${account.address}`);
    }
    
    console.log("\n✅ Token minting completed for test accounts!");
    
  } catch (error) {
    console.error("Error minting tokens:", error.message);
  }
}

mintTokensForTestAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
