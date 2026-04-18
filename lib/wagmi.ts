"use client";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected(), metaMask(), walletConnect({ projectId })],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL_MAINNET),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
  },
  ssr: true,
});
