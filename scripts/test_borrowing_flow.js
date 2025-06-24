const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing borrowing flow comprehensively...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Load deployment info
    const deploymentInfo = require("../deployment-info.json");
    console.log("Using contracts:", deploymentInfo.contracts);
    
    // Get contract instances
    const DebtToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.debtToken);
    const CollateralToken = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.collateralToken);
    const CDPVault = await ethers.getContractAt("CDPVault", deploymentInfo.contracts.cdpVault);
    
    console.log("\n📊 Step 1: Checking initial balances...");
    const initialDebtBalance = await DebtToken.balanceOf(deployer.address);
    const initialCollateralBalance = await CollateralToken.balanceOf(deployer.address);
    const contractDebtBalance = await DebtToken.balanceOf(deploymentInfo.contracts.cdpVault);
    
    console.log("User debt token balance:", ethers.formatEther(initialDebtBalance));
    console.log("User collateral token balance:", ethers.formatEther(initialCollateralBalance));
    console.log("Contract debt token balance:", ethers.formatEther(contractDebtBalance));
    
    // Check if user has existing CDP
    console.log("\n🔍 Step 2: Checking existing CDP...");
    try {
        const existingCDP = await CDPVault.getCDPInfo(deployer.address);
        console.log("Existing CDP:", {
            collateralAmount: ethers.formatEther(existingCDP[0]),
            debtAmount: ethers.formatEther(existingCDP[1]),
            creditScore: existingCDP[2].toString(),
            apr: existingCDP[3].toString(),
            isActive: existingCDP[5]
        });
        
        if (existingCDP[5]) {
            console.log("❗ User already has an active CDP. Skipping CDP creation.");
            
            // Test requesting additional loan
            console.log("\n💰 Step 6: Testing additional loan request...");
            const additionalLoanAmount = ethers.parseEther("500");
            
            try {
                const loanTx = await CDPVault.requestLoan(additionalLoanAmount);
                await loanTx.wait();
                console.log("✅ Additional loan request successful");
                
                // Check updated CDP info
                const updatedCDP = await CDPVault.getCDPInfo(deployer.address);
                console.log("Updated CDP after loan:", {
                    collateralAmount: ethers.formatEther(updatedCDP[0]),
                    debtAmount: ethers.formatEther(updatedCDP[1]),
                    creditScore: updatedCDP[2].toString(),
                    apr: updatedCDP[3].toString(),
                    isActive: updatedCDP[5]
                });
                
            } catch (error) {
                console.error("❌ Additional loan request failed:", error.message);
            }
            
            return;
        }
    } catch (error) {
        console.log("No existing CDP found, proceeding with creation...");
    }
    
    // Ensure contract has enough debt tokens for lending
    console.log("\n💰 Step 3: Ensuring contract liquidity...");
    if (contractDebtBalance < ethers.parseEther("2000")) {
        console.log("Funding contract with debt tokens for lending...");
        const fundAmount = ethers.parseEther("5000");
        const fundTx = await DebtToken.transfer(deploymentInfo.contracts.cdpVault, fundAmount);
        await fundTx.wait();
        console.log("✅ Contract funded with", ethers.formatEther(fundAmount), "debt tokens");
    }
    
    // Test CDP creation
    console.log("\n🏦 Step 4: Testing CDP creation...");
    const collateralAmount = ethers.parseEther("1500"); // $1500 worth
    const creditScore = 700;
    
    try {
        // First approve collateral token
        console.log("Approving collateral tokens...");
        const approvalTx = await CollateralToken.approve(deploymentInfo.contracts.cdpVault, collateralAmount);
        await approvalTx.wait();
        console.log("✅ Collateral approval successful");
        
        // Then open CDP
        console.log("Opening CDP...");
        const cdpTx = await CDPVault.openCDP(collateralAmount, creditScore);
        await cdpTx.wait();
        console.log("✅ CDP creation successful");
        
        // Check CDP info
        const cdpInfo = await CDPVault.getCDPInfo(deployer.address);
        console.log("Created CDP info:", {
            collateralAmount: ethers.formatEther(cdpInfo[0]),
            debtAmount: ethers.formatEther(cdpInfo[1]),
            creditScore: cdpInfo[2].toString(),
            apr: cdpInfo[3].toString(),
            isActive: cdpInfo[5],
            assignedLender: cdpInfo[6]
        });
        
    } catch (error) {
        console.error("❌ CDP creation failed:", error.message);
        return;
    }
    
    // Test loan request
    console.log("\n💰 Step 5: Testing loan request...");
    const loanAmount = ethers.parseEther("1000"); // Borrow $1000
    
    try {
        const loanTx = await CDPVault.requestLoan(loanAmount);
        await loanTx.wait();
        console.log("✅ Loan request successful");
        
        // Check updated balances
        const finalDebtBalance = await DebtToken.balanceOf(deployer.address);
        const finalCDPInfo = await CDPVault.getCDPInfo(deployer.address);
        
        console.log("Final user debt token balance:", ethers.formatEther(finalDebtBalance));
        console.log("Final CDP info:", {
            collateralAmount: ethers.formatEther(finalCDPInfo[0]),
            debtAmount: ethers.formatEther(finalCDPInfo[1]),
            creditScore: finalCDPInfo[2].toString(),
            apr: finalCDPInfo[3].toString(),
            dueDate: new Date(Number(finalCDPInfo[4]) * 1000).toLocaleDateString(),
            isActive: finalCDPInfo[5]
        });
        
        // Calculate what was received
        const received = finalDebtBalance - initialDebtBalance;
        console.log("Net debt tokens received:", ethers.formatEther(received));
        
    } catch (error) {
        console.error("❌ Loan request failed:", error.message);
    }
    
    console.log("\n✅ Borrowing flow test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
