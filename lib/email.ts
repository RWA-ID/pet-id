import { Resend } from "resend";
import { generateQRCode } from "./qr";
import type { Pet } from "@/types/pet";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendConfirmationEmail(pet: Pet, pageCid: string) {
  const qrBuffer = await generateQRCode(pet.subdomain, pet.parentDomain);
  const ensUrl = `https://${pet.subdomain}.${pet.parentDomain}.link`;
  const ipfsUrl = `${process.env.PINATA_GATEWAY_URL ?? "https://ipfs.onchain-id.id"}/ipfs/${pageCid}`;

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: pet.ownerEmail,
    subject: `🐾 ${pet.name}'s PetID is live! ${pet.subdomain}.${pet.parentDomain}`,
    html: `
      <h1>${pet.name}'s permanent pet profile is live!</h1>
      <p><strong>ENS Name:</strong> ${pet.subdomain}.${pet.parentDomain}</p>
      <p><strong>View page:</strong> <a href="${ensUrl}">${ensUrl}</a></p>
      <p><strong>IPFS link:</strong> <a href="${ipfsUrl}">${ipfsUrl}</a></p>
      <p>Print the attached QR code and attach it to ${pet.name}'s collar or leash.</p>
      <p>Anyone who scans it will see ${pet.name}'s profile — forever on IPFS.</p>
    `,
    attachments: [
      {
        filename: `${pet.name}-petid-qr.png`,
        content: qrBuffer.toString("base64"),
      },
    ],
  });
}
