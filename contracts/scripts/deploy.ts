import { ethers } from "hardhat";
import { namehash } from "ethers";

const ENS_REGISTRY    = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const NAME_WRAPPER    = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const dogNode = namehash("dogid.eth");
  const DogRegistrar = await ethers.deployContract("PetSubnameRegistrar", [
    NAME_WRAPPER, ENS_REGISTRY, PUBLIC_RESOLVER, dogNode,
  ]);
  await DogRegistrar.waitForDeployment();
  const dogAddr = await DogRegistrar.getAddress();
  console.log("DogID Registrar:", dogAddr);

  const catNode = namehash("catid.eth");
  const CatRegistrar = await ethers.deployContract("PetSubnameRegistrar", [
    NAME_WRAPPER, ENS_REGISTRY, PUBLIC_RESOLVER, catNode,
  ]);
  await CatRegistrar.waitForDeployment();
  const catAddr = await CatRegistrar.getAddress();
  console.log("CatID Registrar:", catAddr);

  console.log("\n⚠️  Post-deployment steps required:");
  console.log("1. Wrap dogid.eth and catid.eth via https://app.ens.domains");
  console.log("2. Approve registrars as NameWrapper operators:");
  console.log(`   nameWrapper.setApprovalForAll("${dogAddr}", true)  // from dogid.eth owner`);
  console.log(`   nameWrapper.setApprovalForAll("${catAddr}", true)  // from catid.eth owner`);
  console.log("3. Update DOGID_REGISTRAR_ADDRESS and CATID_REGISTRAR_ADDRESS in .env.local");
}

main().catch(console.error);
