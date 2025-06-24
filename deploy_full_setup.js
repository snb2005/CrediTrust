const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CrediTrust contracts with full setup...");

  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance));

  // Deploy mock tokens for testing
  console.log("\n1. Deploying mock tokens...");
  
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  
  const collateralToken = await MockERC20.deploy("Collateral Token", "COLL", 18);
  await collateralToken.waitForDeployment();
  console.log("Collateral Token deployed to:", await collateralToken.getAddress());

  const debtToken = await MockERC20.deploy("Debt Token", "DEBT", 18);
  await debtToken.waitForDeployment();
  console.log("Debt Token deployed to:", await debtToken.getAddress());

  // Chainlink VRF configuration for testing
  const vrfCoordinator = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B"; // Mock VRF coordinator
  const keyHash = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f9c808f9e8ea8c7ad12c3";
  const subscriptionId = 1;

  // Deploy CDPVault
  console.log("\n2. Deploying CDPVault...");
  const CDPVault = await hre.ethers.getContractFactory("CDPVault");
  const cdpVault = await CDPVault.deploy(
    await collateralToken.getAddress(),
    await debtToken.getAddress(),
    vrfCoordinator,
    subscriptionId,
    keyHash
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

  // COMPREHENSIVE TOKEN SETUP FOR BOTH LENDING AND BORROWING
  console.log("\n5. Setting up tokens for both lending and borrowing...");
  
  const userMintAmount = hre.ethers.parseUnits("10000", 18); // 10,000 tokens per user
  const vaultLiquidityAmount = hre.ethers.parseUnits("50000", 18); // 50,000 tokens for vault liquidity

  // Mint tokens to all test users (for lending and collateral)
  const users = [deployer, user1, user2, user3];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Mint collateral tokens (ETH) to users
    await collateralToken.mint(user.address, userMintAmount);
    
    // Mint debt tokens (USDC) to users for lending
    await debtToken.mint(user.address, userMintAmount);
    
    console.log(`✅ Minted ${hre.ethers.formatEther(userMintAmount)} tokens to ${user.address}`);
  }

  // CRITICAL: Mint debt tokens to CDP Vault for borrowing liquidity
  await debtToken.mint(await cdpVault.getAddress(), vaultLiquidityAmount);
  console.log(`✅ Minted ${hre.ethers.formatEther(vaultLiquidityAmount)} DEBT tokens to CDP Vault for borrowing liquidity`);

  // Optional: Set up initial lender to provide liquidity
  console.log("\n6. Setting up initial lender for liquidity...");
  const initialLendAmount = hre.ethers.parseUnits("5000", 18); // Reduced to 5000
  
  // Approve and stake as initial lender (using deployer account)
  await debtToken.approve(await cdpVault.getAddress(), initialLendAmount);
  await cdpVault.stakeLender(initialLendAmount);
  console.log(`✅ Initial lender staked ${hre.ethers.formatEther(initialLendAmount)} tokens`);

  // Test the full flow
  console.log("\n7. Testing complete flow...");
  
  // Test CDP opening with user1
  const collateralAmount = hre.ethers.parseUnits("1000", 18);
  const creditScore = 700;
  
  await collateralToken.connect(user1).approve(await cdpVault.getAddress(), collateralAmount);
  await cdpVault.connect(user1).openCDP(collateralAmount, creditScore);
  console.log("✅ User1 opened CDP successfully");
  
  // Test borrowing
  const loanAmount = hre.ethers.parseUnits("100", 18);
  await cdpVault.connect(user1).requestLoan(loanAmount);
  console.log("✅ User1 borrowed successfully");
  
  // Test lending with user2
  const lendAmount = hre.ethers.parseUnits("500", 18);
  await debtToken.connect(user2).approve(await cdpVault.getAddress(), lendAmount);
  await cdpVault.connect(user2).stakeLender(lendAmount);
  console.log("✅ User2 lent successfully");

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

  console.log("\n8. Deployment Summary:");
  console.log("====================");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-info.json");

  console.log("\n✅ COMPLETE SETUP FINISHED!");
  console.log("🏦 Both lending and borrowing are now ready to use");
  console.log("📊 Vault has liquidity for borrowers");
  console.log("💰 Users have tokens for lending and collateral");
  
  console.log("\n📋 Frontend addresses to use:");
  console.log(`CDP_VAULT: '${await cdpVault.getAddress()}'`);
  console.log(`COLLATERAL_TOKEN: '${await collateralToken.getAddress()}'`);
  console.log(`DEBT_TOKEN: '${await debtToken.getAddress()}'`);
  console.log(`CREDIT_AGENT: '${await creditAgent.getAddress()}'`);
  console.log(`X402_ROUTER: '${await router.getAddress()}'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
