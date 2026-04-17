"use client";
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther } from "viem";
import { namehash } from "viem/ens";

const REGISTRAR_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "parentNode",  type: "bytes32" },
      { name: "label",       type: "string"  },
      { name: "contenthash", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "isAvailable",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "parentNode", type: "bytes32" },
      { name: "label",      type: "string"  },
    ],
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

const REGISTRAR_ADDRESS = process.env.NEXT_PUBLIC_PETID_REGISTRAR_ADDRESS as `0x${string}`;

export function useRegister(parentDomain: "dogid.eth" | "catid.eth") {
  const address = REGISTRAR_ADDRESS;
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (label: string, contenthash: `0x${string}` = "0x") => {
    const parentNode = namehash(parentDomain) as `0x${string}`;
    writeContract({
      address,
      abi: REGISTRAR_ABI,
      functionName: "register",
      args: [parentNode, label, contenthash],
      value: parseEther("0.005"),
    });
  };

  return { register, hash, isPending, isConfirming, isSuccess, error };
}
