const { ethers } = require('ethers');
require('dotenv').config();

class ChainlinkAutomationTasks {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        // Chainlink Automation Registry (Base Sepolia)
        this.automationRegistry = '0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B';
        
        this.tasks = new Map();
        this.isRunning = false;
    }

    async initialize() {
        console.log('🔗 Initializing Chainlink Automation Tasks...');
        
        try {
            // Register upkeep tasks
            await this.registerAutomationTasks();
            console.log('✅ Automation tasks registered successfully');
            return true;
        } catch (error) {
            console.error('❌ Automation initialization failed:', error.message);
            return false;
        }
    }

    async registerAutomationTasks() {
        console.log('📋 Registering automation tasks...');

        const tasks = [
            {
                name: 'RepaymentMonitoring',
                description: 'Monitor loan repayment due dates',
                target: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_CREDIT_AGENT,
                gasLimit: 500000,
                interval: 3600, // 1 hour
                enabled: true
            },
            {
                name: 'LiquidationCheck',
                description: 'Check for loans eligible for liquidation',
                target: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_CDP_VAULT,
                gasLimit: 300000,
                interval: 1800, // 30 minutes
                enabled: true
            },
            {
                name: 'InterestAccrual',
                description: 'Accrue interest on active loans',
                target: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_CDP_VAULT,
                gasLimit: 200000,
                interval: 86400, // 24 hours
                enabled: true
            }
        ];

        for (const task of tasks) {
            await this.registerTask(task);
        }
    }

    async registerTask(taskConfig) {
        console.log(`📝 Registering task: ${taskConfig.name}`);
        
        try {
            // In a real implementation, this would interact with Chainlink Automation Registry
            // For demo purposes, we'll simulate the registration
            
            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const task = {
                id: taskId,
                ...taskConfig,
                status: 'active',
                lastExecution: null,
                executionCount: 0,
                createdAt: new Date().toISOString()
            };

            this.tasks.set(taskId, task);
            
            console.log(`✅ Task registered: ${task.name} (ID: ${taskId})`);
            return taskId;
            
        } catch (error) {
            console.error(`❌ Failed to register task ${taskConfig.name}:`, error.message);
            throw error;
        }
    }

    async startAutomation() {
        if (this.isRunning) {
            console.log('⚠️ Automation is already running');
            return;
        }

        console.log('🚀 Starting Chainlink Automation simulation...');
        this.isRunning = true;

        // Simulate automation execution
        const automationLoop = async () => {
            if (!this.isRunning) return;

            try {
                await this.executeAutomationTasks();
            } catch (error) {
                console.error('❌ Automation execution error:', error.message);
            }

            // Schedule next iteration (check every 30 seconds)
            setTimeout(automationLoop, 30000);
        };

        automationLoop();
    }

    async executeAutomationTasks() {
        const currentTime = Math.floor(Date.now() / 1000);
        
        for (const [taskId, task] of this.tasks) {
            if (!task.enabled || task.status !== 'active') continue;

            const shouldExecute = await this.shouldExecuteTask(task, currentTime);
            
            if (shouldExecute) {
                await this.executeTask(task);
            }
        }
    }

    async shouldExecuteTask(task, currentTime) {
        if (!task.lastExecution) return true;
        
        const lastExecutionTime = new Date(task.lastExecution).getTime() / 1000;
        const timeSinceLastExecution = currentTime - lastExecutionTime;
        
        return timeSinceLastExecution >= task.interval;
    }

    async executeTask(task) {
        console.log(`⚡ Executing task: ${task.name}`);
        
        try {
            let result;
            
            switch (task.name) {
                case 'RepaymentMonitoring':
                    result = await this.executeRepaymentMonitoring();
                    break;
                case 'LiquidationCheck':
                    result = await this.executeLiquidationCheck();
                    break;
                case 'InterestAccrual':
                    result = await this.executeInterestAccrual();
                    break;
                default:
                    console.log(`❓ Unknown task type: ${task.name}`);
                    return;
            }

            // Update task execution info
            task.lastExecution = new Date().toISOString();
            task.executionCount++;
            
            console.log(`✅ Task completed: ${task.name}`, result);
            
        } catch (error) {
            console.error(`❌ Task execution failed: ${task.name}`, error.message);
            
            // In a real implementation, you might want to:
            // 1. Retry failed tasks
            // 2. Send alerts
            // 3. Pause problematic tasks
        }
    }

    async executeRepaymentMonitoring() {
        console.log('📅 Monitoring repayment schedules...');
        
        // Simulate checking repayment due dates
        const borrowersToCheck = [
            '0x742d35Cc6634C0532925a3b8D0c4ED2A9F0E7E9C',
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        ];

        const results = [];
        
        for (const borrower of borrowersToCheck) {
            const isOverdue = Math.random() < 0.2; // 20% chance of being overdue
            
            if (isOverdue) {
                console.log(`⚠️ Overdue payment detected for ${borrower}`);
                
                // Send reminder
                await this.sendPaymentReminder(borrower);
                
                results.push({
                    borrower,
                    status: 'overdue',
                    action: 'reminder_sent'
                });
            } else {
                results.push({
                    borrower,
                    status: 'current',
                    action: 'none'
                });
            }
        }

        return {
            taskType: 'repayment_monitoring',
            borrowersChecked: borrowersToCheck.length,
            overdueCount: results.filter(r => r.status === 'overdue').length,
            results
        };
    }

    async executeLiquidationCheck() {
        console.log('💥 Checking for liquidation opportunities...');
        
        // Simulate liquidation checks
        const cdpsToCheck = [
            {
                borrower: '0x742d35Cc6634C0532925a3b8D0c4ED2A9F0E7E9C',
                collateralRatio: 1.15
            },
            {
                borrower: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                collateralRatio: 1.35
            }
        ];

        const liquidations = [];
        
        for (const cdp of cdpsToCheck) {
            if (cdp.collateralRatio < 1.2) { // Below 120% threshold
                console.log(`🚨 Liquidation triggered for ${cdp.borrower}`);
                
                await this.executeLiquidation(cdp.borrower);
                
                liquidations.push({
                    borrower: cdp.borrower,
                    collateralRatio: cdp.collateralRatio,
                    action: 'liquidated'
                });
            }
        }

        return {
            taskType: 'liquidation_check',
            cdpsChecked: cdpsToCheck.length,
            liquidationsExecuted: liquidations.length,
            liquidations
        };
    }

    async executeInterestAccrual() {
        console.log('💰 Accruing interest on active loans...');
        
        // Simulate interest accrual
        const activeLoans = [
            {
                borrower: '0x742d35Cc6634C0532925a3b8D0c4ED2A9F0E7E9C',
                principal: 1000,
                apr: 12
            },
            {
                borrower: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                principal: 1500,
                apr: 15
            }
        ];

        const accruedInterests = [];
        
        for (const loan of activeLoans) {
            // Calculate daily interest
            const dailyRate = loan.apr / 100 / 365;
            const dailyInterest = loan.principal * dailyRate;
            
            console.log(`💵 Accrued ${dailyInterest.toFixed(4)} for ${loan.borrower}`);
            
            accruedInterests.push({
                borrower: loan.borrower,
                dailyInterest: dailyInterest.toFixed(4),
                apr: loan.apr
            });
        }

        return {
            taskType: 'interest_accrual',
            loansProcessed: activeLoans.length,
            totalInterestAccrued: accruedInterests.reduce((sum, ai) => sum + parseFloat(ai.dailyInterest), 0),
            accruedInterests
        };
    }

    async sendPaymentReminder(borrowerAddress) {
        console.log(`📧 Sending payment reminder to ${borrowerAddress}`);
        
        // In a real implementation, this would:
        // 1. Call the smart contract to log the reminder
        // 2. Send email/SMS notification
        // 3. Update the reminder count
        
        const reminderData = {
            borrower: borrowerAddress,
            reminderType: 'payment_due',
            timestamp: new Date().toISOString(),
            message: 'Your loan payment is due soon. Please make a payment to avoid penalties.'
        };

        console.log(`✉️ Reminder sent:`, reminderData);
        return reminderData;
    }

    async executeLiquidation(borrowerAddress) {
        console.log(`💥 Executing liquidation for ${borrowerAddress}`);
        
        // Simulate liquidation process
        const liquidationData = {
            borrower: borrowerAddress,
            liquidator: this.wallet.address,
            timestamp: new Date().toISOString(),
            reason: 'Collateral ratio below threshold'
        };

        // In a real implementation, this would call the smart contract
        console.log(`⚡ Liquidation executed:`, liquidationData);
        
        return liquidationData;
    }

    async pauseTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.enabled = false;
            console.log(`⏸️ Task paused: ${task.name}`);
        }
    }

    async resumeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.enabled = true;
            console.log(`▶️ Task resumed: ${task.name}`);
        }
    }

    async removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.delete(taskId);
            console.log(`🗑️ Task removed: ${task.name}`);
        }
    }

    async getTaskStatus() {
        const taskStatuses = [];
        
        for (const [taskId, task] of this.tasks) {
            taskStatuses.push({
                id: taskId,
                name: task.name,
                status: task.status,
                enabled: task.enabled,
                executionCount: task.executionCount,
                lastExecution: task.lastExecution,
                nextExecution: task.lastExecution ? 
                    new Date(new Date(task.lastExecution).getTime() + task.interval * 1000).toISOString() : 
                    'pending'
            });
        }

        return {
            isRunning: this.isRunning,
            totalTasks: this.tasks.size,
            activeTasks: taskStatuses.filter(t => t.enabled).length,
            tasks: taskStatuses
        };
    }

    async stopAutomation() {
        console.log('🛑 Stopping Chainlink Automation...');
        this.isRunning = false;
    }
}

// Main execution
async function startAutomationTasks() {
    const automation = new ChainlinkAutomationTasks();
    
    const initialized = await automation.initialize();
    if (!initialized) {
        console.error('❌ Failed to initialize automation');
        process.exit(1);
    }

    await automation.startAutomation();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received shutdown signal...');
        await automation.stopAutomation();
        console.log('✅ Automation stopped successfully');
        process.exit(0);
    });

    return automation;
}

// Command line interface
if (require.main === module) {
    console.log('🔗 CrediTrust Chainlink Automation Starting...');
    console.log('Press Ctrl+C to stop automation');
    
    startAutomationTasks().catch(error => {
        console.error('❌ Automation startup failed:', error.message);
        process.exit(1);
    });
}

module.exports = { ChainlinkAutomationTasks, startAutomationTasks };
