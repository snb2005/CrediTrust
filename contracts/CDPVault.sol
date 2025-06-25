// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title CDPVault
 * @dev Manages collateralized debt positions with dynamic APR based on risk scoring
 */
contract CDPVault is ReentrancyGuard, Ownable, VRFConsumerBaseV2 {
    using SafeMath for uint256;

    // Chainlink VRF
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private constant CALLBACK_GAS_LIMIT = 100000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    struct CDP {
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 creditScore;
        uint256 apr; // Annual Percentage Rate in basis points (e.g., 500 = 5%)
        uint256 lastInterestUpdate;
        uint256 dueDate;
        bool isActive;
        address borrower;
        address assignedLender;
    }

    struct LenderPool {
        address lender;
        uint256 stakedAmount;
        uint256 reputation;
        uint256 accruedRewards; // Track accrued rewards
        uint256 lastRewardUpdate; // Last time rewards were calculated
        bool isActive;
    }

    // State variables
    IERC20 public immutable collateralToken;
    IERC20 public immutable debtToken;
    
    mapping(address => CDP) public cdps;
    mapping(address => LenderPool) public lenderPools;
    mapping(uint256 => address) public requestIdToBorrower;
    
    address[] public activeLenders;
    uint256 public totalCollateral;
    uint256 public totalDebt;
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80%
    uint256 public constant MIN_COLLATERAL_RATIO = 12000; // 120%
    
    // APR ranges based on credit score
    uint256 public constant MIN_APR = 500; // 5%
    uint256 public constant MAX_APR = 2000; // 20%

    // Events
    event CDPOpened(address indexed borrower, uint256 collateralAmount, uint256 creditScore, uint256 apr);
    event LoanDisbursed(address indexed borrower, uint256 amount, address indexed lender);
    event RepaymentMade(address indexed borrower, uint256 amount);
    event CDPLiquidated(address indexed borrower, uint256 collateralAmount);
    event LenderAssigned(address indexed borrower, address indexed lender);
    event LenderStaked(address indexed lender, uint256 amount);
    event LenderWithdrawn(address indexed lender, uint256 amount);
    event RewardsCompounded(address indexed lender, uint256 amount);
    event RewardsWithdrawn(address indexed lender, uint256 amount);
    event CollateralAdded(address indexed borrower, uint256 additionalCollateral, uint256 newCollateralAmount);

    constructor(
        address _collateralToken,
        address _debtToken,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _gasLane
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        collateralToken = IERC20(_collateralToken);
        debtToken = IERC20(_debtToken);
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subscriptionId = _subscriptionId;
        i_gasLane = _gasLane;
    }

    /**
     * @dev Open a new CDP with collateral
     * @param _collateralAmount Amount of collateral to lock
     * @param _creditScore Credit score from ML model (0-1000)
     */
    function openCDP(uint256 _collateralAmount, uint256 _creditScore) external nonReentrant {
        require(_collateralAmount > 0, "Collateral amount must be greater than 0");
        require(_creditScore >= 300 && _creditScore <= 850, "Invalid credit score range");
        require(!cdps[msg.sender].isActive, "CDP already exists");

        // Transfer collateral
        require(collateralToken.transferFrom(msg.sender, address(this), _collateralAmount), "Collateral transfer failed");

        // Calculate APR based on credit score (inverse relationship)
        uint256 apr = calculateAPR(_creditScore);
        
        // Create CDP
        cdps[msg.sender] = CDP({
            collateralAmount: _collateralAmount,
            debtAmount: 0,
            creditScore: _creditScore,
            apr: apr,
            lastInterestUpdate: block.timestamp,
            dueDate: 0,
            isActive: true,
            borrower: msg.sender,
            assignedLender: address(0)
        });

        totalCollateral = totalCollateral.add(_collateralAmount);

        emit CDPOpened(msg.sender, _collateralAmount, _creditScore, apr);

        // For local testing, directly assign first available lender if VRF coordinator is zero address
        if (activeLenders.length > 0) {
            if (address(i_vrfCoordinator) == address(0)) {
                // Direct assignment for local testing
                cdps[msg.sender].assignedLender = activeLenders[0];
                emit LenderAssigned(msg.sender, activeLenders[0]);
            } else {
                // Use VRF for production
                requestRandomLender(msg.sender);
            }
        }
    }

    /**
     * @dev Calculate APR based on credit score
     * @param _creditScore Credit score (300-850)
     * @return APR in basis points
     */
    function calculateAPR(uint256 _creditScore) public pure returns (uint256) {
        // Higher credit score = lower APR
        // Credit score 850 = 5% APR, Credit score 300 = 20% APR
        if (_creditScore >= 800) return 500;  // 5%
        if (_creditScore >= 750) return 700;  // 7%
        if (_creditScore >= 700) return 1000; // 10%
        if (_creditScore >= 650) return 1300; // 13%
        if (_creditScore >= 600) return 1600; // 16%
        return 2000; // 20%
    }

    /**
     * @dev Request a loan against CDP
     * @param _loanAmount Amount to borrow
     */
    function requestLoan(uint256 _loanAmount) external nonReentrant {
        CDP storage cdp = cdps[msg.sender];
        require(cdp.isActive, "No active CDP");
        require(_loanAmount > 0, "Loan amount must be greater than 0");
        
        // Check collateral ratio
        uint256 totalDebtWithInterest = cdp.debtAmount.add(calculateAccruedInterest(msg.sender));
        uint256 newTotalDebt = totalDebtWithInterest.add(_loanAmount);
        uint256 collateralRatio = cdp.collateralAmount.mul(10000).div(newTotalDebt);
        
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Insufficient collateral ratio");
        
        // Update debt and interest
        cdp.debtAmount = newTotalDebt;
        cdp.lastInterestUpdate = block.timestamp;
        cdp.dueDate = block.timestamp + 30 days; // 30-day loan term
        
        totalDebt = totalDebt.add(_loanAmount);
        
        // Disburse loan through x402Router (to be implemented)
        // For now, direct transfer
        require(debtToken.transfer(msg.sender, _loanAmount), "Loan transfer failed");
        
        emit LoanDisbursed(msg.sender, _loanAmount, cdp.assignedLender);
    }

    /**
     * @dev Make repayment towards CDP
     * @param _amount Amount to repay
     */
    function makeRepayment(uint256 _amount) external nonReentrant {
        CDP storage cdp = cdps[msg.sender];
        require(cdp.isActive, "No active CDP");
        require(_amount > 0, "Repayment amount must be greater than 0");
        
        // Calculate total debt with interest
        uint256 accruedInterest = calculateAccruedInterest(msg.sender);
        uint256 totalDebtWithInterest = cdp.debtAmount.add(accruedInterest);
        
        require(_amount <= totalDebtWithInterest, "Repayment exceeds debt");
        
        // Transfer repayment
        require(debtToken.transferFrom(msg.sender, address(this), _amount), "Repayment transfer failed");
        
        // Update debt
        cdp.debtAmount = totalDebtWithInterest.sub(_amount);
        cdp.lastInterestUpdate = block.timestamp;
        
        // If fully repaid, close CDP
        if (cdp.debtAmount == 0) {
            closeCDP(msg.sender);
        }
        
        totalDebt = totalDebt.sub(_amount);
        
        emit RepaymentMade(msg.sender, _amount);
    }

    /**
     * @dev Calculate accrued interest for a CDP
     * @param _borrower Address of the borrower
     * @return Accrued interest amount
     */
    function calculateAccruedInterest(address _borrower) public view returns (uint256) {
        CDP storage cdp = cdps[_borrower];
        if (!cdp.isActive || cdp.debtAmount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp.sub(cdp.lastInterestUpdate);
        uint256 annualInterest = cdp.debtAmount.mul(cdp.apr).div(10000);
        uint256 accruedInterest = annualInterest.mul(timeElapsed).div(365 days);
        
        return accruedInterest;
    }

    /**
     * @dev Close CDP and return collateral
     * @param _borrower Address of the borrower
     */
    function closeCDP(address _borrower) internal {
        CDP storage cdp = cdps[_borrower];
        require(cdp.isActive, "CDP not active");
        require(cdp.debtAmount == 0, "Outstanding debt exists");
        
        uint256 collateralToReturn = cdp.collateralAmount;
        
        // Mark CDP as inactive
        cdp.isActive = false;
        totalCollateral = totalCollateral.sub(collateralToReturn);
        
        // Return collateral
        require(collateralToken.transfer(_borrower, collateralToReturn), "Collateral return failed");
    }

    /**
     * @dev Liquidate CDP if below liquidation threshold
     * @param _borrower Address of the borrower to liquidate
     */
    function liquidateCDP(address _borrower) external {
        CDP storage cdp = cdps[_borrower];
        require(cdp.isActive, "CDP not active");
        
        uint256 accruedInterest = calculateAccruedInterest(_borrower);
        uint256 totalDebtWithInterest = cdp.debtAmount.add(accruedInterest);
        uint256 collateralRatio = cdp.collateralAmount.mul(10000).div(totalDebtWithInterest);
        
        require(collateralRatio < LIQUIDATION_THRESHOLD, "CDP above liquidation threshold");
        
        // Liquidate
        uint256 collateralToLiquidate = cdp.collateralAmount;
        cdp.isActive = false;
        totalCollateral = totalCollateral.sub(collateralToLiquidate);
        totalDebt = totalDebt.sub(cdp.debtAmount);
        
        // Transfer collateral to liquidator (simplified - in practice would use DEX)
        require(collateralToken.transfer(msg.sender, collateralToLiquidate), "Liquidation transfer failed");
        
        emit CDPLiquidated(_borrower, collateralToLiquidate);
    }

    /**
     * @dev Stake as a lender
     * @param _amount Amount to stake
     */
    function stakeLender(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Stake amount must be greater than 0");
        require(debtToken.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");
        
        if (!lenderPools[msg.sender].isActive) {
            lenderPools[msg.sender] = LenderPool({
                lender: msg.sender,
                stakedAmount: _amount,
                reputation: 100, // Starting reputation
                accruedRewards: 0,
                lastRewardUpdate: block.timestamp,
                isActive: true
            });
            activeLenders.push(msg.sender);
        } else {
            // Update rewards before adding new amount
            updateLenderRewards(msg.sender);
            lenderPools[msg.sender].stakedAmount = lenderPools[msg.sender].stakedAmount.add(_amount);
        }
        
        emit LenderStaked(msg.sender, _amount);
    }

    /**
     * @dev Update lender rewards based on time elapsed and staked amount
     * @param _lender Address of the lender
     */
    function updateLenderRewards(address _lender) internal {
        LenderPool storage pool = lenderPools[_lender];
        if (!pool.isActive || pool.stakedAmount == 0) return;
        
        uint256 timeElapsed = block.timestamp.sub(pool.lastRewardUpdate);
        // Simplified reward calculation: 5% APY for lenders
        uint256 annualReward = pool.stakedAmount.mul(500).div(10000); // 5% APY
        uint256 accruedReward = annualReward.mul(timeElapsed).div(365 days);
        
        pool.accruedRewards = pool.accruedRewards.add(accruedReward);
        pool.lastRewardUpdate = block.timestamp;
    }
    
    /**
     * @dev Withdraw staked amount and rewards
     * @param _amount Amount to withdraw (0 to withdraw all)
     */
    function withdrawLender(uint256 _amount) external nonReentrant {
        LenderPool storage pool = lenderPools[msg.sender];
        require(pool.isActive, "No active lending position");
        
        // Update rewards before withdrawal
        updateLenderRewards(msg.sender);
        
        uint256 totalAvailable = pool.stakedAmount.add(pool.accruedRewards);
        uint256 withdrawAmount;
        
        if (_amount == 0) {
            // Withdraw all
            withdrawAmount = totalAvailable;
            pool.stakedAmount = 0;
            pool.accruedRewards = 0;
            pool.isActive = false;
            
            // Remove from active lenders array
            for (uint i = 0; i < activeLenders.length; i++) {
                if (activeLenders[i] == msg.sender) {
                    activeLenders[i] = activeLenders[activeLenders.length - 1];
                    activeLenders.pop();
                    break;
                }
            }
        } else {
            require(_amount <= totalAvailable, "Insufficient balance");
            withdrawAmount = _amount;
            
            // Withdraw proportionally from staked amount and rewards
            if (_amount <= pool.accruedRewards) {
                pool.accruedRewards = pool.accruedRewards.sub(_amount);
            } else {
                uint256 remainingAmount = _amount.sub(pool.accruedRewards);
                pool.accruedRewards = 0;
                pool.stakedAmount = pool.stakedAmount.sub(remainingAmount);
            }
        }
        
        require(debtToken.transfer(msg.sender, withdrawAmount), "Withdrawal transfer failed");
        emit LenderWithdrawn(msg.sender, withdrawAmount);
    }
    
    /**
     * @dev Compound accrued rewards back into staked amount
     */
    function compoundRewards() external nonReentrant {
        LenderPool storage pool = lenderPools[msg.sender];
        require(pool.isActive, "No active lending position");
        
        // Update rewards before compounding
        updateLenderRewards(msg.sender);
        
        require(pool.accruedRewards > 0, "No rewards to compound");
        
        uint256 rewardsToCompound = pool.accruedRewards;
        pool.stakedAmount = pool.stakedAmount.add(rewardsToCompound);
        pool.accruedRewards = 0;
        
        emit RewardsCompounded(msg.sender, rewardsToCompound);
    }

    /**
     * @dev Add additional collateral to existing CDP
     * @param _additionalCollateral Amount of additional collateral to add
     */
    function addCollateral(uint256 _additionalCollateral) external nonReentrant {
        CDP storage cdp = cdps[msg.sender];
        require(cdp.isActive, "No active CDP");
        require(_additionalCollateral > 0, "Additional collateral must be greater than 0");
        
        // Transfer additional collateral
        require(collateralToken.transferFrom(msg.sender, address(this), _additionalCollateral), 
                "Collateral transfer failed");
        
        // Update CDP collateral
        cdp.collateralAmount = cdp.collateralAmount.add(_additionalCollateral);
        totalCollateral = totalCollateral.add(_additionalCollateral);
        
        emit CollateralAdded(msg.sender, _additionalCollateral, cdp.collateralAmount);
    }

    /**
     * @dev Request random lender assignment using Chainlink VRF
     * @param _borrower Address of the borrower
     */
    function requestRandomLender(address _borrower) internal {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
        requestIdToBorrower[requestId] = _borrower;
    }

    /**
     * @dev Callback function for Chainlink VRF
     * @param requestId Request ID
     * @param randomWords Random words from VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address borrower = requestIdToBorrower[requestId];
        require(borrower != address(0), "Invalid request ID");
        
        if (activeLenders.length > 0) {
            uint256 lenderIndex = randomWords[0] % activeLenders.length;
            address selectedLender = activeLenders[lenderIndex];
            
            cdps[borrower].assignedLender = selectedLender;
            emit LenderAssigned(borrower, selectedLender);
        }
    }

    /**
     * @dev Get CDP information
     * @param _borrower Address of the borrower
     * @return collateralAmount The amount of collateral
     * @return debtAmount The amount of debt
     * @return creditScore The credit score
     * @return apr The annual percentage rate
     * @return dueDate The due date
     * @return isActive Whether the CDP is active
     * @return assignedLender The assigned lender
     */
    function getCDPInfo(address _borrower) external view returns (
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 creditScore,
        uint256 apr,
        uint256 dueDate,
        bool isActive,
        address assignedLender
    ) {
        CDP storage cdp = cdps[_borrower];
        return (
            cdp.collateralAmount,
            cdp.debtAmount,
            cdp.creditScore,
            cdp.apr,
            cdp.dueDate,
            cdp.isActive,
            cdp.assignedLender
        );
    }

    /**
     * @dev Get lender pool information
     * @param _lender Address of the lender
     * @return stakedAmount The amount staked
     * @return accruedRewards The accrued rewards
     * @return reputation The lender reputation
     * @return isActive Whether the pool is active
     */
    function getLenderInfo(address _lender) external view returns (
        uint256 stakedAmount,
        uint256 accruedRewards, 
        uint256 reputation,
        bool isActive
    ) {
        LenderPool storage pool = lenderPools[_lender];
        
        // Calculate current accrued rewards
        uint256 currentRewards = pool.accruedRewards;
        if (pool.isActive && pool.stakedAmount > 0) {
            uint256 timeElapsed = block.timestamp.sub(pool.lastRewardUpdate);
            uint256 annualReward = pool.stakedAmount.mul(500).div(10000); // 5% APY
            uint256 additionalReward = annualReward.mul(timeElapsed).div(365 days);
            currentRewards = currentRewards.add(additionalReward);
        }
        
        return (
            pool.stakedAmount,
            currentRewards,
            pool.reputation,
            pool.isActive
        );
    }

    /**
     * @dev Check if CDP is overdue
     * @param _borrower Address of the borrower
     * @return True if overdue
     */
    function isOverdue(address _borrower) external view returns (bool) {
        CDP storage cdp = cdps[_borrower];
        return cdp.isActive && cdp.dueDate > 0 && block.timestamp > cdp.dueDate;
    }
    
    /**
     * @dev Get total debt including accrued interest for a borrower
     * @param _borrower Address of the borrower
     * @return Total debt amount including interest
     */
    function getTotalDebtWithInterest(address _borrower) external view returns (uint256) {
        CDP storage cdp = cdps[_borrower];
        if (!cdp.isActive) return 0;
        
        uint256 accruedInterest = calculateAccruedInterest(_borrower);
        return cdp.debtAmount.add(accruedInterest);
    }
}
