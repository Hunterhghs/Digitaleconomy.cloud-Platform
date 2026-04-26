"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  existingCategories: string[];
  maxBytes: number;
};

const LICENSES = [
  { value: "cc0", label: "CC0 (public domain)" },
  { value: "cc-by", label: "CC BY 4.0 (attribution)" },
  { value: "cc-by-sa", label: "CC BY-SA 4.0 (attribution + share-alike)" },
  { value: "cc-by-nc", label: "CC BY-NC 4.0 (non-commercial)" },
  { value: "mit", label: "MIT" },
  { value: "personal", label: "Personal use only" },
  { value: "custom", label: "Custom (described in description)" },
];

export function UploadForm({ existingCategories, maxBytes }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setProgress("Uploading…");

    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Please pick a file.");
      setBusy(false);
      setProgress(null);
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `File too big (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
      );
      setBusy(false);
      setProgress(null);
      return;
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok || !data.slug) {
        throw new Error(data.error ?? "Upload failed");
      }
      formRef.current?.reset();
      router.push(`/assets/${data.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="card space-y-4 p-5"
      encType="multipart/form-data"
    >
      <Field label="Title" hint="A short, descriptive name (max 120 chars).">
        <input
          name="title"
          required
          maxLength={120}
          className="input w-full"
          placeholder="e.g. Lo-fi Study Loops Vol. 3"
        />
      </Field>

      <Field
        label="Description"
        hint="What is it, who's it for, what can people do with it?"
      >
        <textarea
          name="description"
          required
          maxLength={4000}
          rows={5}
          className="input w-full resize-y"
          placeholder="A detailed description helps people find your asset."
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category">
          <input
            name="category"
            required
            list="existing-categories"
            maxLength={40}
            className="input w-full"
            placeholder="e.g. Audio, Code, Images, eBooks"
          />
          <datalist id="existing-categories">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Display name" hint="What to credit you as on the asset page.">
          <input
            name="creatorName"
            required
            maxLength={80}
            className="input w-full"
            placeholder="Your name or studio"
          />
        </Field>
      </div>

      <Field label="Tags" hint="Comma-separated. Helps people find this when searching.">
        <input
          name="tags"
          maxLength={200}
          className="input w-full"
          placeholder="lo-fi, beats, sample-pack"
        />
      </Field>

      <Field label="License">
        <select name="license" required defaultValue="cc-by" className="input w-full">
          {LICENSES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="File"
        hint={`Up to ${(maxBytes / 1024 / 1024).toFixed(0)} MB. Anything except executables.`}
      >
        <input
          name="file"
          type="file"
          required
          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-200 hover:file:bg-emerald-500/30"
        />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-white/40">
          By uploading you confirm you have the right to share this and that
          it&apos;s safe + legal.
        </p>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? progress ?? "Working…" : "Publish"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm font-medium text-white/80">{label}</div>
      {children}
      {hint && <div className="text-xs text-white/40">{hint}</div>}
    </label>
  );
}
