"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates/registry";

export default function TemplatePickerPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const species = (typeof window !== "undefined"
    ? (JSON.parse(sessionStorage.getItem("petid_parent") ?? '"dogid.eth"') === "dogid.eth" ? "dog" : "cat")
    : "dog");

  const filtered = TEMPLATES.filter((t) => t.species === species);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">Pick a Template</h1>
        <p className="text-gray-500 mb-8">Your pet's profile page will use this design.</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`border-2 rounded-xl p-4 text-left transition ${
                selected === t.id ? "border-amber-600 bg-amber-50" : "border-gray-200 hover:border-amber-300 bg-white"
              }`}>
              <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl">
                {t.species === "dog" ? "🐕" : "🐈"}
              </div>
              <div className="font-bold text-gray-800">{t.name}</div>
              <div className="text-xs text-gray-500 mt-1">{t.description}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (!selected) return;
            sessionStorage.setItem("petid_template", selected);
            router.push("/register/review");
          }}
          disabled={!selected}
          className="w-full bg-amber-700 text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-amber-800 transition"
        >
          Review & Pay →
        </button>
      </div>
    </main>
  );
}
