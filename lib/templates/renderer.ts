import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";

export function renderTemplate(templateId: string, pet: Record<string, any>): string {
  const templatePath = join(process.cwd(), "lib/templates/html", `${templateId}.hbs`);
  const source = readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(source);
  return template({
    ...pet,
    photoUrl: pet.photoCid
      ? `https://gateway.pinata.cloud/ipfs/${pet.photoCid}`
      : `/assets/default-${pet.species}.jpg`,
    ensUrl: `https://${pet.subdomain}.${pet.parent_domain}.limo`,
    ownerName: pet.owner_name,
    ownerPhone: pet.owner_phone,
    emergencyNotes: pet.emergency_notes,
    currentYear: new Date().getFullYear(),
  });
}
