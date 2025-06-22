// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "./CDPVault.sol";

/**
 * @title CreditAgent
 * @dev Handles automated monitoring and actions for credit positions
 */
contract CreditAgent is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    
    CDPVault public immutable cdpVault;
    
    struct MonitoringTask {
        address borrower;
        uint256 nextCheckTime;
        uint256 reminderCount;
        bool isActive;
        TaskType taskType;
    }
    
    enum TaskType {
        REPAYMENT_REMINDER,
        LIQUIDATION_CHECK,
        INTEREST_ACCRUAL
    }
    
    // State variables
    mapping(address => MonitoringTask) public monitoringTasks;
    mapping(address => uint256) public lastReminderSent;
    address[] public activeBorrowers;
    
    uint256 public constant REMINDER_INTERVAL = 7 days; // Send reminder every 7 days
    uint256 public constant MAX_REMINDERS = 3; // Maximum reminders before liquidation
    uint256 public constant GRACE_PERIOD = 3 days; // Grace period after due date
    
    // Events
    event TaskCreated(address indexed borrower, TaskType taskType);
    event ReminderSent(address indexed borrower, uint256 reminderCount);
    event AutoLiquidationTriggered(address indexed borrower);
    event InterestAccrued(address indexed borrower, uint256 amount);
    event AgentActionExecuted(address indexed borrower, string action);

    constructor(address _cdpVault) {
        cdpVault = CDPVault(_cdpVault);
    }

    /**
     * @dev Create monitoring task for a borrower
     * @param _borrower Address of the borrower
     * @param _taskType Type of monitoring task
     */
    function createTask(address _borrower, TaskType _taskType) external onlyOwner {
        require(_borrower != address(0), "Invalid borrower address");
        
        monitoringTasks[_borrower] = MonitoringTask({
            borrower: _borrower,
            nextCheckTime: block.timestamp + REMINDER_INTERVAL,
            reminderCount: 0,
            isActive: true,
            taskType: _taskType
        });
        
        // Add to active borrowers if not already present
        bool found = false;
        for (uint256 i = 0; i < activeBorrowers.length; i++) {
            if (activeBorrowers[i] == _borrower) {
                found = true;
                break;
            }
        }
        if (!found) {
            activeBorrowers.push(_borrower);
        }
        
        emit TaskCreated(_borrower, _taskType);
    }

    /**
     * @dev Chainlink Automation checkUpkeep function
     * @param checkData Data passed to checkUpkeep
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata checkData) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        checkData; // Silence unused parameter warning
        
        address[] memory borrowersNeedingAction = new address[](activeBorrowers.length);
        string[] memory actions = new string[](activeBorrowers.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < activeBorrowers.length; i++) {
            address borrower = activeBorrowers[i];
            MonitoringTask storage task = monitoringTasks[borrower];
            
            if (!task.isActive) continue;
            
            // Check if CDP is still active
            (, , , , , bool isActive, ) = cdpVault.getCDPInfo(borrower);
            if (!isActive) {
                continue;
            }
            
            // Check if it's time for reminder
            if (block.timestamp >= task.nextCheckTime) {
                if (cdpVault.isOverdue(borrower)) {
                    if (task.reminderCount >= MAX_REMINDERS) {
                        // Time for liquidation
                        borrowersNeedingAction[count] = borrower;
                        actions[count] = "liquidate";
                        count++;
                    } else {
                        // Send reminder
                        borrowersNeedingAction[count] = borrower;
                        actions[count] = "remind";
                        count++;
                    }
                }
            }
            
            // Check for interest accrual (daily)
            if (task.taskType == TaskType.INTEREST_ACCRUAL && 
                block.timestamp >= task.nextCheckTime) {
                borrowersNeedingAction[count] = borrower;
                actions[count] = "accrue_interest";
                count++;
            }
        }
        
        if (count > 0) {
            // Resize arrays to actual count
            address[] memory finalBorrowers = new address[](count);
            string[] memory finalActions = new string[](count);
            
            for (uint256 i = 0; i < count; i++) {
                finalBorrowers[i] = borrowersNeedingAction[i];
                finalActions[i] = actions[i];
            }
            
            upkeepNeeded = true;
            performData = abi.encode(finalBorrowers, finalActions);
        }
    }

    /**
     * @dev Chainlink Automation performUpkeep function
     * @param performData Data from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        (address[] memory borrowers, string[] memory actions) = abi.decode(performData, (address[], string[]));
        
        for (uint256 i = 0; i < borrowers.length; i++) {
            address borrower = borrowers[i];
            string memory action = actions[i];
            
            if (keccak256(bytes(action)) == keccak256("remind")) {
                _sendReminder(borrower);
            } else if (keccak256(bytes(action)) == keccak256("liquidate")) {
                _triggerLiquidation(borrower);
            } else if (keccak256(bytes(action)) == keccak256("accrue_interest")) {
                _accrueInterest(borrower);
            }
        }
    }

    /**
     * @dev Send repayment reminder to borrower
     * @param _borrower Address of the borrower
     */
    function _sendReminder(address _borrower) internal {
        MonitoringTask storage task = monitoringTasks[_borrower];
        
        task.reminderCount++;
        task.nextCheckTime = block.timestamp + REMINDER_INTERVAL;
        lastReminderSent[_borrower] = block.timestamp;
        
        emit ReminderSent(_borrower, task.reminderCount);
        emit AgentActionExecuted(_borrower, "reminder_sent");
    }

    /**
     * @dev Trigger automatic liquidation
     * @param _borrower Address of the borrower
     */
    function _triggerLiquidation(address _borrower) internal {
        MonitoringTask storage task = monitoringTasks[_borrower];
        
        // Mark task as inactive
        task.isActive = false;
        
        // Call liquidation on CDPVault
        try cdpVault.liquidateCDP(_borrower) {
            emit AutoLiquidationTriggered(_borrower);
            emit AgentActionExecuted(_borrower, "liquidation_triggered");
        } catch Error(string memory reason) {
            // If liquidation fails, reactivate task for retry
            task.isActive = true;
            task.nextCheckTime = block.timestamp + 1 hours; // Retry in 1 hour
            emit AgentActionExecuted(_borrower, string(abi.encodePacked("liquidation_failed:", reason)));
        }
    }

    /**
     * @dev Accrue interest for borrower
     * @param _borrower Address of the borrower
     */
    function _accrueInterest(address _borrower) internal {
        MonitoringTask storage task = monitoringTasks[_borrower];
        
        uint256 accruedInterest = cdpVault.calculateAccruedInterest(_borrower);
        task.nextCheckTime = block.timestamp + 1 days; // Check daily
        
        emit InterestAccrued(_borrower, accruedInterest);
        emit AgentActionExecuted(_borrower, "interest_accrued");
    }

    /**
     * @dev Manual reminder sending (for testing or emergency)
     * @param _borrower Address of the borrower
     */
    function sendManualReminder(address _borrower) external onlyOwner {
        require(monitoringTasks[_borrower].isActive, "No active monitoring task");
        _sendReminder(_borrower);
    }

    /**
     * @dev Manual liquidation trigger (for testing or emergency)
     * @param _borrower Address of the borrower
     */
    function triggerManualLiquidation(address _borrower) external onlyOwner {
        require(monitoringTasks[_borrower].isActive, "No active monitoring task");
        _triggerLiquidation(_borrower);
    }

    /**
     * @dev Remove completed or inactive tasks
     * @param _borrower Address of the borrower
     */
    function removeTask(address _borrower) external onlyOwner {
        monitoringTasks[_borrower].isActive = false;
        
        // Remove from active borrowers array
        for (uint256 i = 0; i < activeBorrowers.length; i++) {
            if (activeBorrowers[i] == _borrower) {
                activeBorrowers[i] = activeBorrowers[activeBorrowers.length - 1];
                activeBorrowers.pop();
                break;
            }
        }
    }

    /**
     * @dev Get monitoring task information
     * @param _borrower Address of the borrower
     * @return nextCheckTime The next check time
     * @return reminderCount The reminder count
     * @return isActive Whether the task is active
     * @return taskType The type of task
     */
    function getTaskInfo(address _borrower) external view returns (
        uint256 nextCheckTime,
        uint256 reminderCount,
        bool isActive,
        TaskType taskType
    ) {
        MonitoringTask storage task = monitoringTasks[_borrower];
        return (
            task.nextCheckTime,
            task.reminderCount,
            task.isActive,
            task.taskType
        );
    }

    /**
     * @dev Get all active borrowers
     * @return Array of active borrower addresses
     */
    function getActiveBorrowers() external view returns (address[] memory) {
        return activeBorrowers;
    }

    /**
     * @dev Check if borrower needs attention
     * @param _borrower Address of the borrower
     * @return True if needs attention
     */
    function needsAttention(address _borrower) external view returns (bool) {
        MonitoringTask storage task = monitoringTasks[_borrower];
        if (!task.isActive) return false;
        
        return (block.timestamp >= task.nextCheckTime && cdpVault.isOverdue(_borrower));
    }

    /**
     * @dev Emergency pause all monitoring
     */
    function pauseAllMonitoring() external onlyOwner {
        for (uint256 i = 0; i < activeBorrowers.length; i++) {
            monitoringTasks[activeBorrowers[i]].isActive = false;
        }
    }

    /**
     * @dev Resume all monitoring
     */
    function resumeAllMonitoring() external onlyOwner {
        for (uint256 i = 0; i < activeBorrowers.length; i++) {
            monitoringTasks[activeBorrowers[i]].isActive = true;
        }
    }
}
