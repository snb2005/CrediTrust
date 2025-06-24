const hre = require("hardhat");

async function main() {
  console.log("🔄 Minting test tokens...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer:", deployer.address);
  
  // Token addresses
  const COLLATERAL_TOKEN = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const DEBT_TOKEN = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  
  // Mint function ABI
  const mintABI = ["function mint(address to, uint256 amount) external"];
  
  const collateralToken = new hre.ethers.Contract(COLLATERAL_TOKEN, mintABI, deployer);
  const debtToken = new hre.ethers.Contract(DEBT_TOKEN, mintABI, deployer);
  
  const mintAmount = hre.ethers.parseEther("10000");
  
  // Get first 5 hardhat accounts
  const accounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account 1  
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account 3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"  // Account 4
  ];
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`\n📝 Minting for Account ${i}: ${account}`);
    
    try {
      // Mint collateral tokens
      const tx1 = await collateralToken.mint(account, mintAmount);
      await tx1.wait();
      console.log(`   ✅ Minted 10,000 collateral tokens`);
      
      // Mint debt tokens
      const tx2 = await debtToken.mint(account, mintAmount);
      await tx2.wait();
      console.log(`   ✅ Minted 10,000 debt tokens`);
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.reason || error.message);
    }
  }
  
  console.log("\n🎉 Done! Users should now have test tokens.");
  console.log("💡 Switch to one of the first 5 Hardhat accounts in MetaMask to use them.");
}

main().catch(console.error);
