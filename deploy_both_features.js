const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CrediTrust contracts for both lending and borrowing...");

  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy mock tokens for testing
  console.log("\n1. Deploying mock tokens...");
  
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  
  const collateralToken = await MockERC20.deploy("Mock ETH", "mETH", 18);
  await collateralToken.waitForDeployment();
  console.log("Collateral Token deployed to:", await collateralToken.getAddress());

  const debtToken = await MockERC20.deploy("Mock USDC", "mUSDC", 18);
  await debtToken.waitForDeployment();
  console.log("Debt Token deployed to:", await debtToken.getAddress());

  // Deploy CDPVault
  console.log("\n2. Deploying CDPVault...");
  const CDPVault = await hre.ethers.getContractFactory("CDPVault");
  const cdpVault = await CDPVault.deploy(
    await collateralToken.getAddress(),
    await debtToken.getAddress(),
    "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B", // Mock VRF coordinator
    1, // subscription ID
    "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f9c808f9e8ea8c7ad12c3" // gas lane
  );
  await cdpVault.waitForDeployment();
  console.log("CDPVault deployed to:", await cdpVault.getAddress());

  // Deploy CreditAgent
  console.log("\n3. Deploying CreditAgent...");
  const CreditAgent = await hre.ethers.getContractFactory("CreditAgent");
  const creditAgent = await CreditAgent.deploy(await cdpVault.getAddress());
  await creditAgent.waitForDeployment();
  console.log("CreditAgent deployed to:", await creditAgent.getAddress());

  // Deploy x402Router
  console.log("\n4. Deploying x402Router...");
  const x402Router = await hre.ethers.getContractFactory("x402Router");
  const router = await x402Router.deploy(
    50, // 0.5% fee rate
    deployer.address, // Fee recipient
    hre.ethers.parseUnits("0.01", 18), // Min payment: 0.01 tokens
    hre.ethers.parseUnits("1000", 18) // Max payment: 1000 tokens
  );
  await router.waitForDeployment();
  console.log("x402Router deployed to:", await router.getAddress());

  // SETUP FOR BOTH LENDING AND BORROWING
  console.log("\n5. Setting up tokens for comprehensive testing...");
  
  const userMintAmount = hre.ethers.parseUnits("10000", 18); 
  const vaultLiquidityAmount = hre.ethers.parseUnits("100000", 18); // Large amount for borrowing

  // Mint tokens to all test users
  const users = [deployer, user1, user2, user3];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Mint collateral tokens (mETH) to users
    await collateralToken.mint(user.address, userMintAmount);
    
    // Mint debt tokens (mUSDC) to users for lending
    await debtToken.mint(user.address, userMintAmount);
    
    console.log(`✅ User ${i}: Minted ${hre.ethers.formatEther(userMintAmount)} mETH and mUSDC`);
  }

  // CRITICAL: Mint debt tokens to CDP Vault for borrowing liquidity
  await debtToken.mint(await cdpVault.getAddress(), vaultLiquidityAmount);
  console.log(`✅ CDP Vault: Minted ${hre.ethers.formatEther(vaultLiquidityAmount)} mUSDC for borrowing liquidity`);

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    contracts: {
      collateralToken: await collateralToken.getAddress(),
      debtToken: await debtToken.getAddress(),
      cdpVault: await cdpVault.getAddress(),
      creditAgent: await creditAgent.getAddress(),
      x402Router: await router.getAddress(),
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n6. Deployment Summary:");
  console.log("====================");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-info.json");

  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("🏦 Ready for both lending and borrowing");
  console.log("💰 Users have mETH (collateral) and mUSDC (for lending)");
  console.log("🏛️  CDP Vault has mUSDC liquidity for borrowers");
  
  console.log("\n📋 Copy these addresses to wagmi.js:");
  console.log(`CDP_VAULT: '${await cdpVault.getAddress()}'`);
  console.log(`COLLATERAL_TOKEN: '${await collateralToken.getAddress()}'`);
  console.log(`DEBT_TOKEN: '${await debtToken.getAddress()}'`);
  console.log(`CREDIT_AGENT: '${await creditAgent.getAddress()}'`);
  console.log(`X402_ROUTER: '${await router.getAddress()}'`);

  console.log("\n🧪 Test both features:");
  console.log("- Lending: Users can stake mUSDC to earn rewards");
  console.log("- Borrowing: Users can deposit mETH collateral and borrow mUSDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
