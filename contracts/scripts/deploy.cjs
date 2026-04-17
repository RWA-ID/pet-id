const { ethers } = require("hardhat");
const { namehash } = require("ethers");

const ENS_REGISTRY    = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const NAME_WRAPPER    = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Registrar = await ethers.deployContract("PetSubnameRegistrar", [
    NAME_WRAPPER, ENS_REGISTRY, PUBLIC_RESOLVER,
  ]);
  await Registrar.waitForDeployment();
  const registrarAddr = await Registrar.getAddress();
  console.log("PetSubnameRegistrar deployed to:", registrarAddr);

  const dogNode = namehash("dogid.eth");
  const catNode = namehash("catid.eth");

  let tx = await Registrar.addParent(dogNode, "dogid.eth");
  await tx.wait();
  console.log("✅ Added dogid.eth");

  tx = await Registrar.addParent(catNode, "catid.eth");
  await tx.wait();
  console.log("✅ Added catid.eth");

  console.log("\n⚠️  Next steps:");
  console.log(`1. From your wallet, approve the registrar on NameWrapper:`);
  console.log(`   nameWrapper.setApprovalForAll("${registrarAddr}", true)`);
  console.log(`2. Set PETID_REGISTRAR_ADDRESS=${registrarAddr} in Cloudflare + Railway env vars`);
}

main().catch(console.error);
