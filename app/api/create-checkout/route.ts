import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helio create payment link endpoint
const HELIO_API_URL = "https://api.hel.io/v1/paylink/create";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subdomain, parentDomain, ownerEmail, petName, species, templateId } = body;

  const supabase = createClient();

  // Re-check availability before charging
  const { data: existing } = await supabase
    .from("pets")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("parent_domain", parentDomain)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Subdomain taken" }, { status: 409 });
  }

  // Create pending DB record to hold subdomain
  const { data: pet, error } = await supabase
    .from("pets")
    .insert({
      subdomain,
      parent_domain: parentDomain,
      species,
      name: petName,
      owner_email: ownerEmail,
      template_id: templateId,
      status: "pending",
    })
    .select()
    .single();

  if (error || !pet) {
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }

  // Create Helio pay link
  const helioRes = await fetch(HELIO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HELIO_SECRET_KEY}`,
    },
    body: JSON.stringify({
      name: `${petName}'s ENS Pet ID`,
      price: 999, // $9.99 in cents
      currency: "USD",
      description: `${subdomain}.${parentDomain} — forever on IPFS`,
      // Helio webhook will call /api/helio-webhook
      successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register/details?petId=${pet.id}`,
      cancelRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?cancelled=true`,
      metadata: {
        petId: pet.id,
        subdomain,
        parentDomain,
      },
    }),
  });

  if (!helioRes.ok) {
    const err = await helioRes.text();
    console.error("Helio create-checkout error:", err);
    return NextResponse.json({ error: "Payment provider error" }, { status: 500 });
  }

  const { id: helioPaymentId, url } = await helioRes.json();

  await supabase
    .from("pets")
    .update({ helio_payment_id: helioPaymentId })
    .eq("id", pet.id);

  return NextResponse.json({ helioPaymentId, url });
}
