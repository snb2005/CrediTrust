const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Debugging openCDP functionality...");
  
  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  // Load deployment info
  const fs = require('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  console.log("\n📄 Contract Addresses:");
  console.log(JSON.stringify(deploymentInfo.contracts, null, 2));
  
  // Get contract instances
  const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
  const CollateralToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.collateralToken);
  const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
  const CreditAgent = await ethers.getContractAt("CreditAgent", deploymentInfo.contracts.creditAgent);
  
  console.log("\n💰 Token Balances:");
  const collateralBalance = await CollateralToken.balanceOf(deployer.address);
  const debtBalance = await DebtToken.balanceOf(deployer.address);
  console.log("Collateral Token balance:", ethers.formatEther(collateralBalance));
  console.log("Debt Token balance:", ethers.formatEther(debtBalance));
  
  // Check contract states
  console.log("\n🏦 Contract States:");
  try {
    const cdpCount = await CDPVault.cdpCount();
    console.log("Total CDPs created:", cdpCount.toString());
  } catch (error) {
    console.log("Error reading CDP count:", error.message);
  }
  
  try {
    const creditScore = await CreditAgent.getCreditScore(deployer.address);
    console.log("Credit score for deployer:", creditScore.toString());
  } catch (error) {
    console.log("Error reading credit score:", error.message);
  }
  
  // Check if user has existing CDP
  try {
    const existingCDP = await CDPVault.getCDPInfo(deployer.address);
    console.log("Existing CDP info:", {
      collateralAmount: ethers.formatEther(existingCDP[0]),
      debtAmount: ethers.formatEther(existingCDP[1]),
      creditScore: existingCDP[2].toString(),
      interestRate: existingCDP[3].toString(),
      dueDate: existingCDP[4].toString(),
      isActive: existingCDP[5]
    });
  } catch (error) {
    console.log("Error reading existing CDP or no CDP:", error.message);
  }
  
  // Test openCDP with proper parameters
  console.log("\n🔄 Testing openCDP...");
  
  const collateralAmount = ethers.parseEther("1111"); // 1111 tokens
  const creditScore = 700;
  
  try {
    // First ensure we have enough collateral tokens
    console.log("Checking collateral token allowance...");
    const currentAllowance = await CollateralToken.allowance(deployer.address, CDPVault.target);
    console.log("Current allowance:", ethers.formatEther(currentAllowance));
    
    if (currentAllowance < collateralAmount) {
      console.log("Approving collateral tokens...");
      const approveTx = await CollateralToken.approve(CDPVault.target, collateralAmount);
      await approveTx.wait();
      console.log("✅ Approval successful");
    }
    
    console.log("Opening CDP with:", {
      collateralAmount: ethers.formatEther(collateralAmount),
      creditScore: creditScore
    });
    
    // Try to open CDP
    const tx = await CDPVault.openCDP(collateralAmount, creditScore);
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ CDP opened successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check the new CDP info
    const newCDP = await CDPVault.getCDPInfo(deployer.address);
    console.log("New CDP info:", {
      collateralAmount: ethers.formatEther(newCDP[0]),
      debtAmount: ethers.formatEther(newCDP[1]),
      creditScore: newCDP[2].toString(),
      interestRate: newCDP[3].toString(),
      dueDate: newCDP[4].toString(),
      isActive: newCDP[5]
    });
    
  } catch (error) {
    console.error("❌ Failed to open CDP:");
    console.error("Error:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
    
    // Try to decode the revert reason
    try {
      if (error.data && typeof error.data === 'string') {
        const iface = new ethers.Interface([
          "error InsufficientCollateral()",
          "error CDPAlreadyExists()",
          "error InvalidCreditScore()",
          "error Unauthorized()"
        ]);
        const decoded = iface.parseError(error.data);
        console.error("Decoded error:", decoded);
      }
    } catch (decodeError) {
      console.log("Could not decode error data");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
