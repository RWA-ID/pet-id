export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Use Web Crypto API (edge-compatible) instead of Node's crypto.createHmac
async function verifyHelioSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.HELIO_WEBHOOK_SECRET!;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("helio-signature") ?? "";

  if (!(await verifyHelioSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "PAYMENT_SUCCESS" || event.event === "PAYMENT_SUCCESS") {
    const metadata = event.data?.metadata ?? event.metadata ?? {};
    const petId = metadata.petId;

    if (!petId) return NextResponse.json({ received: true });

    const supabase = createServiceClient();

    // Idempotency check
    const { data: pet } = await supabase
      .from("pets").select("status").eq("id", petId).single();

    if (pet?.status !== "pending") return NextResponse.json({ received: true });

    await supabase.from("pets").update({
      status: "paid",
      helio_payment_id: event.data?.id ?? event.id,
      amount_paid_cents: 999,
      currency: "usd",
    }).eq("id", petId);

    // Trigger mint pipeline via internal API call (runs in Node.js runtime)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    fetch(`${appUrl}/api/admin/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.ADMIN_API_SECRET!,
      },
      body: JSON.stringify({ petId }),
    }).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
