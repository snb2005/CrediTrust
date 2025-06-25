const { ethers } = require('hardhat');
const fs = require('fs');

async function deployForBothFeatures() {
    console.log('🚀 DEPLOYING CREDITRUST - BOTH LENDING & BORROWING');
    console.log('==================================================');
    
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    
    // Step 1: Deploy tokens
    console.log('\n1️⃣  DEPLOYING TOKENS');
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    
    const collateralToken = await MockERC20.deploy('Mock ETH', 'mETH', 18);
    await collateralToken.waitForDeployment();
    const collateralAddress = await collateralToken.getAddress();
    console.log('✅ Collateral Token:', collateralAddress);
    
    const debtToken = await MockERC20.deploy('Mock USDC', 'mUSDC', 18);
    await debtToken.waitForDeployment();
    const debtAddress = await debtToken.getAddress();
    console.log('✅ Debt Token:', debtAddress);
    
    // Step 2: Deploy CDP Vault
    console.log('\n2️⃣  DEPLOYING CDP VAULT');
    const CDPVault = await ethers.getContractFactory('CDPVault');
    const cdpVault = await CDPVault.deploy(
        collateralAddress,
        debtAddress,
        '0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B', // Mock VRF
        1,
        '0xd4bb89654db74673a187bd804519e65e3f71a52bc55f9c808f9e8ea8c7ad12c3'
    );
    await cdpVault.waitForDeployment();
    const vaultAddress = await cdpVault.getAddress();
    console.log('✅ CDP Vault:', vaultAddress);
    
    // Step 3: Deploy other contracts
    console.log('\n3️⃣  DEPLOYING OTHER CONTRACTS');
    const CreditAgent = await ethers.getContractFactory('CreditAgent');
    const creditAgent = await CreditAgent.deploy(vaultAddress);
    await creditAgent.waitForDeployment();
    const agentAddress = await creditAgent.getAddress();
    console.log('✅ Credit Agent:', agentAddress);
    
    const x402Router = await ethers.getContractFactory('x402Router');
    const router = await x402Router.deploy(50, deployer.address, ethers.parseEther('0.01'), ethers.parseEther('1000'));
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log('✅ x402 Router:', routerAddress);
    
    // Step 4: Setup for LENDING (users need tokens to lend)
    console.log('\n4️⃣  SETUP FOR LENDING - Minting tokens to users');
    const userMintAmount = ethers.parseEther('10000');
    const users = [deployer, user1, user2, user3];
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        await collateralToken.mint(user.address, userMintAmount);
        await debtToken.mint(user.address, userMintAmount);
        console.log(`✅ User ${i}: ${ethers.formatEther(userMintAmount)} mETH + mUSDC`);
    }
    
    // Step 5: Setup for BORROWING (vault needs liquidity)
    console.log('\n5️⃣  SETUP FOR BORROWING - Adding vault liquidity');
    const vaultLiquidity = ethers.parseEther('100000');
    await debtToken.mint(vaultAddress, vaultLiquidity);
    console.log(`✅ Vault: ${ethers.formatEther(vaultLiquidity)} mUSDC liquidity`);
    
    // Step 6: Test both features
    console.log('\n6️⃣  TESTING BOTH FEATURES');
    
    // Test lending
    const lendAmount = ethers.parseEther('1000');
    await debtToken.approve(vaultAddress, lendAmount);
    await cdpVault.stakeLender(lendAmount);
    console.log('✅ Lending test: SUCCESS');
    
    // Test that vault has liquidity for borrowing
    const vaultBalance = await debtToken.balanceOf(vaultAddress);
    console.log(`✅ Borrowing test: Vault has ${ethers.formatEther(vaultBalance)} mUSDC liquidity`);
    
    // Step 7: Save deployment info
    console.log('\n7️⃣  SAVING DEPLOYMENT INFO');
    const deploymentInfo = {
        network: 'localhost',
        chainId: 31337,
        deployer: deployer.address,
        contracts: {
            collateralToken: collateralAddress,
            debtToken: debtAddress,
            cdpVault: vaultAddress,
            creditAgent: agentAddress,
            x402Router: routerAddress,
        },
        timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('✅ Deployment info saved');
    
    // Step 8: Results
    console.log('\n🎉 DEPLOYMENT COMPLETE - BOTH FEATURES READY!');
    console.log('=============================================');
    console.log('📋 UPDATE wagmi.js WITH THESE ADDRESSES:');
    console.log(`CDP_VAULT: '${vaultAddress}'`);
    console.log(`COLLATERAL_TOKEN: '${collateralAddress}'`);
    console.log(`DEBT_TOKEN: '${debtAddress}'`);
    console.log(`CREDIT_AGENT: '${agentAddress}'`);
    console.log(`X402_ROUTER: '${routerAddress}'`);
    
    console.log('\n✅ WHAT WORKS NOW:');
    console.log('🏦 LENDING: Users have mUSDC to stake');
    console.log('💸 BORROWING: Vault has mUSDC liquidity');
    console.log('💰 COLLATERAL: Users have mETH for CDP');
    
    return {
        collateralToken: collateralAddress,
        debtToken: debtAddress,
        cdpVault: vaultAddress,
        creditAgent: agentAddress,
        x402Router: routerAddress,
    };
}

deployForBothFeatures()
    .then((addresses) => {
        console.log('\n🚀 Ready to test in frontend with these addresses!');
    })
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
    });
