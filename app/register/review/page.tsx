"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { useRegister } from "@/hooks/useRegister";

export default function ReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<"fiat" | "crypto">("fiat");
  const [subdomain, setSubdomain] = useState("");
  const [parentDomain, setParentDomain] = useState<"dogid.eth" | "catid.eth">("dogid.eth");
  const [details, setDetails] = useState<any>(null);
  const [templateId, setTemplateId] = useState("");

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { register, isPending, isConfirming, isSuccess, error } = useRegister(parentDomain);

  useEffect(() => {
    setSubdomain(sessionStorage.getItem("petid_subdomain") ?? "");
    setParentDomain((sessionStorage.getItem("petid_parent") ?? "dogid.eth") as "dogid.eth" | "catid.eth");
    setDetails(JSON.parse(sessionStorage.getItem("petid_details") ?? "{}"));
    setTemplateId(sessionStorage.getItem("petid_template") ?? "");
  }, []);

  useEffect(() => {
    if (isSuccess) router.push("/success/crypto");
  }, [isSuccess]);

  const handleFiatPay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          parentDomain,
          ownerEmail: details?.ownerEmail,
          petName: details?.name,
          species: parentDomain === "dogid.eth" ? "dog" : "cat",
          templateId,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoPay = () => {
    register(subdomain);
  };

  if (!details) return null;

  const isCryptoLoading = isPending || isConfirming;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Review & Pay</h1>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="font-mono text-lg font-bold text-amber-800">
            {subdomain}.{parentDomain}
          </div>
          <div className="text-sm text-amber-600 mt-1">{details.name}'s permanent ENS identity</div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <div className="flex justify-between"><span>Pet Name</span><span className="font-medium">{details.name}</span></div>
          <div className="flex justify-between"><span>Breed</span><span className="font-medium">{details.breed || "—"}</span></div>
          <div className="flex justify-between"><span>Owner</span><span className="font-medium">{details.ownerName}</span></div>
          <div className="flex justify-between"><span>Email</span><span className="font-medium">{details.ownerEmail}</span></div>
          <div className="flex justify-between"><span>Template</span><span className="font-medium">{templateId}</span></div>
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>{payMethod === "fiat" ? "$19.99" : "0.00825 ETH"}</span>
          </div>
        </div>

        {/* Payment method toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button
            onClick={() => setPayMethod("fiat")}
            className={`flex-1 py-3 text-sm font-semibold transition ${payMethod === "fiat" ? "bg-amber-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            💳 Card / USDC / ETH
          </button>
          <button
            onClick={() => setPayMethod("crypto")}
            className={`flex-1 py-3 text-sm font-semibold transition ${payMethod === "crypto" ? "bg-amber-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            🦊 Wallet (0.00825 ETH)
          </button>
        </div>

        {payMethod === "fiat" ? (
          <>
            <button
              onClick={handleFiatPay}
              disabled={loading}
              className="w-full bg-amber-700 text-white font-bold py-4 rounded-xl hover:bg-amber-800 transition disabled:opacity-40 text-lg"
            >
              {loading ? "Redirecting…" : "Pay $19.99 →"}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Accepts credit card, USDC, or ETH via Helio
            </p>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
              <strong>Crypto flow:</strong> You sign the transaction yourself — no middleman. Your wallet gets permanent, irrevocable ownership of {subdomain}.{parentDomain} with <code>PARENT_CANNOT_CONTROL</code> fuse burned.
            </div>
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={handleCryptoPay}
                disabled={isCryptoLoading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-40 text-lg"
              >
                {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming tx…" : "Pay 0.00825 ETH →"}
              </button>
            )}
            {error && (
              <p className="text-red-500 text-xs mt-2 text-center">{error.message}</p>
            )}
            {isConnected && (
              <p className="text-center text-xs text-gray-400 mt-3">
                Connected: {address?.slice(0, 6)}…{address?.slice(-4)}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
