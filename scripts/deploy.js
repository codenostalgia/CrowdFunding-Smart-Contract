const hre = require("hardhat");

async function main() {
  const crowdFundingContract = await hre.ethers.getContractFactory("CrowdFunding");
  const crowdFunding = await crowdFundingContract.deploy();
  await crowdFunding.deployed();
  console.log("crowdFunding deployed to:", crowdFunding.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
