import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CDP_VAULT_ABI, CREDIT_AGENT_ABI, ERC20_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../utils/wagmi';
import toast from 'react-hot-toast';

// Hook for CDP Vault operations
export const useCDPVault = () => {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const openCDP = async (collateralAmount, creditScore = 700) => {
    try {
      console.log('Opening CDP:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        collateralAmount: collateralAmount.toString(),
        creditScore: creditScore
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'openCDP',
        args: [collateralAmount, creditScore],
      });
      console.log('Open CDP transaction hash:', hash);
      toast.success('CDP opened successfully!');
      return hash;
    } catch (error) {
      console.error('Open CDP error:', error);
      toast.error(`Failed to open CDP: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const requestLoan = async (loanAmount) => {
    try {
      console.log('Requesting loan:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        loanAmount: loanAmount.toString()
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'requestLoan',
        args: [loanAmount],
      });
      console.log('Request loan transaction hash:', hash);
      toast.success('Loan request submitted!');
      return hash;
    } catch (error) {
      console.error('Request loan error:', error);
      toast.error(`Failed to request loan: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const makeRepayment = async (amount) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'makeRepayment',
        args: [amount],
      });
      toast.success('Repayment initiated!');
      return hash;
    } catch (error) {
      toast.error(`Failed to make repayment: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const approveToken = async (tokenAddress, amount) => {
    try {
      console.log('Approving token:', {
        token: tokenAddress,
        spender: CONTRACT_ADDRESSES.CDP_VAULT,
        amount: amount.toString()
      });

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.CDP_VAULT, amount],
      });
      
      console.log('Token approval hash:', hash);
      toast.success('Token approval submitted!');
      return hash;
    } catch (error) {
      console.error('Token approval error:', error);
      toast.error(`Failed to approve token: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const stakeLender = async (amount) => {
    try {
      console.log('Staking as lender:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        amount: amount.toString()
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'stakeLender',
        args: [amount],
      });
      console.log('Stake lender transaction hash:', hash);
      toast.success('Staked as lender successfully!');
      return hash;
    } catch (error) {
      console.error('Stake lender error:', error);
      toast.error(`Failed to stake as lender: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const withdrawCollateral = async (amount) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'withdrawCollateral',
        args: [amount],
      });
      toast.success('Collateral withdrawal initiated!');
      return hash;
    } catch (error) {
      toast.error('Failed to withdraw collateral');
      throw error;
    }
  };

  const withdrawLender = async (amount) => {
    try {
      console.log('Withdrawing lender stake:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        amount: amount.toString()
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'withdrawLender',
        args: [amount],
      });
      console.log('Withdraw lender transaction hash:', hash);
      toast.success('Withdrawal initiated successfully!');
      return hash;
    } catch (error) {
      console.error('Withdraw lender error:', error);
      toast.error(`Failed to withdraw: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const compoundRewards = async () => {
    try {
      console.log('Compounding rewards:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'compoundRewards',
        args: [],
      });
      console.log('Compound rewards transaction hash:', hash);
      toast.success('Rewards compounded successfully!');
      return hash;
    } catch (error) {
      console.error('Compound rewards error:', error);
      toast.error(`Failed to compound rewards: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  const addCollateral = async (additionalCollateral) => {
    try {
      console.log('Adding collateral:', {
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        additionalCollateral: additionalCollateral.toString()
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'addCollateral',
        args: [additionalCollateral],
      });
      console.log('Add collateral transaction hash:', hash);
      toast.success('Collateral added successfully!');
      return hash;
    } catch (error) {
      console.error('Add collateral error:', error);
      toast.error(`Failed to add collateral: ${error.message || error.shortMessage || 'Unknown error'}`);
      throw error;
    }
  };

  return {
    openCDP,
    requestLoan,
    makeRepayment,
    approveToken,
    stakeLender,
    withdrawCollateral,
    withdrawLender,
    compoundRewards,
    addCollateral,
    isLoading: isWritePending,
  };
};

// Hook for reading account information
export const useAccountInfo = (address) => {
  const { data: accountInfo, isLoading: isAccountLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'getAccountInformation',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { data: healthFactor, isLoading: isHealthLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'getHealthFactor',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    accountInfo,
    healthFactor,
    isLoading: isAccountLoading || isHealthLoading,
  };
};

// Hook for credit score operations
export const useCreditScore = (address) => {
  const { writeContract, isPending: isWritePending } = useWriteContract();

  const { data: creditScore, isLoading: isCreditLoading, refetch: refetchCreditScore } = useReadContract({
    address: CONTRACT_ADDRESSES.CREDIT_AGENT,
    abi: CREDIT_AGENT_ABI,
    functionName: 'getCreditScore',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const updateCreditScore = async () => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.CREDIT_AGENT,
        abi: CREDIT_AGENT_ABI,
        functionName: 'updateCreditScore',
        args: [address],
      });
      toast.success('Credit score update initiated!');
      return hash;
    } catch (error) {
      toast.error('Failed to update credit score');
      throw error;
    }
  };

  const assessRisk = async (loanAmount) => {
    try {
      const result = await useReadContract({
        address: CONTRACT_ADDRESSES.CREDIT_AGENT,
        abi: CREDIT_AGENT_ABI,
        functionName: 'assessRisk',
        args: [address, loanAmount],
      });
      return result;
    } catch (error) {
      toast.error('Failed to assess risk');
      throw error;
    }
  };

  return {
    creditScore,
    updateCreditScore,
    assessRisk,
    refetchCreditScore,
    isLoading: isCreditLoading || isWritePending,
  };
};

// Hook for transaction status tracking
export const useTransactionStatus = (hash) => {
  const { data: receipt, isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    receipt,
    isLoading,
    isSuccess,
    isError,
  };
};

// Hook for lender information
export const useLenderInfo = (address) => {
  const { data: lenderInfo, isLoading: isLenderLoading, refetch: refetchLenderInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'getLenderInfo',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Debug logging
  console.log('Lender Info Hook:', {
    address,
    lenderInfo,
    isLoading: isLenderLoading,
    enabled: !!address
  });

  return {
    lenderInfo,
    isLoading: isLenderLoading,
    refetch: refetchLenderInfo,
  };
};

// Hook for CDP information
export const useCDPInfo = (address) => {
  const { data: cdpInfo, isLoading: isCDPLoading, refetch: refetchCDPInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'getCDPInfo',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Debug logging
  console.log('CDP Info Hook:', {
    address,
    cdpInfo,
    isLoading: isCDPLoading,
    enabled: !!address
  });

  return {
    cdpInfo,
    isLoading: isCDPLoading,
    refetch: refetchCDPInfo,
  };
};

// Hook for getting total debt with interest
export const useTotalDebtWithInterest = (address) => {
  const { data: totalDebtWithInterest, isLoading: isDebtLoading, refetch: refetchTotalDebt } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'getTotalDebtWithInterest',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    totalDebtWithInterest,
    isLoading: isDebtLoading,
    refetch: refetchTotalDebt,
  };
};

// Hook for calculating accrued interest
export const useAccruedInterest = (address) => {
  const { data: accruedInterest, isLoading: isInterestLoading, refetch: refetchAccruedInterest } = useReadContract({
    address: CONTRACT_ADDRESSES.CDP_VAULT,
    abi: CDP_VAULT_ABI,
    functionName: 'calculateAccruedInterest',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    accruedInterest,
    isLoading: isInterestLoading,
    refetch: refetchAccruedInterest,
  };
};

// Hook for reading debt token balance
export const useDebtTokenBalance = (address) => {
  const { data: debtTokenBalance, isLoading: isDebtBalanceLoading, refetch: refetchDebtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.DEBT_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    debtTokenBalance,
    isLoading: isDebtBalanceLoading,
    refetch: refetchDebtBalance,
  };
};

// Hook for reading collateral token balance
export const useCollateralTokenBalance = (address) => {
  const { data: collateralTokenBalance, isLoading: isCollateralBalanceLoading, refetch: refetchCollateralBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    collateralTokenBalance,
    isLoading: isCollateralBalanceLoading,
    refetch: refetchCollateralBalance,
  };
};
