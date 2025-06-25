const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing contract deployment status...");
    
    // Get deployment info
    const deploymentInfo = require('./deployment-info.json');
    const [deployer] = await ethers.getSigners();
    
    console.log("📋 Deployment info:");
    console.log("CDP Vault address:", deploymentInfo.contracts.cdpVault);
    
    // Test basic contract interaction
    const cdpVaultAddress = deploymentInfo.contracts.cdpVault;
    
    // Check if contract exists by getting code
    const provider = ethers.provider;
    const code = await provider.getCode(cdpVaultAddress);
    console.log("Contract code length:", code.length);
    
    if (code === "0x") {
        console.log("❌ No contract deployed at this address!");
        return;
    } else {
        console.log("✅ Contract exists at address");
    }
    
    // Try to attach the contract
    const CDPVault = await ethers.getContractFactory("CDPVault");
    const cdpVault = CDPVault.attach(cdpVaultAddress);
    
    // Test a simple read call
    try {
        console.log("🔧 Testing LIQUIDATION_THRESHOLD read...");
        const liquidationThreshold = await cdpVault.LIQUIDATION_THRESHOLD();
        console.log("✅ LIQUIDATION_THRESHOLD:", liquidationThreshold.toString());
    } catch (error) {
        console.log("❌ Error reading LIQUIDATION_THRESHOLD:", error.message);
    }
    
    // Test token addresses
    try {
        console.log("🔧 Testing collateralToken read...");
        const collateralTokenAddr = await cdpVault.collateralToken();
        console.log("✅ Collateral Token:", collateralTokenAddr);
    } catch (error) {
        console.log("❌ Error reading collateralToken:", error.message);
    }
    
    // Test getCDPInfo for zero address (should return zeros)
    try {
        console.log("🔧 Testing getCDPInfo for zero address...");
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const cdpInfo = await cdpVault.getCDPInfo(zeroAddress);
        console.log("✅ getCDPInfo works! Result:", {
            collateralAmount: cdpInfo[0].toString(),
            debtAmount: cdpInfo[1].toString(),
            creditScore: cdpInfo[2].toString(),
            apr: cdpInfo[3].toString(),
            dueDate: cdpInfo[4].toString(),
            isActive: cdpInfo[5],
            assignedLender: cdpInfo[6]
        });
    } catch (error) {
        console.log("❌ Error with getCDPInfo:", error.message);
        console.log("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    });
