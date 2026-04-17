export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQRCode } from "@/lib/qr";

export async function GET(req: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("subdomain, parent_domain, name")
    .eq("id", petId)
    .single();

  if (!pet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const qrBuffer = await generateQRCode(pet.subdomain, pet.parent_domain);

  return new Response(new Uint8Array(qrBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${pet.name}-petid-qr.png"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
