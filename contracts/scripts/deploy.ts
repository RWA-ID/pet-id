import { ethers } from "hardhat";
import { namehash } from "ethers";

const ENS_REGISTRY    = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const NAME_WRAPPER    = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy single registrar for all parent domains
  const Registrar = await ethers.deployContract("PetSubnameRegistrar", [
    NAME_WRAPPER, ENS_REGISTRY, PUBLIC_RESOLVER,
  ]);
  await Registrar.waitForDeployment();
  const registrarAddr = await Registrar.getAddress();
  console.log("PetSubnameRegistrar deployed to:", registrarAddr);

  // Register both parent domains
  const dogNode = namehash("dogid.eth");
  const catNode = namehash("catid.eth");

  let tx = await Registrar.addParent(dogNode, "dogid.eth");
  await tx.wait();
  console.log("✅ Added dogid.eth");

  tx = await Registrar.addParent(catNode, "catid.eth");
  await tx.wait();
  console.log("✅ Added catid.eth");

  console.log("\n⚠️  Next steps:");
  console.log("1. Wrap dogid.eth and catid.eth via https://app.ens.domains");
  console.log("2. From each domain owner wallet, approve the registrar:");
  console.log(`   nameWrapper.setApprovalForAll("${registrarAddr}", true)`);
  console.log(`3. Set PETID_REGISTRAR_ADDRESS=${registrarAddr} in .env.local`);
}

main().catch(console.error);
