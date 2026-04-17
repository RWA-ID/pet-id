export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SuccessPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, subdomain, parent_domain, status, page_cid")
    .eq("id", petId)
    .single();

  if (!pet) {
    return <div className="p-8 text-center text-gray-500">Pet not found.</div>;
  }

  const ensUrl = `https://${pet.subdomain}.${pet.parent_domain}.limo`;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2">{pet.name}&apos;s Page is Live!</h1>
        <p className="text-gray-500 mb-6">
          {pet.subdomain}.{pet.parent_domain}
        </p>

        {pet.status === "live" ? (
          <>
            {/* QR Code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${pet.id}`}
              alt="QR Code"
              className="w-64 h-64 mx-auto mb-4 rounded-xl shadow-lg"
            />

            <a
              href={`/api/qr/${pet.id}`}
              download={`${pet.name}-petid-qr.png`}
              className="block bg-amber-700 text-white font-bold py-3 px-6 rounded-xl mb-3 hover:bg-amber-800 transition"
            >
              ⬇️ Download QR Code (PNG)
            </a>

            <a
              href={ensUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-2 border-amber-700 text-amber-700 font-bold py-3 px-6 rounded-xl mb-6 hover:bg-amber-50 transition"
            >
              View {pet.name}&apos;s Page →
            </a>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 font-medium">
              {pet.status === "minting" || pet.status === "paid"
                ? "⏳ Your pet's page is being minted on IPFS + ENS. This usually takes 1–2 minutes. Refresh to check."
                : pet.status === "failed"
                ? "❌ Minting failed. Our team has been notified. Please contact support."
                : "⏳ Processing your payment…"}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-4">
          Print the QR code and attach it to {pet.name}&apos;s collar or leash.
          Anyone who scans it will see this page — forever.
        </p>

        <Link href="/" className="block mt-6 text-sm text-amber-700 hover:underline">
          ← Create another Pet ID
        </Link>
      </div>
    </main>
  );
}
