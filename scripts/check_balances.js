const { ethers } = require("hardhat");

async function checkTokenBalances() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses from deployment
  const collateralTokenAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const debtTokenAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  
  console.log("Checking token balances for:", deployer.address);
  
  try {
    // Get contract instances
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateralToken = MockERC20.attach(collateralTokenAddress);
    const debtToken = MockERC20.attach(debtTokenAddress);
    
    // Check balances
    const collateralBalance = await collateralToken.balanceOf(deployer.address);
    const debtBalance = await debtToken.balanceOf(deployer.address);
    
    console.log("Collateral Token Balance:", ethers.formatEther(collateralBalance));
    console.log("Debt Token Balance:", ethers.formatEther(debtBalance));
    
    // Check token names
    const collateralName = await collateralToken.name();
    const debtName = await debtToken.name();
    
    console.log("Collateral Token Name:", collateralName);
    console.log("Debt Token Name:", debtName);
    
  } catch (error) {
    console.error("Error checking balances:", error.message);
  }
}

checkTokenBalances()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
