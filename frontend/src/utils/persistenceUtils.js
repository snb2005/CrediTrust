// Utility functions for data persistence across the application

/**
 * Save data to localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {any} data - The data to save
 * @returns {boolean} - Success status
 */
export const saveToLocalStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    console.log(`✅ Data saved to localStorage: ${key}`, data);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save data to localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Load data from localStorage with error handling and validation
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if data doesn't exist or is invalid
 * @param {function} validator - Optional validator function
 * @returns {any} - The loaded data or default value
 */
export const loadFromLocalStorage = (key, defaultValue = null, validator = null) => {
  try {
    const serializedData = localStorage.getItem(key);
    
    if (serializedData === null) {
      console.log(`ℹ️ No data found in localStorage for key: ${key}`);
      return defaultValue;
    }
    
    const data = JSON.parse(serializedData);
    
    // Optional validation
    if (validator && !validator(data)) {
      console.warn(`⚠️ Invalid data structure in localStorage for key: ${key}`, data);
      return defaultValue;
    }
    
    console.log(`✅ Data loaded from localStorage: ${key}`, data);
    return data;
  } catch (error) {
    console.error(`❌ Failed to load data from localStorage: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Clear specific data from localStorage
 * @param {string} key - The localStorage key to clear
 */
export const clearFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    console.log(`✅ Cleared localStorage key: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to clear localStorage key: ${key}`, error);
  }
};

/**
 * Get all keys for a specific address pattern
 * @param {string} address - User address
 * @returns {object} - Object containing all keys for the address
 */
export const getUserStorageKeys = (address) => {
  return {
    lendingPositions: `lendingPositions_${address}`,
    borrowingLoans: `borrowingLoans_${address}`,
    transactionHistory: `transactionHistory_${address}`,
    userPreferences: `userPreferences_${address}`
  };
};

/**
 * Validator for lending positions array
 * @param {any} data - Data to validate
 * @returns {boolean} - Whether data is valid
 */
export const validateLendingPositions = (data) => {
  if (!Array.isArray(data)) return false;
  
  return data.every(position => 
    position &&
    typeof position.id !== 'undefined' &&
    typeof position.pool === 'string' &&
    typeof position.amount === 'string' &&
    typeof position.status === 'string'
  );
};

/**
 * Validator for borrowing loans array
 * @param {any} data - Data to validate
 * @returns {boolean} - Whether data is valid
 */
export const validateBorrowingLoans = (data) => {
  if (!Array.isArray(data)) return false;
  
  return data.every(loan => 
    loan &&
    typeof loan.id !== 'undefined' &&
    typeof loan.amount === 'string' &&
    typeof loan.collateral === 'string' &&
    typeof loan.status === 'string'
  );
};

/**
 * Migrate old data format to new format (if needed)
 * @param {any} data - Data to migrate
 * @param {string} type - Type of data ('lending' or 'borrowing')
 * @returns {any} - Migrated data
 */
export const migrateData = (data, type) => {
  if (!data) return [];
  
  // Add migration logic here if data structure changes
  if (type === 'lending') {
    return Array.isArray(data) ? data : [];
  }
  
  if (type === 'borrowing') {
    return Array.isArray(data) ? data : [];
  }
  
  return data;
};

/**
 * Debounced save function to prevent excessive localStorage writes
 * @param {function} saveFunction - Function to call for saving
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Debounced function
 */
export const debounceSave = (saveFunction, delay = 500) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      saveFunction(...args);
    }, delay);
  };
};
