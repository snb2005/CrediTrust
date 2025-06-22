// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title x402Router
 * @dev Routes payments using x402Pay protocol for pay-per-use credit system
 */
contract x402Router is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    struct PaymentRequest {
        address payer;
        address payee;
        uint256 amount;
        address token;
        bytes32 paymentId;
        uint256 timestamp;
        PaymentStatus status;
        string metadata;
    }

    struct x402Config {
        uint256 feeRate; // Fee rate in basis points (e.g., 50 = 0.5%)
        address feeRecipient;
        uint256 minPayment;
        uint256 maxPayment;
        bool isActive;
    }

    enum PaymentStatus {
        PENDING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    // State variables
    mapping(bytes32 => PaymentRequest) public paymentRequests;
    mapping(address => uint256) public userCredits;
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    x402Config public config;
    uint256 public totalVolume;
    uint256 public totalFees;
    bytes32[] public allPaymentIds;

    // Events
    event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, address indexed payee, uint256 amount);
    event PaymentCompleted(bytes32 indexed paymentId, uint256 feeAmount);
    event PaymentFailed(bytes32 indexed paymentId, string reason);
    event CreditAdded(address indexed user, uint256 amount);
    event ConfigUpdated(uint256 feeRate, address feeRecipient);
    event x402PaymentProcessed(bytes32 indexed paymentId, string x402TxId);

    constructor(
        uint256 _feeRate,
        address _feeRecipient,
        uint256 _minPayment,
        uint256 _maxPayment
    ) {
        config = x402Config({
            feeRate: _feeRate,
            feeRecipient: _feeRecipient,
            minPayment: _minPayment,
            maxPayment: _maxPayment,
            isActive: true
        });
    }

    /**
     * @dev Initiate a payment through x402Pay
     * @param _payee Address to receive payment
     * @param _amount Amount to pay
     * @param _token Token address (address(0) for ETH)
     * @param _metadata Additional payment metadata
     * @return paymentId Unique payment identifier
     */
    function initiatePayment(
        address _payee,
        uint256 _amount,
        address _token,
        string memory _metadata
    ) external payable nonReentrant returns (bytes32 paymentId) {
        require(config.isActive, "x402Router is not active");
        require(_payee != address(0), "Invalid payee address");
        require(_amount >= config.minPayment && _amount <= config.maxPayment, "Amount out of range");

        // Generate unique payment ID
        paymentId = keccak256(abi.encodePacked(
            msg.sender,
            _payee,
            _amount,
            _token,
            block.timestamp,
            block.number
        ));

        // Handle ETH payments
        if (_token == address(0)) {
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "ETH not expected for token payment");
            require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        }

        // Create payment request
        paymentRequests[paymentId] = PaymentRequest({
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            token: _token,
            paymentId: paymentId,
            timestamp: block.timestamp,
            status: PaymentStatus.PENDING,
            metadata: _metadata
        });

        allPaymentIds.push(paymentId);

        emit PaymentInitiated(paymentId, msg.sender, _payee, _amount);

        // Process payment immediately (in real implementation, this would interact with x402Pay API)
        _processPayment(paymentId);

        return paymentId;
    }

    /**
     * @dev Process payment (internal function simulating x402Pay processing)
     * @param _paymentId Payment ID to process
     */
    function _processPayment(bytes32 _paymentId) internal {
        PaymentRequest storage payment = paymentRequests[_paymentId];
        require(payment.status == PaymentStatus.PENDING, "Payment already processed");

        // Calculate fees
        uint256 feeAmount = payment.amount.mul(config.feeRate).div(10000);
        uint256 netAmount = payment.amount.sub(feeAmount);

        // Update payment status
        payment.status = PaymentStatus.COMPLETED;

        // Transfer funds
        if (payment.token == address(0)) {
            // ETH payment
            payable(payment.payee).transfer(netAmount);
            if (feeAmount > 0) {
                payable(config.feeRecipient).transfer(feeAmount);
            }
        } else {
            // Token payment
            require(IERC20(payment.token).transfer(payment.payee, netAmount), "Payment transfer failed");
            if (feeAmount > 0) {
                require(IERC20(payment.token).transfer(config.feeRecipient, feeAmount), "Fee transfer failed");
            }
        }

        // Update statistics
        totalPaid[payment.payer] = totalPaid[payment.payer].add(payment.amount);
        totalReceived[payment.payee] = totalReceived[payment.payee].add(netAmount);
        totalVolume = totalVolume.add(payment.amount);
        totalFees = totalFees.add(feeAmount);

        emit PaymentCompleted(_paymentId, feeAmount);
        emit x402PaymentProcessed(_paymentId, "simulated_x402_tx");
    }

    /**
     * @dev Add credits for pay-per-use functionality
     * @param _amount Amount of credits to add
     * @param _token Token address
     */
    function addCredits(uint256 _amount, address _token) external payable nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");

        if (_token == address(0)) {
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "ETH not expected for token payment");
            require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        }

        userCredits[msg.sender] = userCredits[msg.sender].add(_amount);
        emit CreditAdded(msg.sender, _amount);
    }

    /**
     * @dev Use credits for payment (pay-per-use model)
     * @param _payee Address to receive payment
     * @param _amount Amount to pay from credits
     * @param _metadata Payment metadata
     * @return paymentId Unique payment identifier
     */
    function payWithCredits(
        address _payee,
        uint256 _amount,
        string memory _metadata
    ) external nonReentrant returns (bytes32 paymentId) {
        require(userCredits[msg.sender] >= _amount, "Insufficient credits");
        require(_payee != address(0), "Invalid payee address");

        // Deduct credits
        userCredits[msg.sender] = userCredits[msg.sender].sub(_amount);

        // Generate payment ID
        paymentId = keccak256(abi.encodePacked(
            msg.sender,
            _payee,
            _amount,
            "credits",
            block.timestamp,
            block.number
        ));

        // Create and complete payment
        paymentRequests[paymentId] = PaymentRequest({
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            token: address(0), // Using credits (ETH equivalent)
            paymentId: paymentId,
            timestamp: block.timestamp,
            status: PaymentStatus.COMPLETED,
            metadata: _metadata
        });

        allPaymentIds.push(paymentId);

        // Calculate fees and transfer
        uint256 feeAmount = _amount.mul(config.feeRate).div(10000);
        uint256 netAmount = _amount.sub(feeAmount);

        // Transfer from contract balance (credits pool)
        payable(_payee).transfer(netAmount);
        if (feeAmount > 0) {
            payable(config.feeRecipient).transfer(feeAmount);
        }

        // Update statistics
        totalPaid[msg.sender] = totalPaid[msg.sender].add(_amount);
        totalReceived[_payee] = totalReceived[_payee].add(netAmount);
        totalVolume = totalVolume.add(_amount);
        totalFees = totalFees.add(feeAmount);

        emit PaymentInitiated(paymentId, msg.sender, _payee, _amount);
        emit PaymentCompleted(paymentId, feeAmount);

        return paymentId;
    }

    /**
     * @dev Cancel pending payment
     * @param _paymentId Payment ID to cancel
     */
    function cancelPayment(bytes32 _paymentId) external nonReentrant {
        PaymentRequest storage payment = paymentRequests[_paymentId];
        require(payment.payer == msg.sender, "Not payment payer");
        require(payment.status == PaymentStatus.PENDING, "Cannot cancel completed payment");

        payment.status = PaymentStatus.CANCELLED;

        // Refund payment
        if (payment.token == address(0)) {
            payable(msg.sender).transfer(payment.amount);
        } else {
            require(IERC20(payment.token).transfer(msg.sender, payment.amount), "Refund failed");
        }

        emit PaymentFailed(_paymentId, "Cancelled by payer");
    }

    /**
     * @dev Batch process multiple payments
     * @param _payees Array of payee addresses
     * @param _amounts Array of payment amounts
     * @param _token Token address for all payments
     * @param _metadata Batch metadata
     * @return paymentIds Array of payment IDs
     */
    function batchPayment(
        address[] memory _payees,
        uint256[] memory _amounts,
        address _token,
        string memory _metadata
    ) external payable nonReentrant returns (bytes32[] memory paymentIds) {
        require(_payees.length == _amounts.length, "Array length mismatch");
        require(_payees.length > 0, "Empty payment array");

        paymentIds = new bytes32[](_payees.length);
        uint256 totalAmount = 0;

        // Calculate total amount
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount = totalAmount.add(_amounts[i]);
        }

        // Handle payment transfer
        if (_token == address(0)) {
            require(msg.value == totalAmount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "ETH not expected for token payment");
            require(IERC20(_token).transferFrom(msg.sender, address(this), totalAmount), "Token transfer failed");
        }

        // Process each payment
        for (uint256 i = 0; i < _payees.length; i++) {
            bytes32 paymentId = keccak256(abi.encodePacked(
                msg.sender,
                _payees[i],
                _amounts[i],
                _token,
                block.timestamp,
                block.number,
                i
            ));

            paymentRequests[paymentId] = PaymentRequest({
                payer: msg.sender,
                payee: _payees[i],
                amount: _amounts[i],
                token: _token,
                paymentId: paymentId,
                timestamp: block.timestamp,
                status: PaymentStatus.PENDING,
                metadata: _metadata
            });

            allPaymentIds.push(paymentId);
            paymentIds[i] = paymentId;

            emit PaymentInitiated(paymentId, msg.sender, _payees[i], _amounts[i]);
            _processPayment(paymentId);
        }

        return paymentIds;
    }

    /**
     * @dev Get payment details
     * @param _paymentId Payment ID
     * @return payer The payer address
     * @return payee The payee address
     * @return amount The payment amount
     * @return token The token address
     * @return timestamp The payment timestamp
     * @return status The payment status
     * @return metadata The payment metadata
     */
    function getPayment(bytes32 _paymentId) external view returns (
        address payer,
        address payee,
        uint256 amount,
        address token,
        uint256 timestamp,
        PaymentStatus status,
        string memory metadata
    ) {
        PaymentRequest storage payment = paymentRequests[_paymentId];
        return (
            payment.payer,
            payment.payee,
            payment.amount,
            payment.token,
            payment.timestamp,
            payment.status,
            payment.metadata
        );
    }

    /**
     * @dev Get user statistics
     * @param _user User address
     * @return credits User's available credits
     * @return paid Total amount paid
     * @return received Total amount received
     */
    function getUserStats(address _user) external view returns (
        uint256 credits,
        uint256 paid,
        uint256 received
    ) {
        return (
            userCredits[_user],
            totalPaid[_user],
            totalReceived[_user]
        );
    }

    /**
     * @dev Update configuration (only owner)
     * @param _feeRate New fee rate
     * @param _feeRecipient New fee recipient
     */
    function updateConfig(uint256 _feeRate, address _feeRecipient) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high"); // Max 10%
        require(_feeRecipient != address(0), "Invalid fee recipient");

        config.feeRate = _feeRate;
        config.feeRecipient = _feeRecipient;

        emit ConfigUpdated(_feeRate, _feeRecipient);
    }

    /**
     * @dev Set payment limits (only owner)
     * @param _minPayment Minimum payment amount
     * @param _maxPayment Maximum payment amount
     */
    function setPaymentLimits(uint256 _minPayment, uint256 _maxPayment) external onlyOwner {
        require(_minPayment < _maxPayment, "Invalid payment limits");
        config.minPayment = _minPayment;
        config.maxPayment = _maxPayment;
    }

    /**
     * @dev Toggle router active status (only owner)
     * @param _isActive Active status
     */
    function setActive(bool _isActive) external onlyOwner {
        config.isActive = _isActive;
    }

    /**
     * @dev Emergency withdrawal (only owner)
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            require(IERC20(_token).transfer(owner(), _amount), "Emergency withdrawal failed");
        }
    }

    /**
     * @dev Get total number of payments
     * @return Total payment count
     */
    function getTotalPayments() external view returns (uint256) {
        return allPaymentIds.length;
    }

    /**
     * @dev Get payment ID by index
     * @param _index Index in payment array
     * @return Payment ID
     */
    function getPaymentIdByIndex(uint256 _index) external view returns (bytes32) {
        require(_index < allPaymentIds.length, "Index out of bounds");
        return allPaymentIds[_index];
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}
