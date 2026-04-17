import { createServiceClient } from "@/lib/supabase/server";
import { uploadHtmlToPinata, uploadPhotoToPinata } from "@/lib/pinata";
import { cidToContenthash } from "@/lib/contenthash";
import { adminRegisterOnChain } from "@/lib/chain";
import { renderTemplate } from "@/lib/templates/renderer";
import { sendConfirmationEmail } from "@/lib/email";
import type { Pet } from "@/types/pet";

async function log(petId: string, event: string, metadata?: object) {
  const supabase = createServiceClient();
  await supabase.from("audit_log").insert({ pet_id: petId, event, metadata });
}

async function notifyAdmin(message: string) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  }).catch(() => {});
}

export async function mintPetPage(petId: string) {
  const supabase = createServiceClient();
  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();

  if (!pet) throw new Error(`Pet ${petId} not found`);

  await log(petId, "pipeline_started");
  await supabase.from("pets").update({ status: "minting" }).eq("id", petId);

  try {
    // Upload photo if present
    let photoCid: string | null = null;
    if (pet.photo_temp_url) {
      const resp = await fetch(pet.photo_temp_url);
      const buf = Buffer.from(await resp.arrayBuffer());
      photoCid = await uploadPhotoToPinata(buf, `${pet.subdomain}-photo.jpg`);
      await supabase.from("pets").update({ photo_cid: photoCid }).eq("id", petId);
    }

    // Render HTML template
    const html = renderTemplate(pet.template_id, { ...pet, photoCid });

    // Upload HTML to IPFS
    const pageCid = await uploadHtmlToPinata(html, pet.subdomain);
    const contenthash = cidToContenthash(pageCid);
    await supabase.from("pets").update({ page_cid: pageCid, contenthash }).eq("id", petId);
    await log(petId, "ipfs_uploaded", { pageCid });

    // Register ENS subdomain on-chain
    const registrarAddress = (
      pet.parent_domain === "dogid.eth"
        ? process.env.DOGID_REGISTRAR_ADDRESS
        : process.env.CATID_REGISTRAR_ADDRESS
    ) as `0x${string}`;

    const adminWalletAddress = (await import("viem/accounts")).privateKeyToAccount(
      process.env.ADMIN_WALLET_PRIVATE_KEY as `0x${string}`
    ).address;

    const txHash = await adminRegisterOnChain(
      registrarAddress,
      pet.subdomain,
      adminWalletAddress,
      contenthash as `0x${string}`
    );

    await supabase.from("pets").update({ tx_hash: txHash }).eq("id", petId);
    await log(petId, "tx_confirmed", { txHash });

    // Mark live
    const gatewayUrl = `${process.env.PINATA_GATEWAY_URL ?? "https://ipfs.onchain-id.id"}/ipfs/${pageCid}`;
    await supabase.from("pets").update({
      status: "live",
      ipfs_gateway_url: gatewayUrl,
      paid_at: new Date().toISOString(),
    }).eq("id", petId);

    // Send confirmation email
    const fullPet = { ...pet, pageCid } as unknown as Pet;
    await sendConfirmationEmail(fullPet, pageCid);
    await log(petId, "email_sent");
  } catch (error: any) {
    await supabase.from("pets").update({
      status: "failed",
      error_message: error.message,
    }).eq("id", petId);
    await log(petId, "pipeline_failed", { error: error.message });
    await notifyAdmin(`PetID mint failed: ${petId} — ${error.message}`);
    throw error;
  }
}
