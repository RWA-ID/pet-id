import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { mintPetPage } from "@/lib/mint-pipeline";
import { createServiceClient } from "@/lib/supabase/server";

function verifyHelioSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.HELIO_WEBHOOK_SECRET!;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("helio-signature") ?? "";

  if (!verifyHelioSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // Helio sends event.type = "PAYMENT_SUCCESS" on successful payment
  if (event.type === "PAYMENT_SUCCESS" || event.event === "PAYMENT_SUCCESS") {
    const metadata = event.data?.metadata ?? event.metadata ?? {};
    const petId = metadata.petId;

    if (!petId) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Idempotency check
    const { data: pet } = await supabase
      .from("pets")
      .select("status")
      .eq("id", petId)
      .single();

    if (pet?.status !== "pending") {
      return NextResponse.json({ received: true });
    }

    await supabase.from("pets").update({
      status: "paid",
      helio_payment_id: event.data?.id ?? event.id,
      amount_paid_cents: 999,
      currency: "usd",
    }).eq("id", petId);

    // Fire-and-forget minting pipeline
    mintPetPage(petId).catch(console.error);
  }

  return NextResponse.json({ received: true });
}
