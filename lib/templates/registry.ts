import type { Template } from "@/types/templates";

export const TEMPLATES: Template[] = [
  {
    id: "dog-rustic",
    name: "Rustic Pup",
    species: "dog",
    thumbnail: "/templates/thumbnails/dog-rustic.png",
    description: "Warm earth tones, wood textures, outdoorsy feel",
  },
  {
    id: "dog-modern",
    name: "Modern Woof",
    species: "dog",
    thumbnail: "/templates/thumbnails/dog-modern.png",
    description: "Clean, minimal, bold typography. Urban aesthetic.",
  },
  {
    id: "cat-neon",
    name: "Neon Kitty",
    species: "cat",
    thumbnail: "/templates/thumbnails/cat-neon.png",
    description: "Dark background, neon accents, mysterious vibe.",
  },
  {
    id: "cat-soft",
    name: "Soft Paws",
    species: "cat",
    thumbnail: "/templates/thumbnails/cat-soft.png",
    description: "Pastel colors, rounded shapes, gentle and cute.",
  },
];
