import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Trash2, RefreshCw, Database, Eye, EyeOff } from 'lucide-react';
import { 
  getUserStorageKeys,
  loadFromLocalStorage,
  saveToLocalStorage,
  clearFromLocalStorage
} from '../utils/persistenceUtils';

const DataPersistenceDebugger = () => {
  const { address } = useAccount();
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState({});
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshData = () => {
    if (!address) return;
    
    const storageKeys = getUserStorageKeys(address);
    const lendingPositions = loadFromLocalStorage(storageKeys.lendingPositions, []);
    const borrowingLoans = loadFromLocalStorage(storageKeys.borrowingLoans, []);
    
    setData({
      address,
      lendingPositions,
      borrowingLoans,
      positionsCount: lendingPositions.length,
      loansCount: borrowingLoans.length,
      lastRefresh: new Date().toLocaleTimeString()
    });
    
    setRefreshCount(prev => prev + 1);
  };

  useEffect(() => {
    refreshData();
  }, [address]);

  const clearAllData = () => {
    if (!address) return;
    
    const storageKeys = getUserStorageKeys(address);
    clearFromLocalStorage(storageKeys.lendingPositions);
    clearFromLocalStorage(storageKeys.borrowingLoans);
    
    console.log('🗑️ Cleared all persistence data');
    refreshData();
  };

  const addTestData = () => {
    if (!address) return;
    
    const storageKeys = getUserStorageKeys(address);
    
    // Add test lending position
    const testPosition = {
      id: `test_${Date.now()}`,
      pool: 'Test Pool',
      amount: '1000',
      earned: '50.00',
      apy: '10.0%',
      duration: '30 days',
      status: 'active',
      dailyEarning: '2.74',
      depositDate: new Date().toISOString().split('T')[0],
      nextReward: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'test'
    };
    
    const existingPositions = loadFromLocalStorage(storageKeys.lendingPositions, []);
    saveToLocalStorage(storageKeys.lendingPositions, [...existingPositions, testPosition]);
    
    // Add test borrowing loan
    const testLoan = {
      id: `test_${Date.now()}`,
      amount: '500',
      remainingAmount: '450',
      interestRate: '12.3%',
      term: '12 months',
      nextPayment: '2024-07-15',
      paymentAmount: '45.68',
      status: 'active',
      collateral: '1.0 ETH',
      daysRemaining: 330,
      type: 'test'
    };
    
    const existingLoans = loadFromLocalStorage(storageKeys.borrowingLoans, []);
    saveToLocalStorage(storageKeys.borrowingLoans, [...existingLoans, testLoan]);
    
    console.log('✅ Added test data');
    refreshData();
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Show Data Debug Panel"
        >
          <Database size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Database size={16} />
          Data Persistence Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
          title="Hide Panel"
        >
          <EyeOff size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={clearAllData}
            className="flex-1 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
        
        <button
          onClick={addTestData}
          className="w-full bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
        >
          Add Test Data
        </button>
        
        <div className="bg-gray-50 p-3 rounded text-sm">
          <div className="font-medium mb-2">Storage Status:</div>
          <div className="space-y-1 text-xs">
            <div>Address: {data.address ? `${data.address.slice(0, 6)}...${data.address.slice(-4)}` : 'Not connected'}</div>
            <div>Lending Positions: {data.positionsCount || 0}</div>
            <div>Borrowing Loans: {data.loansCount || 0}</div>
            <div>Last Refresh: {data.lastRefresh || 'Never'}</div>
            <div>Refresh Count: {refreshCount}</div>
          </div>
        </div>
        
        {data.lendingPositions && data.lendingPositions.length > 0 && (
          <div className="bg-green-50 p-2 rounded text-xs">
            <div className="font-medium mb-1">Recent Lending Positions:</div>
            {data.lendingPositions.slice(-2).map((pos, i) => (
              <div key={i} className="truncate">
                {pos.pool}: ${pos.amount} ({pos.type || 'normal'})
              </div>
            ))}
          </div>
        )}
        
        {data.borrowingLoans && data.borrowingLoans.length > 0 && (
          <div className="bg-blue-50 p-2 rounded text-xs">
            <div className="font-medium mb-1">Recent Borrowing Loans:</div>
            {data.borrowingLoans.slice(-2).map((loan, i) => (
              <div key={i} className="truncate">
                ${loan.amount} at {loan.interestRate} ({loan.type || 'normal'})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPersistenceDebugger;
