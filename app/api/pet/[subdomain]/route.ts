import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_FIELDS = [
  "id", "subdomain", "parent_domain", "full_ens", "species",
  "name", "breed", "age_years", "color", "sex", "bio",
  "owner_name", "owner_phone", "template_id", "page_cid",
  "ipfs_gateway_url", "status", "created_at",
];

export async function GET(req: NextRequest, { params }: { params: { subdomain: string } }) {
  const supabase = createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select(PUBLIC_FIELDS.join(", "))
    .eq("subdomain", params.subdomain)
    .eq("status", "live")
    .single();

  if (!pet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(pet);
}
