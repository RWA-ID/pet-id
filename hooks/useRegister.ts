"use client";
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther } from "viem";

const REGISTRAR_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "label",       type: "string"  },
      { name: "contenthash", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "isAvailable",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "available", type: "bool" }],
  },
  {
    name: "registrationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

function useRegistrarAddress(parentDomain: "dogid.eth" | "catid.eth"): `0x${string}` {
  return (parentDomain === "dogid.eth"
    ? process.env.NEXT_PUBLIC_DOGID_REGISTRAR_ADDRESS
    : process.env.NEXT_PUBLIC_CATID_REGISTRAR_ADDRESS) as `0x${string}`;
}

export function useRegister(parentDomain: "dogid.eth" | "catid.eth") {
  const address = useRegistrarAddress(parentDomain);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (label: string, contenthash: `0x${string}` = "0x") => {
    writeContract({
      address,
      abi: REGISTRAR_ABI,
      functionName: "register",
      args: [label, contenthash],
      value: parseEther("0.005"),
    });
  };

  return { register, hash, isPending, isConfirming, isSuccess, error };
}
