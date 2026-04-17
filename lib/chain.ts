import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL!),
});

export function getAdminWallet() {
  const account = privateKeyToAccount(process.env.ADMIN_WALLET_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: mainnet,
    transport: http(process.env.RPC_URL!),
  });
}

const REGISTRAR_ABI = parseAbi([
  "function adminRegister(string calldata label, address owner, bytes calldata contenthash) external",
]);

export async function adminRegisterOnChain(
  registrarAddress: `0x${string}`,
  label: string,
  ownerAddress: `0x${string}`,
  contenthash: `0x${string}`
): Promise<string> {
  const wallet = getAdminWallet();
  const hash = await wallet.writeContract({
    address: registrarAddress,
    abi: REGISTRAR_ABI,
    functionName: "adminRegister",
    args: [label, ownerAddress, contenthash as `0x${string}`],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
