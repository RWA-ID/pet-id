"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PetDetailsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", breed: "", ageYears: "", color: "", sex: "unknown",
    bio: "", emergencyNotes: "", ownerName: "", ownerPhone: "", ownerEmail: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleContinue = () => {
    sessionStorage.setItem("petid_details", JSON.stringify({ ...form, photoName: photoFile?.name }));
    router.push("/register/template");
  };

  const valid = form.name && form.ownerName && form.ownerEmail;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Pet Details</h1>

        <div className="space-y-4">
          {[
            { label: "Pet Name *", key: "name", placeholder: "Max" },
            { label: "Breed", key: "breed", placeholder: "Golden Retriever" },
            { label: "Color / Markings", key: "color", placeholder: "Golden with white chest" },
            { label: "Owner Name *", key: "ownerName", placeholder: "John Smith" },
            { label: "Owner Phone", key: "ownerPhone", placeholder: "+1 555 000 0000" },
            { label: "Owner Email *", key: "ownerEmail", placeholder: "john@example.com" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={key === "ownerEmail" ? "email" : "text"}
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
              <input type="number" min="0" max="30" step="0.5"
                value={form.ageYears} onChange={(e) => set("ageYears", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <select value={form.sex} onChange={(e) => set("sex", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)}
              rows={3} placeholder="Tell us about your pet..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Notes</label>
            <textarea value={form.emergencyNotes} onChange={(e) => set("emergencyNotes", e.target.value)}
              rows={2} placeholder="Allergies, medications, vet contact..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            <input type="file" accept="image/jpeg,image/png" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500" />
          </div>
        </div>

        <button onClick={handleContinue} disabled={!valid}
          className="mt-8 w-full bg-amber-700 text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-amber-800 transition">
          Choose Template →
        </button>
      </div>
    </main>
  );
}
