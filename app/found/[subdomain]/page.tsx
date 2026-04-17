export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function FoundPetPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("name, owner_name, owner_phone, subdomain, parent_domain, species, photo_cid")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .single();

  if (!pet) notFound();

  const photoUrl = pet.photo_cid
    ? `${process.env.PINATA_GATEWAY_URL ?? "https://ipfs.onchain-id.id"}/ipfs/${pet.photo_cid}`
    : `/assets/default-${pet.species}.jpg`;

  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-600 p-6 text-center text-white">
          <div className="text-4xl mb-2">📍</div>
          <h1 className="text-2xl font-bold">I Found {pet.name}!</h1>
          <p className="text-amber-100 text-sm mt-1">
            {pet.subdomain}.{pet.parent_domain}
          </p>
        </div>

        {/* Pet photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={pet.name}
          className="w-full h-48 object-cover" />

        {/* Owner info */}
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">
            Please help <strong>{pet.name}</strong> get home safely.
            Contact the owner:
          </p>

          {pet.owner_phone ? (
            <>
              {/* Call button */}
              <a
                href={`tel:${pet.owner_phone}`}
                className="flex items-center justify-center gap-3 w-full bg-green-600 text-white font-bold py-4 rounded-xl mb-3 hover:bg-green-700 transition text-lg"
              >
                📞 Call {pet.owner_name}
              </a>

              {/* SMS with location */}
              <LocationSMSButton
                phone={pet.owner_phone}
                petName={pet.name}
                ownerName={pet.owner_name}
              />
            </>
          ) : (
            <p className="text-center text-gray-400 text-sm">
              No phone number on file. Please check {pet.name}&apos;s profile for contact info.
            </p>
          )}
        </div>

        <div className="px-6 pb-6 text-center">
          <a href={`https://${pet.subdomain}.${pet.parent_domain}.link`}
            className="text-sm text-amber-700 hover:underline">
            View {pet.name}&apos;s full profile →
          </a>
        </div>
      </div>
    </main>
  );
}

// Client component for location-aware SMS
function LocationSMSButton({ phone, petName, ownerName }: {
  phone: string;
  petName: string;
  ownerName: string;
}) {
  // Base SMS — location added client-side via JS
  const baseSms = `Hi ${ownerName}, I found your pet ${petName}! I'm at: `;
  const fallbackSms = `sms:${phone}?body=${encodeURIComponent(baseSms + "[my location]")}`;

  return (
    <a
      href={fallbackSms}
      onClick={(e) => {
        if (navigator.geolocation) {
          e.preventDefault();
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
              const smsBody = encodeURIComponent(`${baseSms}${mapsUrl}`);
              window.location.href = `sms:${phone}?body=${smsBody}`;
            },
            () => {
              // User denied location — send without it
              window.location.href = fallbackSms;
            }
          );
        }
      }}
      className="flex items-center justify-center gap-3 w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
    >
      💬 Text Owner + Share Location
    </a>
  );
}
