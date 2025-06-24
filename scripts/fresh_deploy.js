const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Redeploying contracts with proper setup...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Deploy mock tokens first
    console.log("\n1. Deploying mock tokens...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const collateralToken = await MockERC20.deploy("Collateral Token", "COLL", 18);
    await collateralToken.waitForDeployment();
    console.log("Collateral Token deployed to:", await collateralToken.getAddress());
    
    const debtToken = await MockERC20.deploy("Debt Token", "DEBT", 18);
    await debtToken.waitForDeployment();
    console.log("Debt Token deployed to:", await debtToken.getAddress());

    // Deploy CDPVault with mock VRF parameters
    console.log("\n2. Deploying CDPVault...");
    const CDPVault = await ethers.getContractFactory("CDPVault");
    
    // Use mock addresses for VRF (for local testing)
    const mockVRFCoordinator = "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D"; // Mock address
    const mockSubscriptionId = 1;
    const mockGasLane = "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15"; // Mock gas lane
    
    const cdpVault = await CDPVault.deploy(
        await collateralToken.getAddress(),
        await debtToken.getAddress(),
        mockVRFCoordinator,
        mockSubscriptionId,
        mockGasLane
    );
    await cdpVault.waitForDeployment();
    console.log("CDPVault deployed to:", await cdpVault.getAddress());

    // Deploy CreditAgent
    console.log("\n3. Deploying CreditAgent...");
    const CreditAgent = await ethers.getContractFactory("CreditAgent");
    const creditAgent = await CreditAgent.deploy(await cdpVault.getAddress());
    await creditAgent.waitForDeployment();
    console.log("CreditAgent deployed to:", await creditAgent.getAddress());

    // Deploy x402Router  
    console.log("\n4. Deploying x402Router...");
    const X402Router = await ethers.getContractFactory("x402Router");
    const x402Router = await X402Router.deploy(
        50, // 0.5% fee rate
        deployer.address, // fee recipient
        ethers.parseEther("1"), // min payment: 1 token
        ethers.parseEther("10000") // max payment: 10000 tokens
    );
    await x402Router.waitForDeployment();
    console.log("x402Router deployed to:", await x402Router.getAddress());

    // Mint tokens for testing
    console.log("\n5. Minting tokens for testing...");
    const mintAmount = ethers.parseEther("10000");
    
    await collateralToken.mint(deployer.address, mintAmount);
    await debtToken.mint(deployer.address, mintAmount);
    console.log("Minted", ethers.formatEther(mintAmount), "tokens of each type to deployer");

    // Fund the CDP Vault with debt tokens for lending
    console.log("\n6. Funding CDP Vault for lending...");
    const fundAmount = ethers.parseEther("5000");
    await debtToken.transfer(await cdpVault.getAddress(), fundAmount);
    console.log("Transferred", ethers.formatEther(fundAmount), "debt tokens to CDP Vault");

    // Save deployment info
    const deploymentInfo = {
        network: "localhost",
        chainId: 31337,
        deployer: deployer.address,
        contracts: {
            collateralToken: await collateralToken.getAddress(),
            debtToken: await debtToken.getAddress(),
            cdpVault: await cdpVault.getAddress(),
            creditAgent: await creditAgent.getAddress(),
            x402Router: await x402Router.getAddress()
        },
        timestamp: new Date().toISOString()
    };

    // Write deployment info to file
    const fs = require('fs');
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n7. Deployment info saved to deployment-info.json");

    console.log("\n8. Deployment Summary:");
    console.log("====================");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ Fresh deployment completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
