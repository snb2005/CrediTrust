const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);
  console.log('Deployer ETH balance:', ethers.utils.formatEther(await deployer.getBalance()));
  
  // Get token contracts
  const collateralToken = await ethers.getContractAt('MockERC20', '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0');
  const debtToken = await ethers.getContractAt('MockERC20', '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  
  const collateralBalance = await collateralToken.balanceOf(deployer.address);
  const debtBalance = await debtToken.balanceOf(deployer.address);
  
  console.log('Collateral token balance:', ethers.utils.formatEther(collateralBalance));
  console.log('Debt token balance:', ethers.utils.formatEther(debtBalance));
  
  // Check if user has approved the CDP vault
  const cdpVault = '0x9A676e781A523b5d0C0e43731313A708CB607508';
  const collateralAllowance = await collateralToken.allowance(deployer.address, cdpVault);
  const debtAllowance = await debtToken.allowance(deployer.address, cdpVault);
  
  console.log('Collateral allowance to CDP:', ethers.utils.formatEther(collateralAllowance));
  console.log('Debt allowance to CDP:', ethers.utils.formatEther(debtAllowance));
}

main().catch(console.error);
