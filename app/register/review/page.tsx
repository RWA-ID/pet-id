"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [parentDomain, setParentDomain] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    setSubdomain(sessionStorage.getItem("petid_subdomain") ?? "");
    setParentDomain(sessionStorage.getItem("petid_parent") ?? "dogid.eth");
    setDetails(JSON.parse(sessionStorage.getItem("petid_details") ?? "{}"));
    setTemplateId(sessionStorage.getItem("petid_template") ?? "");
  }, []);

  const handlePay = async () => {
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
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  if (!details) return null;

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

        <div className="space-y-2 text-sm text-gray-600 mb-8">
          <div className="flex justify-between"><span>Pet Name</span><span className="font-medium">{details.name}</span></div>
          <div className="flex justify-between"><span>Breed</span><span className="font-medium">{details.breed || "—"}</span></div>
          <div className="flex justify-between"><span>Owner</span><span className="font-medium">{details.ownerName}</span></div>
          <div className="flex justify-between"><span>Email</span><span className="font-medium">{details.ownerEmail}</span></div>
          <div className="flex justify-between"><span>Template</span><span className="font-medium">{templateId}</span></div>
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span><span>$9.99</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-amber-700 text-white font-bold py-4 rounded-xl hover:bg-amber-800 transition disabled:opacity-40 text-lg"
        >
          {loading ? "Redirecting…" : "Pay $9.99 with Helio →"}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Accepts credit card, USDC, or ETH via Helio
        </p>
      </div>
    </main>
  );
}
