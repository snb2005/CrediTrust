const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing with account:", signer.address);

  // Get contract addresses from deployment
  const addresses = {
    collateralToken: "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9",
    debtToken: "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8",
    cdpVault: "0x851356ae760d987E095750cCeb3bC6014560891C"
  };

  // Get contract instances
  const CollateralToken = await hre.ethers.getContractFactory("MockERC20");
  const DebtToken = await hre.ethers.getContractFactory("MockERC20");
  const CDPVault = await hre.ethers.getContractFactory("CDPVault");

  const collateralToken = CollateralToken.attach(addresses.collateralToken);
  const debtToken = DebtToken.attach(addresses.debtToken);
  const cdpVault = CDPVault.attach(addresses.cdpVault);

  try {
    // Test basic functionality
    console.log("Testing contract functionality...");
    
    const collateralBalance = await collateralToken.balanceOf(signer.address);
    console.log("Collateral balance:", hre.ethers.formatEther(collateralBalance));
    
    const debtBalance = await debtToken.balanceOf(signer.address);
    console.log("Debt balance:", hre.ethers.formatEther(debtBalance));
    
    // Test CDP info
    const cdpInfo = await cdpVault.getCDPInfo(signer.address);
    console.log("CDP Info:", {
      collateralAmount: hre.ethers.formatEther(cdpInfo[0]),
      debtAmount: hre.ethers.formatEther(cdpInfo[1]),
      lastUpdateTime: cdpInfo[2].toString(),
      interestRate: cdpInfo[3].toString(),
      liquidationThreshold: hre.ethers.formatEther(cdpInfo[4]),
      isActive: cdpInfo[5]
    });
    
    console.log("✅ Contracts are working correctly!");
    
  } catch (error) {
    console.error("❌ Error testing contracts:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
