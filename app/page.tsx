import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-800 to-amber-600 text-white py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Your Pet Deserves a Permanent Address</h1>
        <p className="text-xl text-amber-100 mb-8 max-w-xl mx-auto">
          Give your dog or cat an ENS subdomain — a beautiful profile page on IPFS,
          accessible forever via a QR collar tag.
        </p>
        <Link
          href="/register"
          className="inline-block bg-white text-amber-800 font-bold px-8 py-4 rounded-xl text-lg hover:bg-amber-50 transition"
        >
          Create Your Pet&apos;s ID — $9.99
        </Link>
        <p className="mt-4 text-amber-200 text-sm">No crypto wallet required · Pay by card via Helio</p>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Fill the Form", desc: "Enter your pet's details and pick a beautiful template." },
            { step: "2", title: "Pay by Card", desc: "Secure checkout via Helio — credit card, USDC, or ETH accepted." },
            { step: "3", title: "Get QR + ENS", desc: "Receive a printable QR code and your pet's permanent ENS page." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{step}</div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
        <p className="text-gray-600 mb-8">One-time fee. Permanent. No subscriptions.</p>
        <div className="inline-block border-2 border-amber-600 rounded-2xl p-8">
          <div className="text-5xl font-black text-amber-700">$9.99</div>
          <div className="text-gray-600 mt-2">per pet · forever</div>
          <ul className="text-left mt-6 space-y-2 text-sm text-gray-700">
            {[
              "ENS subdomain (dogid.eth or catid.eth)",
              "Beautiful IPFS-hosted profile page",
              "Printable QR code PNG",
              "Confirmation email",
              "Permanent — no renewals",
            ].map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link href="/register" className="block mt-6 bg-amber-700 text-white font-bold py-3 px-6 rounded-xl hover:bg-amber-800 transition">
            Get Started →
          </Link>
        </div>
      </section>
    </main>
  );
}
