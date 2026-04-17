import { createWalletClient, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";
import { readFileSync } from "fs";

// Load .env.local manually
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf-8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(s => s.trim()))
);

const NAME_WRAPPER    = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
const ETH_REGISTRAR   = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"; // BaseRegistrarImplementation

const account = privateKeyToAccount(env.ADMIN_WALLET_PRIVATE_KEY);
const transport = http(env.RPC_URL);

const wallet = createWalletClient({ account, chain: mainnet, transport });
const client = createPublicClient({ chain: mainnet, transport });

console.log("Wallet:", account.address);

const ethRegistrarAbi = [
  { name: "ownerOf",           type: "function", stateMutability: "view",       inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { name: "isApprovedForAll",  type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
];

const nameWrapperAbi = [
  { name: "wrapETH2LD", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "label",               type: "string"  },
      { name: "wrappedOwner",        type: "address" },
      { name: "ownerControlledFuses",type: "uint16"  },
      { name: "resolver",            type: "address" },
    ],
    outputs: [{ name: "expiry", type: "uint64" }]
  },
];

// Approve NameWrapper on ETH Registrar if needed
const isApproved = await client.readContract({
  address: ETH_REGISTRAR, abi: ethRegistrarAbi,
  functionName: "isApprovedForAll",
  args: [account.address, NAME_WRAPPER],
});

if (!isApproved) {
  console.log("Approving NameWrapper on ETH Registrar...");
  const hash = await wallet.writeContract({
    address: ETH_REGISTRAR, abi: ethRegistrarAbi,
    functionName: "setApprovalForAll",
    args: [NAME_WRAPPER, true],
  });
  await client.waitForTransactionReceipt({ hash });
  console.log("✅ Approved");
} else {
  console.log("NameWrapper already approved");
}

// Wrap each name
for (const label of ["dogid", "catid"]) {
  const tokenId = BigInt(keccak256(toBytes(label)));

  let owner;
  try {
    owner = await client.readContract({
      address: ETH_REGISTRAR, abi: ethRegistrarAbi,
      functionName: "ownerOf", args: [tokenId],
    });
  } catch {
    console.log(`❌ ${label}.eth not found in registrar — skipping`);
    continue;
  }

  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    console.log(`❌ ${label}.eth owned by ${owner}, not your wallet — skipping`);
    continue;
  }

  console.log(`Wrapping ${label}.eth...`);
  const hash = await wallet.writeContract({
    address: NAME_WRAPPER, abi: nameWrapperAbi,
    functionName: "wrapETH2LD",
    args: [label, account.address, 0, PUBLIC_RESOLVER],
  });
  await client.waitForTransactionReceipt({ hash });
  console.log(`✅ ${label}.eth wrapped`);
}

console.log("\nDone! Ready to deploy the registrar contract.");
