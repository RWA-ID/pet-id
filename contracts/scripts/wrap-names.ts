import { ethers } from "hardhat";

const NAME_WRAPPER    = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
const ETH_REGISTRAR   = "0x253553366Da8546fC250F225fe3d25d0C782303b"; // ETH BaseRegistrarImplementation

const NAME_WRAPPER_ABI = [
  "function wrapETH2LD(string calldata label, address wrappedOwner, uint16 ownerControlledFuses, address resolver) external returns (uint64 expiry)",
  "function ownerOf(uint256 id) external view returns (address)",
];

const ETH_REGISTRAR_ABI = [
  "function ownerOf(uint256 id) external view returns (address)",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wrapping with wallet:", signer.address);

  const nameWrapper  = new ethers.Contract(NAME_WRAPPER,  NAME_WRAPPER_ABI,  signer);
  const ethRegistrar = new ethers.Contract(ETH_REGISTRAR, ETH_REGISTRAR_ABI, signer);

  const labels = ["dogid", "catid"];

  // Approve NameWrapper to manage names on behalf of this wallet (required once)
  const isApproved = await ethRegistrar.isApprovedForAll(signer.address, NAME_WRAPPER);
  if (!isApproved) {
    console.log("Approving NameWrapper on ETH Registrar...");
    const tx = await ethRegistrar.setApprovalForAll(NAME_WRAPPER, true);
    await tx.wait();
    console.log("✅ Approved");
  } else {
    console.log("NameWrapper already approved on ETH Registrar");
  }

  for (const label of labels) {
    const tokenId = ethers.keccak256(ethers.toUtf8Bytes(label));
    const tokenIdBN = BigInt(tokenId);

    // Check ownership
    try {
      const owner = await ethRegistrar.ownerOf(tokenIdBN);
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log(`❌ ${label}.eth is owned by ${owner}, not your wallet — skipping`);
        continue;
      }
    } catch {
      console.log(`❌ Could not find ${label}.eth in ETH Registrar — skipping`);
      continue;
    }

    console.log(`Wrapping ${label}.eth...`);
    const tx = await nameWrapper.wrapETH2LD(label, signer.address, 0, PUBLIC_RESOLVER);
    await tx.wait();
    console.log(`✅ ${label}.eth wrapped`);
  }

  console.log("\nDone! Both names are wrapped. Now run deploy.ts to deploy the registrar.");
}

main().catch(console.error);
