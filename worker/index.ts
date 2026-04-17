import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import PinataClient from "@pinata/sdk";
import { Resend } from "resend";
import { Readable } from "stream";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { namehash } from "viem/ens";
import QRCode from "qrcode";

// ── env ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PINATA_API_KEY        = process.env.PINATA_API_KEY!;
const PINATA_SECRET_KEY     = process.env.PINATA_SECRET_KEY!;
const PINATA_GATEWAY        = process.env.PINATA_GATEWAY_URL ?? "https://ipfs.onchain-id.id";
const RESEND_API_KEY        = process.env.RESEND_API_KEY!;
const FROM_EMAIL            = process.env.FROM_EMAIL!;
const ADMIN_PRIVATE_KEY     = process.env.ADMIN_WALLET_PRIVATE_KEY as `0x${string}`;
const RPC_URL               = process.env.RPC_URL!;
const REGISTRAR_ADDRESS     = process.env.PETID_REGISTRAR_ADDRESS as `0x${string}`;
const SLACK_WEBHOOK_URL     = process.env.SLACK_WEBHOOK_URL;
const POLL_INTERVAL_MS      = 30_000;

// ── clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const pinata   = new PinataClient({ pinataApiKey: PINATA_API_KEY, pinataSecretApiKey: PINATA_SECRET_KEY });
const resend   = new Resend(RESEND_API_KEY);

const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });

const REGISTRAR_ABI = parseAbi([
  "function adminRegister(bytes32 parentNode, string calldata label, address owner, bytes calldata contenthash) external",
]);

// ── helpers ──────────────────────────────────────────────────────────────────

async function log(petId: string, event: string, metadata?: object) {
  await supabase.from("audit_log").insert({ pet_id: petId, event, metadata });
}

async function notifySlack(message: string) {
  if (!SLACK_WEBHOOK_URL) return;
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  }).catch(() => {});
}

function cidToContenthash(cidString: string): string {
  // Decode base58-encoded CIDv0 (Qm...) into raw multihash bytes, then
  // prepend the IPFS contenthash codec prefix (0xe3 0x01)
  const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = BigInt(0);
  for (const char of cidString) {
    n = n * BigInt(58) + BigInt(BASE58_CHARS.indexOf(char));
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return "0xe301" + hex;
}

async function uploadHtml(html: string, subdomain: string): Promise<string> {
  const stream = Readable.from([html]);
  (stream as any).path = `${subdomain}-petid.html`;
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: { name: `${subdomain}-petid-page` },
    pinataOptions: { cidVersion: 0 },
  });
  return result.IpfsHash;
}

async function uploadPhoto(buf: Buffer, filename: string): Promise<string> {
  const stream = Readable.from([buf]);
  (stream as any).path = filename;
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: { name: `petid-photo-${filename}` },
    pinataOptions: { cidVersion: 0 },
  });
  return result.IpfsHash;
}

function renderTemplate(templateId: string, pet: Record<string, any>): string {
  // Templates live in the parent Next.js project — one level up
  const templatePath = join(__dirname, "../lib/templates/html", `${templateId}.hbs`);
  const source = readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(source);
  return template({
    ...pet,
    photoUrl: pet.photoCid
      ? `${PINATA_GATEWAY}/ipfs/${pet.photoCid}`
      : `/assets/default-${pet.species}.jpg`,
    ensUrl: `https://${pet.subdomain}.${pet.parent_domain}.limo`,
    ownerName:       pet.owner_name,
    ownerPhone:      pet.owner_phone,
    emergencyNotes:  pet.emergency_notes,
    currentYear:     new Date().getFullYear(),
  });
}

async function adminRegisterOnChain(
  parentDomain: string,
  label: string,
  ownerAddress: `0x${string}`,
  contenthash: `0x${string}`
): Promise<string> {
  const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
  const wallet = createWalletClient({ account, chain: mainnet, transport: http(RPC_URL) });
  const parentNode = namehash(parentDomain) as `0x${string}`;

  const hash = await wallet.writeContract({
    address: REGISTRAR_ADDRESS,
    abi: REGISTRAR_ABI,
    functionName: "adminRegister",
    args: [parentNode, label, ownerAddress, contenthash],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function generateQRCode(subdomain: string, parentDomain: string): Promise<Buffer> {
  const url = `https://${subdomain}.${parentDomain}.limo`;
  return QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#2C1810", light: "#FAFAF8" },
    errorCorrectionLevel: "H",
  });
}

// ── mint pipeline ────────────────────────────────────────────────────────────

async function mintPet(pet: any) {
  const petId = pet.id;
  console.log(`[mint] starting pet ${petId} (${pet.subdomain}.${pet.parent_domain})`);
  await log(petId, "pipeline_started");
  await supabase.from("pets").update({ status: "minting" }).eq("id", petId);

  // 1. Upload photo
  let photoCid: string | null = null;
  if (pet.photo_temp_url) {
    const resp = await fetch(pet.photo_temp_url);
    const buf = Buffer.from(await resp.arrayBuffer());
    photoCid = await uploadPhoto(buf, `${pet.subdomain}-photo.jpg`);
    await supabase.from("pets").update({ photo_cid: photoCid }).eq("id", petId);
  }

  // 2. Render + upload HTML
  const html = renderTemplate(pet.template_id, { ...pet, photoCid });
  const pageCid = await uploadHtml(html, pet.subdomain);
  const contenthash = cidToContenthash(pageCid);
  await supabase.from("pets").update({ page_cid: pageCid, contenthash }).eq("id", petId);
  await log(petId, "ipfs_uploaded", { pageCid });

  // 3. Register ENS subname on-chain (custodial — admin wallet owns it)
  const adminAddress = privateKeyToAccount(ADMIN_PRIVATE_KEY).address;
  const txHash = await adminRegisterOnChain(
    pet.parent_domain,
    pet.subdomain,
    adminAddress,
    contenthash as `0x${string}`
  );
  await supabase.from("pets").update({ tx_hash: txHash }).eq("id", petId);
  await log(petId, "tx_confirmed", { txHash });

  // 4. Mark live
  const gatewayUrl = `${PINATA_GATEWAY}/ipfs/${pageCid}`;
  await supabase.from("pets").update({
    status: "live",
    ipfs_gateway_url: gatewayUrl,
    paid_at: new Date().toISOString(),
  }).eq("id", petId);

  // 5. Send email with QR
  const qrBuffer = await generateQRCode(pet.subdomain, pet.parent_domain);
  const ensUrl   = `https://${pet.subdomain}.${pet.parent_domain}.limo`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: pet.owner_email,
    subject: `🐾 ${pet.name}'s PetID is live! ${pet.subdomain}.${pet.parent_domain}`,
    html: `
      <h1>${pet.name}'s permanent pet profile is live!</h1>
      <p><strong>ENS Name:</strong> ${pet.subdomain}.${pet.parent_domain}</p>
      <p><strong>View page:</strong> <a href="${ensUrl}">${ensUrl}</a></p>
      <p><strong>IPFS link:</strong> <a href="${gatewayUrl}">${gatewayUrl}</a></p>
      <p>Print the attached QR code and attach it to ${pet.name}'s collar or leash.</p>
    `,
    attachments: [{ filename: `${pet.name}-petid-qr.png`, content: qrBuffer.toString("base64") }],
  });

  await log(petId, "email_sent");
  console.log(`[mint] ✅ done ${petId}`);
  await notifySlack(`✅ PetID minted: ${pet.subdomain}.${pet.parent_domain}`);
}

// ── poll loop ────────────────────────────────────────────────────────────────

async function poll() {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("*")
    .eq("status", "paid")
    .limit(5);

  if (error) {
    console.error("[poll] supabase error:", error.message);
    return;
  }

  for (const pet of pets ?? []) {
    try {
      await mintPet(pet);
    } catch (err: any) {
      console.error(`[mint] ❌ failed ${pet.id}:`, err.message);
      await supabase.from("pets").update({
        status: "failed",
        error_message: err.message,
      }).eq("id", pet.id);
      await supabase.from("audit_log").insert({ pet_id: pet.id, event: "pipeline_failed", metadata: { error: err.message } });
      await notifySlack(`❌ PetID mint failed: ${pet.id} — ${err.message}`);
    }
  }
}

console.log(`[worker] PetID mint worker starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
poll();
setInterval(poll, POLL_INTERVAL_MS);
