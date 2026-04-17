export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateSuggestions(subdomain: string): string[] {
  return [
    `${subdomain}y`,
    `${subdomain}-the-pet`,
    `${subdomain}ie`,
    `my-${subdomain}`,
  ].slice(0, 3);
}

export async function POST(req: NextRequest) {
  const { subdomain, parentDomain } = await req.json();

  if (!/^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("parent_domain", parentDomain)
    .maybeSingle();

  if (data) {
    return NextResponse.json({
      available: false,
      subdomain,
      suggestions: generateSuggestions(subdomain),
    });
  }

  return NextResponse.json({
    available: true,
    subdomain,
    fullEns: `${subdomain}.${parentDomain}`,
  });
}
