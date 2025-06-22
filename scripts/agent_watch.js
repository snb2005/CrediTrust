const { ethers } = require('ethers');
require('dotenv').config();

class CreditAgent {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        // Contract addresses (to be updated after deployment)
        this.contracts = {
            cdpVault: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_CDP_VAULT,
            creditAgent: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT_AGENT,
            x402Router: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_X402_ROUTER
        };
        
        this.isRunning = false;
        this.monitoringInterval = 30000; // 30 seconds
    }

    async initialize() {
        try {
            console.log('🤖 Initializing CrediTrust Agent...');
            
            // Load contract ABIs (simplified for demo)
            const cdpVaultABI = [
                "function getCDPInfo(address) view returns (uint256, uint256, uint256, uint256, uint256, bool, address)",
                "function isOverdue(address) view returns (bool)",
                "function calculateAccruedInterest(address) view returns (uint256)",
                "function liquidateCDP(address)"
            ];
            
            const creditAgentABI = [
                "function getTaskInfo(address) view returns (uint256, uint256, bool, uint8)",
                "function createTask(address, uint8)",
                "function needsAttention(address) view returns (bool)",
                "function getActiveBorrowers() view returns (address[])"
            ];

            this.cdpVault = new ethers.Contract(this.contracts.cdpVault, cdpVaultABI, this.wallet);
            this.creditAgent = new ethers.Contract(this.contracts.creditAgent, creditAgentABI, this.wallet);
            
            console.log('✅ Agent initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Agent initialization failed:', error.message);
            return false;
        }
    }

    async startMonitoring() {
        if (this.isRunning) {
            console.log('⚠️ Agent is already running');
            return;
        }

        console.log('🚀 Starting credit monitoring agent...');
        this.isRunning = true;

        // Main monitoring loop
        const monitoringLoop = async () => {
            if (!this.isRunning) {
                return;
            }

            try {
                await this.performMonitoringTasks();
            } catch (error) {
                console.error('❌ Monitoring error:', error.message);
            }

            // Schedule next iteration
            setTimeout(monitoringLoop, this.monitoringInterval);
        };

        // Start the loop
        monitoringLoop();
    }

    async performMonitoringTasks() {
        console.log('🔍 Performing monitoring tasks...');

        try {
            // Get all active borrowers
            const activeBorrowers = await this.getActiveBorrowers();
            console.log(`📊 Monitoring ${activeBorrowers.length} active borrowers`);

            for (const borrower of activeBorrowers) {
                await this.monitorBorrower(borrower);
            }

            // Perform market analysis
            await this.performMarketAnalysis();

        } catch (error) {
            console.error('❌ Monitoring task error:', error.message);
        }
    }

    async getActiveBorrowers() {
        try {
            // In a real implementation, this would call the smart contract
            // For demo purposes, we'll simulate with some addresses
            return [
                '0x742d35Cc6634C0532925a3b8D0c4ED2A9F0E7E9C',
                '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
            ];
        } catch (error) {
            console.error('Error fetching active borrowers:', error.message);
            return [];
        }
    }

    async monitorBorrower(borrowerAddress) {
        try {
            console.log(`👤 Monitoring borrower: ${borrowerAddress}`);

            // Check CDP status
            const cdpInfo = await this.getCDPInfo(borrowerAddress);
            
            if (!cdpInfo.isActive) {
                console.log(`ℹ️ CDP not active for ${borrowerAddress}`);
                return;
            }

            // Check if overdue
            const isOverdue = await this.checkOverdueStatus(borrowerAddress);
            
            if (isOverdue) {
                console.log(`⚠️ OVERDUE: ${borrowerAddress}`);
                await this.handleOverdueLoan(borrowerAddress);
            }

            // Check interest accrual
            await this.checkInterestAccrual(borrowerAddress);

            // Check collateral ratio
            await this.checkCollateralRatio(borrowerAddress, cdpInfo);

        } catch (error) {
            console.error(`Error monitoring borrower ${borrowerAddress}:`, error.message);
        }
    }

    async getCDPInfo(borrowerAddress) {
        // Simulate CDP info for demo
        return {
            collateralAmount: ethers.parseUnits('1000', 18),
            debtAmount: ethers.parseUnits('800', 18),
            creditScore: 650,
            apr: 1200, // 12%
            dueDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
            isActive: true,
            assignedLender: '0x0000000000000000000000000000000000000000'
        };
    }

    async checkOverdueStatus(borrowerAddress) {
        // Simulate overdue check
        return Math.random() < 0.1; // 10% chance of being overdue
    }

    async handleOverdueLoan(borrowerAddress) {
        console.log(`🚨 Handling overdue loan for ${borrowerAddress}`);

        try {
            // Send reminder notification
            await this.sendReminderNotification(borrowerAddress);

            // Check if liquidation is needed
            const shouldLiquidate = await this.shouldLiquidate(borrowerAddress);
            
            if (shouldLiquidate) {
                console.log(`💥 Initiating liquidation for ${borrowerAddress}`);
                await this.initiateLiquidation(borrowerAddress);
            }

        } catch (error) {
            console.error(`Error handling overdue loan:`, error.message);
        }
    }

    async sendReminderNotification(borrowerAddress) {
        console.log(`📧 Sending reminder to ${borrowerAddress}`);
        
        // In a real implementation, this would:
        // 1. Send email/SMS notification
        // 2. Create on-chain reminder record
        // 3. Update reminder count
        
        // Simulate API call to notification service
        const reminderData = {
            borrower: borrowerAddress,
            type: 'payment_reminder',
            message: 'Your loan payment is overdue. Please make a payment to avoid liquidation.',
            timestamp: new Date().toISOString()
        };

        console.log(`✅ Reminder sent:`, reminderData);
        return true;
    }

    async shouldLiquidate(borrowerAddress) {
        // Implement liquidation logic
        const cdpInfo = await this.getCDPInfo(borrowerAddress);
        const collateralRatio = Number(cdpInfo.collateralAmount) / Number(cdpInfo.debtAmount);
        
        // Liquidate if collateral ratio is below 120% (1.2)
        const shouldLiquidate = collateralRatio < 1.2;
        
        console.log(`📊 Collateral ratio for ${borrowerAddress}: ${collateralRatio.toFixed(2)}`);
        
        return shouldLiquidate;
    }

    async initiateLiquidation(borrowerAddress) {
        console.log(`⚡ Initiating liquidation for ${borrowerAddress}`);
        
        try {
            // In a real implementation, this would call the smart contract
            // For demo, we'll simulate the liquidation process
            
            const liquidationData = {
                borrower: borrowerAddress,
                liquidator: this.wallet.address,
                timestamp: new Date().toISOString(),
                reason: 'Collateral ratio below threshold'
            };

            console.log(`💥 Liquidation initiated:`, liquidationData);
            
            // Send liquidation notification
            await this.sendLiquidationNotification(borrowerAddress);
            
            return true;
        } catch (error) {
            console.error(`Liquidation failed:`, error.message);
            return false;
        }
    }

    async sendLiquidationNotification(borrowerAddress) {
        console.log(`📱 Sending liquidation notification to ${borrowerAddress}`);
        
        const notificationData = {
            borrower: borrowerAddress,
            type: 'liquidation_notice',
            message: 'Your collateral has been liquidated due to insufficient collateral ratio.',
            timestamp: new Date().toISOString()
        };

        console.log(`🔔 Liquidation notification sent:`, notificationData);
    }

    async checkInterestAccrual(borrowerAddress) {
        // Simulate interest accrual check
        const accruedInterest = Math.random() * 100; // Random interest amount
        
        if (accruedInterest > 50) {
            console.log(`💰 Significant interest accrued for ${borrowerAddress}: $${accruedInterest.toFixed(2)}`);
        }
    }

    async checkCollateralRatio(borrowerAddress, cdpInfo) {
        const collateralRatio = Number(cdpInfo.collateralAmount) / Number(cdpInfo.debtAmount);
        
        if (collateralRatio < 1.5) {
            console.log(`⚠️ LOW COLLATERAL WARNING for ${borrowerAddress}: ${collateralRatio.toFixed(2)}`);
            await this.sendCollateralWarning(borrowerAddress, collateralRatio);
        }
    }

    async sendCollateralWarning(borrowerAddress, ratio) {
        console.log(`⚠️ Sending collateral warning to ${borrowerAddress}`);
        
        const warningData = {
            borrower: borrowerAddress,
            type: 'collateral_warning',
            collateralRatio: ratio,
            message: `Your collateral ratio is ${ratio.toFixed(2)}. Consider adding more collateral to avoid liquidation.`,
            timestamp: new Date().toISOString()
        };

        console.log(`📧 Collateral warning sent:`, warningData);
    }

    async performMarketAnalysis() {
        console.log('📈 Performing market analysis...');
        
        try {
            // Simulate market data analysis
            const marketData = {
                totalVolume: Math.random() * 1000000,
                averageAPR: 8 + Math.random() * 12,
                liquidationRate: Math.random() * 5,
                activeLoans: Math.floor(Math.random() * 500) + 100,
                timestamp: new Date().toISOString()
            };

            console.log(`📊 Market Analysis:`, marketData);

            // Check for market anomalies
            if (marketData.liquidationRate > 3) {
                console.log('🚨 HIGH LIQUIDATION RATE DETECTED');
                await this.handleHighLiquidationRate();
            }

            if (marketData.averageAPR > 18) {
                console.log('📈 HIGH APR ENVIRONMENT DETECTED');
            }

        } catch (error) {
            console.error('Market analysis error:', error.message);
        }
    }

    async handleHighLiquidationRate() {
        console.log('🔧 Implementing risk mitigation measures...');
        
        // In a real implementation, this could:
        // 1. Adjust risk parameters
        // 2. Send alerts to administrators
        // 3. Implement emergency pauses
        // 4. Adjust APR calculations
    }

    async stopMonitoring() {
        console.log('🛑 Stopping credit monitoring agent...');
        this.isRunning = false;
    }

    async getAgentStatus() {
        return {
            isRunning: this.isRunning,
            contracts: this.contracts,
            monitoringInterval: this.monitoringInterval,
            walletAddress: this.wallet.address,
            timestamp: new Date().toISOString()
        };
    }
}

// Agent management functions
async function startAgent() {
    const agent = new CreditAgent();
    
    const initialized = await agent.initialize();
    if (!initialized) {
        console.error('❌ Failed to initialize agent');
        process.exit(1);
    }

    await agent.startMonitoring();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received shutdown signal...');
        await agent.stopMonitoring();
        console.log('✅ Agent stopped successfully');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received termination signal...');
        await agent.stopMonitoring();
        console.log('✅ Agent stopped successfully');
        process.exit(0);
    });

    return agent;
}

// Command line interface
if (require.main === module) {
    console.log('🤖 CrediTrust Agent Starting...');
    console.log('Press Ctrl+C to stop the agent');
    
    startAgent().catch(error => {
        console.error('❌ Agent startup failed:', error.message);
        process.exit(1);
    });
}

module.exports = { CreditAgent, startAgent };
