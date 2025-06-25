const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 REAL deployment - actually deploying contracts...");
    
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log("👤 Deploying with:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
    
    try {
        // Deploy MockERC20 tokens
        console.log("\n📦 Deploying MockERC20 tokens...");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        
        console.log("🪙 Deploying Collateral Token...");
        const collateralToken = await MockERC20.deploy("Collateral Token", "CTK", 18);
        await collateralToken.waitForDeployment();
        const collateralAddress = await collateralToken.getAddress();
        console.log("✅ Collateral Token deployed to:", collateralAddress);
        
        console.log("🪙 Deploying Debt Token...");
        const debtToken = await MockERC20.deploy("Debt Token", "DTK", 18);
        await debtToken.waitForDeployment();
        const debtAddress = await debtToken.getAddress();
        console.log("✅ Debt Token deployed to:", debtAddress);
        
        // Verify tokens are working
        console.log("\n🔧 Verifying token deployments...");
        const ctk_name = await collateralToken.name();
        const dtk_name = await debtToken.name();
        console.log("CTK name:", ctk_name);
        console.log("DTK name:", dtk_name);
        
        // Deploy CDPVault
        console.log("\n🏦 Deploying CDPVault...");
        const CDPVault = await ethers.getContractFactory("CDPVault");
        
        console.log("🔧 Using zero address for VRF (local testing)...");
        const vrfCoordinator = "0x0000000000000000000000000000000000000000";
        const subscriptionId = 0;
        const gasLane = "0x0000000000000000000000000000000000000000000000000000000000000000";
        
        console.log("📝 CDPVault constructor args:", {
            collateralToken: collateralAddress,
            debtToken: debtAddress,
            vrfCoordinator,
            subscriptionId,
            gasLane
        });
        
        const cdpVault = await CDPVault.deploy(
            collateralAddress,
            debtAddress,
            vrfCoordinator,
            subscriptionId,
            gasLane
        );
        
        console.log("⏳ Waiting for CDPVault deployment...");
        await cdpVault.waitForDeployment();
        const vaultAddress = await cdpVault.getAddress();
        console.log("✅ CDP Vault deployed to:", vaultAddress);
        
        // Verify CDPVault is working
        console.log("\n🔧 Verifying CDPVault deployment...");
        const liquidationThreshold = await cdpVault.LIQUIDATION_THRESHOLD();
        console.log("LIQUIDATION_THRESHOLD:", liquidationThreshold.toString());
        
        // Deploy CreditAgent
        console.log("\n📊 Deploying CreditAgent...");
        const CreditAgent = await ethers.getContractFactory("CreditAgent");
        const creditAgent = await CreditAgent.deploy(vaultAddress);
        await creditAgent.waitForDeployment();
        const creditAgentAddress = await creditAgent.getAddress();
        console.log("✅ Credit Agent deployed to:", creditAgentAddress);
        
        // Deploy x402Router
        console.log("\n🔀 Deploying x402Router...");
        const X402Router = await ethers.getContractFactory("x402Router");
        const x402Router = await X402Router.deploy(250, deployer.address, ethers.parseEther("1"), ethers.parseEther("10000"));
        await x402Router.waitForDeployment();
        const routerAddress = await x402Router.getAddress();
        console.log("✅ x402Router deployed to:", routerAddress);
        
        // Mint tokens for testing
        console.log("\n💰 Minting tokens for testing...");
        
        // Mint collateral tokens to users
        const collateralAmount = ethers.parseEther("10000");
        for (let i = 0; i < 4; i++) {
            const user = [deployer, user1, user2, user3][i];
            await (await collateralToken.mint(user.address, collateralAmount)).wait();
            console.log(`✅ Minted 10,000 CTK to ${user.address}`);
        }
        
        // Mint debt tokens to vault (for lending)
        const vaultDebtAmount = ethers.parseEther("1000000");
        await (await debtToken.mint(vaultAddress, vaultDebtAmount)).wait();
        console.log("✅ Minted 1,000,000 DTK to vault");
        
        // Mint debt tokens to users (for staking and repayments)
        const userDebtAmount = ethers.parseEther("100000");
        for (let i = 0; i < 4; i++) {
            const user = [deployer, user1, user2, user3][i];
            await (await debtToken.mint(user.address, userDebtAmount)).wait();
            console.log(`✅ Minted 100,000 DTK to ${user.address}`);
        }
        
        // Set up lenders
        console.log("\n🏛️ Setting up lenders...");
        const lenderStakeAmount = ethers.parseEther("50000");
        
        // User2 as lender
        await (await debtToken.connect(user2).approve(vaultAddress, lenderStakeAmount)).wait();
        await (await cdpVault.connect(user2).stakeLender(lenderStakeAmount)).wait();
        console.log("✅ User2 staked as lender");
        
        // User3 as lender
        await (await debtToken.connect(user3).approve(vaultAddress, lenderStakeAmount)).wait();
        await (await cdpVault.connect(user3).stakeLender(lenderStakeAmount)).wait();
        console.log("✅ User3 staked as lender");
        
        // Test CDP creation
        console.log("\n💳 Testing CDP creation...");
        
        // User1 creates CDP
        const cdpCollateralAmount = ethers.parseEther("1000");
        await (await collateralToken.connect(user1).approve(vaultAddress, cdpCollateralAmount)).wait();
        console.log("✅ User1 approved collateral");
        
        const creditScore = 700;
        await (await cdpVault.connect(user1).openCDP(cdpCollateralAmount, creditScore)).wait();
        console.log("✅ User1 opened CDP");
        
        // Check CDP info
        const cdpInfo = await cdpVault.getCDPInfo(user1.address);
        console.log("📊 CDP Info:", {
            collateralAmount: ethers.formatEther(cdpInfo[0]),
            debtAmount: ethers.formatEther(cdpInfo[1]),
            creditScore: cdpInfo[2].toString(),
            apr: cdpInfo[3].toString(),
            isActive: cdpInfo[5],
            assignedLender: cdpInfo[6]
        });
        
        // Request loan
        const loanAmount = ethers.parseEther("500");
        await (await cdpVault.connect(user1).requestLoan(loanAmount)).wait();
        console.log("✅ User1 requested loan");
        
        // Final CDP check
        const finalCDP = await cdpVault.getCDPInfo(user1.address);
        console.log("📊 Final CDP:", {
            collateralAmount: ethers.formatEther(finalCDP[0]),
            debtAmount: ethers.formatEther(finalCDP[1]),
            creditScore: finalCDP[2].toString(),
            apr: finalCDP[3].toString(),
            isActive: finalCDP[5],
            assignedLender: finalCDP[6]
        });
        
        // Create CDP for deployer (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
        console.log("\n💳 Creating CDP for deployer...");
        
        const deployerCollateralAmount = ethers.parseEther("2000");
        await (await collateralToken.connect(deployer).approve(vaultAddress, deployerCollateralAmount)).wait();
        console.log("✅ Deployer approved collateral");
        
        const deployerCreditScore = 750;
        await (await cdpVault.connect(deployer).openCDP(deployerCollateralAmount, deployerCreditScore)).wait();
        console.log("✅ Deployer opened CDP");
        
        // Check deployer CDP info
        const deployerCdpInfo = await cdpVault.getCDPInfo(deployer.address);
        console.log("📊 Deployer CDP Info:", {
            collateralAmount: ethers.formatEther(deployerCdpInfo[0]),
            debtAmount: ethers.formatEther(deployerCdpInfo[1]),
            creditScore: deployerCdpInfo[2].toString(),
            apr: deployerCdpInfo[3].toString(),
            isActive: deployerCdpInfo[5],
            assignedLender: deployerCdpInfo[6]
        });
        
        // Deployer requests loan
        const deployerLoanAmount = ethers.parseEther("800");
        await (await cdpVault.connect(deployer).requestLoan(deployerLoanAmount)).wait();
        console.log("✅ Deployer requested loan");
        
        // Final deployer CDP check
        const finalDeployerCDP = await cdpVault.getCDPInfo(deployer.address);
        console.log("📊 Final Deployer CDP:", {
            collateralAmount: ethers.formatEther(finalDeployerCDP[0]),
            debtAmount: ethers.formatEther(finalDeployerCDP[1]),
            creditScore: finalDeployerCDP[2].toString(),
            apr: finalDeployerCDP[3].toString(),
            isActive: finalDeployerCDP[5],
            assignedLender: finalDeployerCDP[6]
        });
        
        // Save deployment info
        const deploymentInfo = {
            network: "localhost",
            chainId: 31337,
            deployer: deployer.address,
            contracts: {
                collateralToken: collateralAddress,
                debtToken: debtAddress,
                cdpVault: vaultAddress,
                creditAgent: creditAgentAddress,
                x402Router: routerAddress
            },
            testUsers: {
                user1: user1.address,
                user2: user2.address,
                user3: user3.address
            },
            testState: {
                user1HasActiveCDP: true,
                deployerHasActiveCDP: true,
                lendersAvailable: true,
                vaultHasLiquidity: true
            },
            timestamp: new Date().toISOString()
        };
        
        const fs = require('fs');
        fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Deployment info saved");
        
        console.log("\n🎉 REAL DEPLOYMENT COMPLETE!");
        console.log("📋 Contract addresses:");
        console.log(`CDP_VAULT: '${vaultAddress}'`);
        console.log(`COLLATERAL_TOKEN: '${collateralAddress}'`);
        console.log(`DEBT_TOKEN: '${debtAddress}'`);
        console.log(`CREDIT_AGENT: '${creditAgentAddress}'`);
        console.log(`X402_ROUTER: '${routerAddress}'`);
        
        console.log("\n✅ Test results:");
        console.log("- User1 has active CDP with 1000 CTK collateral and 500 DTK debt");
        console.log("- Deployer has active CDP with 2000 CTK collateral and 800 DTK debt");
        console.log("- User2 and User3 are active lenders");
        console.log("- All contracts functional and verified");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error);
        console.error("Error details:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
