export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// This edge route marks the pet as ready to mint.
// The actual mint pipeline (IPFS + ENS + email) runs in an external Node.js
// worker service that polls Supabase for pets with status = 'paid'.
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId } = await req.json();

  // Mark as paid so the external mint worker picks it up
  const supabase = createServiceClient();
  await supabase.from("pets").update({ status: "paid" }).eq("id", petId).eq("status", "pending");

  return NextResponse.json({ queued: true, petId });
}
