import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CDP_VAULT_ABI, CREDIT_AGENT_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../utils/wagmi';
import toast from 'react-hot-toast';

// Hook for CDP Vault operations
export const useCDPVault = () => {
  const { writeContract, isPending: isWritePending } = useWriteContract();

  const depositCollateral = async (amount) => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'depositCollateral',
        args: [amount],
      });
      toast.success('Collateral deposit initiated!');
      return hash;
    } catch (error) {
      toast.error('Failed to deposit collateral');
      throw error;
    }
  };

  const borrowDebt = async (amount) => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'borrowDebt',
        args: [amount],
      });
      toast.success('Loan request submitted!');
      return hash;
    } catch (error) {
      toast.error('Failed to borrow');
      throw error;
    }
  };

  const repayDebt = async (amount) => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.CDP_VAULT,
        abi: CDP_VAULT_ABI,
        functionName: 'repayDebt',
        args: [amount],
      });
      toast.success('Repayment initiated!');
      return hash;
    } catch (error) {
      toast.error('Failed to repay debt');
      throw error;
    }
  };

  const withdrawCollateral = async (amount) => {
    try {
      const hash = await writeContract({
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

  return {
    depositCollateral,
    borrowDebt,
    repayDebt,
    withdrawCollateral,
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
