const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing Complete Borrowing Flow...");
  
  // Get the signers
  const [deployer, user1] = await ethers.getSigners();
  console.log("Using accounts:");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  
  // Load deployment info
  const fs = require('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  
  // Get contract instances
  const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
  const CollateralToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.collateralToken);
  const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
  
  console.log("\n📊 Initial State Check:");
  
  // Check if deployer has an existing CDP
  try {
    const deployerCDP = await CDPVault.getCDPInfo(deployer.address);
    console.log("Deployer CDP:", {
      collateralAmount: ethers.formatEther(deployerCDP[0]),
      debtAmount: ethers.formatEther(deployerCDP[1]),
      creditScore: deployerCDP[2].toString(),
      isActive: deployerCDP[5]
    });
  } catch (error) {
    console.log("Deployer has no CDP");
  }
  
  // Test with user1 who should not have a CDP
  console.log("\n🧪 Testing with User1 (clean account):");
  
  // First, mint some collateral tokens for user1
  await CollateralToken.mint(user1.address, ethers.parseEther("2000"));
  const user1CollateralBalance = await CollateralToken.balanceOf(user1.address);
  console.log("User1 collateral balance:", ethers.formatEther(user1CollateralBalance));
  
  // Check if user1 has existing CDP
  try {
    const user1CDP = await CDPVault.getCDPInfo(user1.address);
    if (user1CDP[5]) { // isActive
      console.log("User1 already has active CDP");
      return;
    }
  } catch (error) {
    console.log("User1 has no existing CDP - perfect for testing");
  }
  
  console.log("\n🏦 Test Case 1: New User Opening CDP and Requesting Loan");
  
  const collateralAmount = ethers.parseEther("1500"); // 1500 tokens
  const loanAmount = ethers.parseEther("800"); // 800 tokens loan
  const creditScore = 700;
  
  try {
    // Step 1: Approve collateral
    console.log("Step 1: Approving collateral...");
    const approveTx = await CollateralToken.connect(user1).approve(CDPVault.target, collateralAmount);
    await approveTx.wait();
    console.log("✅ Collateral approved");
    
    // Step 2: Open CDP
    console.log("Step 2: Opening CDP...");
    const openTx = await CDPVault.connect(user1).openCDP(collateralAmount, creditScore);
    await openTx.wait();
    console.log("✅ CDP opened successfully");
    
    // Check CDP info
    const cdpInfo = await CDPVault.getCDPInfo(user1.address);
    console.log("New CDP Info:", {
      collateralAmount: ethers.formatEther(cdpInfo[0]),
      debtAmount: ethers.formatEther(cdpInfo[1]),
      creditScore: cdpInfo[2].toString(),
      apr: cdpInfo[3].toString(),
      isActive: cdpInfo[5]
    });
    
    // Step 3: Request loan
    console.log("Step 3: Requesting loan...");
    const loanTx = await CDPVault.connect(user1).requestLoan(loanAmount);
    await loanTx.wait();
    console.log("✅ Loan requested successfully");
    
    // Check updated CDP info
    const updatedCDPInfo = await CDPVault.getCDPInfo(user1.address);
    console.log("Updated CDP Info after loan:", {
      collateralAmount: ethers.formatEther(updatedCDPInfo[0]),
      debtAmount: ethers.formatEther(updatedCDPInfo[1]),
      creditScore: updatedCDPInfo[2].toString(),
      apr: updatedCDPInfo[3].toString(),
      dueDate: new Date(Number(updatedCDPInfo[4]) * 1000).toLocaleString(),
      isActive: updatedCDPInfo[5]
    });
    
    // Check user's debt token balance
    const debtBalance = await DebtToken.balanceOf(user1.address);
    console.log("User1 debt token balance:", ethers.formatEther(debtBalance));
    
  } catch (error) {
    console.error("❌ Error in test case 1:", error.message);
  }
  
  console.log("\n🏦 Test Case 2: Existing CDP User Requesting Additional Loan");
  
  // Use deployer who already has a CDP
  try {
    const additionalLoan = ethers.parseEther("200");
    console.log("Requesting additional loan of", ethers.formatEther(additionalLoan), "tokens");
    
    // Check current state
    const currentCDP = await CDPVault.getCDPInfo(deployer.address);
    console.log("Current CDP before additional loan:", {
      collateralAmount: ethers.formatEther(currentCDP[0]),
      debtAmount: ethers.formatEther(currentCDP[1])
    });
    
    // Request additional loan
    const additionalLoanTx = await CDPVault.connect(deployer).requestLoan(additionalLoan);
    await additionalLoanTx.wait();
    console.log("✅ Additional loan requested successfully");
    
    // Check updated CDP
    const updatedCDP = await CDPVault.getCDPInfo(deployer.address);
    console.log("Updated CDP after additional loan:", {
      collateralAmount: ethers.formatEther(updatedCDP[0]),
      debtAmount: ethers.formatEther(updatedCDP[1])
    });
    
  } catch (error) {
    console.error("❌ Error in test case 2:", error.message);
    
    // If additional loan fails, it might be due to collateral ratio
    if (error.message.includes("Insufficient collateral ratio")) {
      console.log("💡 Insufficient collateral ratio - need to add more collateral or request smaller loan");
      
      // Try with smaller amount
      try {
        const smallerLoan = ethers.parseEther("50");
        console.log("Trying smaller loan of", ethers.formatEther(smallerLoan), "tokens");
        const smallLoanTx = await CDPVault.connect(deployer).requestLoan(smallerLoan);
        await smallLoanTx.wait();
        console.log("✅ Smaller additional loan succeeded");
      } catch (smallLoanError) {
        console.error("❌ Even smaller loan failed:", smallLoanError.message);
      }
    }
  }
  
  console.log("\n📋 Summary:");
  console.log("- New users should use openCDP() first, then requestLoan()");
  console.log("- Existing CDP users should only use requestLoan()");
  console.log("- Frontend should check for existing CDP before deciding which flow to use");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
