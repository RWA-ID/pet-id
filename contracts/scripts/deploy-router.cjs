// Deploys PetIDPartnerRouter pointed at the live v3 registrar.
// Run: npx hardhat run scripts/deploy-router.cjs --network mainnet
const hre = require("hardhat");

const REGISTRAR = "0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1";
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance :", hre.ethers.formatEther(bal), "ETH");

  const F = await hre.ethers.getContractFactory("PetIDPartnerRouter");
  const gas = await hre.ethers.provider.estimateGas(
    await F.getDeployTransaction(REGISTRAR, NAME_WRAPPER)
  );
  const feeData = await hre.ethers.provider.getFeeData();
  console.log(
    "Est. cost:",
    hre.ethers.formatEther(gas * (feeData.maxFeePerGas ?? feeData.gasPrice)),
    "ETH",
    `(${gas} gas)`
  );

  if (process.env.DRY_RUN) return;

  const c = await F.deploy(REGISTRAR, NAME_WRAPPER);
  await c.waitForDeployment();
  console.log("PetIDPartnerRouter:", await c.getAddress());
  console.log("Owner/treasury    :", deployer.address);
  console.log(
    `Verify: npx hardhat verify --network mainnet ${await c.getAddress()} ${REGISTRAR} ${NAME_WRAPPER}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
