const fs = require('fs');
const path = require('path');

// Read the compiled contract artifacts
const cdpVaultArtifact = require('./artifacts/contracts/CDPVault.sol/CDPVault.json');
const creditAgentArtifact = require('./artifacts/contracts/CreditAgent.sol/CreditAgent.json');
const mockERC20Artifact = require('./artifacts/contracts/MockERC20.sol/MockERC20.json');

// Extract ABIs
const abis = {
  CDP_VAULT_ABI: cdpVaultArtifact.abi,
  CREDIT_AGENT_ABI: creditAgentArtifact.abi,
  ERC20_ABI: mockERC20Artifact.abi
};

// Generate the ABI file content
const abiFileContent = `// Auto-generated ABI file
export const CDP_VAULT_ABI = ${JSON.stringify(abis.CDP_VAULT_ABI, null, 2)};

export const CREDIT_AGENT_ABI = ${JSON.stringify(abis.CREDIT_AGENT_ABI, null, 2)};

export const ERC20_ABI = ${JSON.stringify(abis.ERC20_ABI, null, 2)};
`;

// Write to frontend
const frontendAbiPath = path.join(__dirname, 'frontend', 'src', 'contracts', 'abis.js');
fs.writeFileSync(frontendAbiPath, abiFileContent);

console.log('ABIs updated successfully!');
console.log('Updated file:', frontendAbiPath);

// Show the new functions
console.log('\nNew CDP Vault functions:');
const newFunctions = abis.CDP_VAULT_ABI.filter(item => 
  item.type === 'function' && 
  ['addCollateral', 'getTotalDebtWithInterest'].includes(item.name)
);
newFunctions.forEach(func => {
  console.log(`- ${func.name}(${func.inputs.map(i => i.type).join(', ')})`);
});
