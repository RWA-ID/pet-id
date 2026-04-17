"use client";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL_MAINNET),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
  },
  ssr: true,
});
