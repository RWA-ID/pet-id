import { NextRequest, NextResponse } from "next/server";
import { mintPetPage } from "@/lib/mint-pipeline";

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId } = await req.json();
  mintPetPage(petId).catch(console.error);

  return NextResponse.json({ queued: true, petId });
}
