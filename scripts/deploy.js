const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SupplyChain contract...\n");

  // Get the deployer's wallet — this will be the admin
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy the contract
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy();
  await supplyChain.waitForDeployment();

  const address = await supplyChain.getAddress();
  console.log("\nSupplyChain deployed to:", address);
  console.log("\nAdmin address:", deployer.address);
  console.log("\nDeployment complete! ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });