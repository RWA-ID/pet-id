"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";

export default function RegisterPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("");
  const [parentDomain, setParentDomain] = useState<"dogid.eth" | "catid.eth">("dogid.eth");
  const [availability, setAvailability] = useState<{ available: boolean; suggestions?: string[] } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAvailability = useCallback(async (sub: string, parent: string) => {
    if (sub.length < 3) { setAvailability(null); return; }
    setChecking(true);
    try {
      const res = await fetch("/api/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: sub, parentDomain: parent }),
      });
      const data = await res.json();
      setAvailability(data);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleSubdomainChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(clean);
    checkAvailability(clean, parentDomain);
  };

  const handleContinue = () => {
    if (!availability?.available) return;
    sessionStorage.setItem("petid_subdomain", subdomain);
    sessionStorage.setItem("petid_parent", parentDomain);
    router.push("/register/details");
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Name Your Pet's ID</h1>
          <p className="text-gray-500 mt-2">Choose an ENS subdomain for your pet</p>
        </div>

        {/* Species/Domain toggle */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(["dogid.eth", "catid.eth"] as const).map((domain) => (
            <button
              key={domain}
              onClick={() => { setParentDomain(domain); checkAvailability(subdomain, domain); }}
              className={`p-4 rounded-xl border-2 font-bold transition ${
                parentDomain === domain
                  ? "border-amber-600 bg-amber-50 text-amber-800"
                  : "border-gray-200 text-gray-500 hover:border-amber-300"
              }`}
            >
              {domain === "dogid.eth" ? "🐕 Dog" : "🐈 Cat"}
              <div className="text-xs font-normal mt-1">{domain}</div>
            </button>
          ))}
        </div>

        {/* Subdomain input */}
        <div className="mb-2">
          <div className="flex items-center border-2 rounded-xl overflow-hidden border-gray-200 focus-within:border-amber-500">
            <input
              type="text"
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              placeholder="max"
              className="flex-1 px-4 py-3 outline-none text-lg font-mono"
            />
            <span className="px-3 py-3 text-gray-400 font-mono text-sm bg-gray-50">.{parentDomain}</span>
          </div>
        </div>

        {/* Availability badge */}
        {subdomain.length >= 3 && (
          <div className="mb-4 text-sm">
            {checking && <span className="text-gray-400">Checking availability…</span>}
            {!checking && availability?.available === true && (
              <span className="text-green-600 font-medium">✓ Available!</span>
            )}
            {!checking && availability?.available === false && (
              <div>
                <span className="text-red-500 font-medium">✗ Already taken</span>
                {availability.suggestions && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {availability.suggestions.map((s) => (
                      <button key={s} onClick={() => handleSubdomainChange(s)}
                        className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-amber-100 text-xs">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!availability?.available}
          className="w-full bg-amber-700 text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-amber-800 transition"
        >
          Continue →
        </button>
      </div>
    </main>
  );
}
