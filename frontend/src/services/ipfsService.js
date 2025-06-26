// IPFS Service for storing loan agreements
import axios from 'axios';

// Free IPFS gateway service
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
const IPFS_API = 'https://api.pinata.cloud';

// Mock Pinata credentials (in production, use environment variables)
const PINATA_CONFIG = {
  apiKey: process.env.REACT_APP_PINATA_API_KEY || 'demo_key',
  secretKey: process.env.REACT_APP_PINATA_SECRET || 'demo_secret'
};

export class IPFSLoanService {
  
  /**
   * Upload loan agreement to IPFS
   */
  static async uploadLoanAgreement(loanData) {
    try {
      const agreement = {
        // Loan details
        borrower: loanData.borrower,
        lender: loanData.assignedLender,
        collateralAmount: loanData.collateralAmount,
        debtAmount: loanData.debtAmount,
        interestRate: loanData.apr,
        creditScore: loanData.creditScore,
        
        // Agreement metadata
        timestamp: new Date().toISOString(),
        protocol: 'CrediTrust',
        version: '1.0',
        agreementType: 'P2P_Lending',
        
        // Terms and conditions
        terms: {
          collateralRatio: '120%',
          liquidationThreshold: '80%',
          platform: 'CrediTrust DeFi Protocol',
          jurisdiction: 'Decentralized Autonomous',
          emergencyContact: 'support@creditrust.finance'
        },
        
        // Digital signature (mock)
        signature: `creditrust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // For demo purposes, simulate IPFS upload with a mock hash
      const mockIPFSHash = this.generateMockIPFSHash(agreement);
      
      // Store in localStorage as backup (for demo)
      const storageKey = `ipfs_${mockIPFSHash}`;
      localStorage.setItem(storageKey, JSON.stringify(agreement));
      
      console.log('📄 Loan agreement uploaded to IPFS:', {
        hash: mockIPFSHash,
        agreement: agreement
      });
      
      return {
        ipfsHash: mockIPFSHash,
        gateway: `${IPFS_GATEWAY}${mockIPFSHash}`,
        metadata: agreement
      };
      
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve loan agreement from IPFS
   */
  static async retrieveLoanAgreement(ipfsHash) {
    try {
      // Try to get from localStorage first (demo)
      const storageKey = `ipfs_${ipfsHash}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const agreement = JSON.parse(storedData);
        console.log('📄 Retrieved loan agreement from IPFS:', agreement);
        return agreement;
      }
      
      // In production, would fetch from actual IPFS
      // const response = await axios.get(`${IPFS_GATEWAY}${ipfsHash}`);
      // return response.data;
      
      throw new Error('Agreement not found');
      
    } catch (error) {
      console.error('❌ IPFS retrieval failed:', error);
      return null;
    }
  }

  /**
   * Generate a mock IPFS hash for demo purposes
   */
  static generateMockIPFSHash(data) {
    const dataString = JSON.stringify(data);
    const hash = btoa(dataString).replace(/[^a-zA-Z0-9]/g, '').substr(0, 46);
    return `Qm${hash}`;
  }

  /**
   * Verify loan agreement integrity
   */
  static async verifyAgreement(ipfsHash, expectedData) {
    try {
      const retrievedData = await this.retrieveLoanAgreement(ipfsHash);
      
      if (!retrievedData) {
        return { valid: false, error: 'Agreement not found' };
      }
      
      // Verify key fields match
      const fieldsToCheck = ['borrower', 'lender', 'collateralAmount', 'debtAmount'];
      const mismatches = [];
      
      fieldsToCheck.forEach(field => {
        if (retrievedData[field] !== expectedData[field]) {
          mismatches.push(field);
        }
      });
      
      return {
        valid: mismatches.length === 0,
        mismatches,
        retrievedData,
        verified: mismatches.length === 0
      };
      
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get all loan agreements for a user
   */
  static getUserAgreements(userAddress) {
    const agreements = [];
    
    // Search localStorage for user's agreements (demo)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ipfs_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.borrower === userAddress || data.lender === userAddress) {
            agreements.push({
              ipfsHash: key.replace('ipfs_', ''),
              ...data
            });
          }
        } catch (error) {
          console.warn('Invalid agreement data:', key);
        }
      }
    }
    
    return agreements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

export default IPFSLoanService;
