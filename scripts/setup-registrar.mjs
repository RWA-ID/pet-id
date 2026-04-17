import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { namehash } from "viem/ens";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf-8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(s => s.trim()))
);

const REGISTRAR   = "0xef9c86dc9b3c6aea5477d497300592c050007063";
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";

const account   = privateKeyToAccount(env.ADMIN_WALLET_PRIVATE_KEY);
const transport = http(env.RPC_URL);
const wallet    = createWalletClient({ account, chain: mainnet, transport });
const client    = createPublicClient({ chain: mainnet, transport });

console.log("Wallet:", account.address);
console.log("Registrar:", REGISTRAR);

const registrarAbi = parseAbi([
  "function addParent(bytes32 node, string calldata label) external",
  "function supportedParents(bytes32) external view returns (bool)",
]);

const nameWrapperAbi = parseAbi([
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
]);

// 1. Add parent domains
for (const [label, domain] of [["dogid", "dogid.eth"], ["catid", "catid.eth"]]) {
  const node = namehash(domain);
  const already = await client.readContract({ address: REGISTRAR, abi: registrarAbi, functionName: "supportedParents", args: [node] });
  if (already) {
    console.log(`${domain} already added`);
    continue;
  }
  console.log(`Adding ${domain}...`);
  const hash = await wallet.writeContract({ address: REGISTRAR, abi: registrarAbi, functionName: "addParent", args: [node, label] });
  await client.waitForTransactionReceipt({ hash });
  console.log(`✅ ${domain} added`);
}

// 2. Approve registrar on NameWrapper
const approved = await client.readContract({ address: NAME_WRAPPER, abi: nameWrapperAbi, functionName: "isApprovedForAll", args: [account.address, REGISTRAR] });
if (!approved) {
  console.log("Approving registrar on NameWrapper...");
  const hash = await wallet.writeContract({ address: NAME_WRAPPER, abi: nameWrapperAbi, functionName: "setApprovalForAll", args: [REGISTRAR, true] });
  await client.waitForTransactionReceipt({ hash });
  console.log("✅ Registrar approved on NameWrapper");
} else {
  console.log("Registrar already approved on NameWrapper");
}

console.log("\n✅ All done! Set PETID_REGISTRAR_ADDRESS=" + REGISTRAR + " in Cloudflare and Railway.");
