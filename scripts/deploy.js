const hre = require("hardhat");

async function main() {
  console.log("Deploying CrediTrust contracts...");

  const [deployer] = await hre.ethers.getSigners();
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

  // Chainlink VRF configuration for Base Sepolia
  const vrfCoordinator = process.env.CHAINLINK_VRF_COORDINATOR || "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
  const keyHash = process.env.CHAINLINK_KEY_HASH || "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || 1;

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

  // Mint initial tokens for testing
  console.log("\n5. Minting initial tokens for testing...");
  
  const mintAmount = hre.ethers.parseUnits("10000", 18);
  await collateralToken.mint(deployer.address, mintAmount);
  await debtToken.mint(deployer.address, mintAmount);
  
  console.log("Minted", hre.ethers.formatEther(mintAmount), "tokens to deployer");

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

  console.log("\n7. Next steps:");
  console.log("- Update .env file with contract addresses");
  console.log("- Add VRF subscription consumer");
  console.log("- Fund contracts with LINK tokens for Chainlink services");
  console.log("- Start the backend ML scoring service");
  console.log("- Launch the frontend application");
}

// Contract for mock ERC20 tokens
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
`;

// Write MockERC20 contract if it doesn't exist
const fs = require("fs");
const path = require("path");

if (!fs.existsSync("./contracts/MockERC20.sol")) {
  fs.writeFileSync("./contracts/MockERC20.sol", MockERC20Source);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
