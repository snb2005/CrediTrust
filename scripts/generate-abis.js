const fs = require('fs');
const path = require('path');

// Read the compiled artifacts
const artifactsPath = path.join(__dirname, '../artifacts/contracts');

function extractABI(contractName, fileName) {
    const artifactPath = path.join(artifactsPath, fileName, `${contractName}.json`);
    
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        return artifact.abi;
    } catch (error) {
        console.error(`Error reading artifact for ${contractName}:`, error.message);
        return null;
    }
}

// Extract ABIs
const cdpVaultABI = extractABI('CDPVault', 'CDPVault.sol');
const creditAgentABI = extractABI('CreditAgent', 'CreditAgent.sol');
const erc20ABI = extractABI('MockERC20', 'MockERC20.sol');
const x402RouterABI = extractABI('x402Router', 'x402Router.sol');

// Create the ABI file content
const abiContent = `// Auto-generated ABI file
export const CDP_VAULT_ABI = ${JSON.stringify(cdpVaultABI, null, 2)};

export const CREDIT_AGENT_ABI = ${JSON.stringify(creditAgentABI, null, 2)};

export const ERC20_ABI = ${JSON.stringify(erc20ABI, null, 2)};

export const X402_ROUTER_ABI = ${JSON.stringify(x402RouterABI, null, 2)};
`;

// Write to the frontend
const outputPath = path.join(__dirname, '../frontend/src/contracts/abis.js');
fs.writeFileSync(outputPath, abiContent);

console.log('✅ ABIs generated successfully!');
console.log('📄 Output file:', outputPath);
console.log('📊 Generated ABIs:');
console.log(`  - CDP_VAULT_ABI: ${cdpVaultABI ? cdpVaultABI.length : 0} functions`);
console.log(`  - CREDIT_AGENT_ABI: ${creditAgentABI ? creditAgentABI.length : 0} functions`);
console.log(`  - ERC20_ABI: ${erc20ABI ? erc20ABI.length : 0} functions`);
console.log(`  - X402_ROUTER_ABI: ${x402RouterABI ? x402RouterABI.length : 0} functions`);
