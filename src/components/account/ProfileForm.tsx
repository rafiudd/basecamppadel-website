"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { toast } from "@/components/ui/Toast";
import { saveProfile } from "@/app/akun/actions";
import { normalizeWhatsapp } from "@/lib/accountRules";
import type { CourtPosition, DominantHand, Gender } from "@/lib/database.types";
import { PhotoField } from "./PhotoField";
import { lightCard, lightHint, lightInput, lightLabel, primaryButton, sectionHeading } from "./styles";

export type ProfileDefaults = {
  nickname: string;
  gender: Gender | "";
  whatsapp: string;
  region: string;
  hand: DominantHand | "";
  position: CourtPosition | "";
  photoUrl: string | null;
};

/** Toggle-button group posting one value under `name`; `optional` lets a second tap clear it. */
function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  optional,
  disabled,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
  optional?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on && optional ? "" : o.value)}
            className={`flex-1 basis-0 min-h-11.5 rounded-tile border px-2.5 font-sans font-semibold text-sm transition-colors disabled:cursor-not-allowed ${
              on ? "border-indigo bg-indigo text-snow" : "border-ink/18 bg-white text-ink hover:border-indigo disabled:opacity-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const GENDERS = [
  { value: "F" as const, label: "Women" },
  { value: "M" as const, label: "Men" },
];
const HANDS = [
  { value: "R" as const, label: "Kanan" },
  { value: "L" as const, label: "Kiri" },
];
const POSITIONS = [
  { value: "right" as const, label: "Kanan" },
  { value: "left" as const, label: "Kiri" },
  { value: "both" as const, label: "Bebas" },
];

export function ProfileForm({
  mode,
  next,
  email,
  googleName,
  defaults,
  genderLocked = false,
}: {
  mode: "setup" | "edit";
  next: string;
  email: string;
  googleName: string;
  defaults: ProfileDefaults;
  genderLocked?: boolean;
}) {
  const [nickname, setNickname] = useState(defaults.nickname);
  const [gender, setGender] = useState<Gender | "">(defaults.gender);
  const [hand, setHand] = useState<DominantHand | "">(defaults.hand);
  const [position, setPosition] = useState<CourtPosition | "">(defaults.position);
  const [waError, setWaError] = useState(false);

  // client-side check of what has no native `required` (the toggles, the WA format); the server checks again
  function onSubmitCapture(e: React.FormEvent<HTMLDivElement>) {
    const wa = String(new FormData(e.target as HTMLFormElement).get("whatsapp") ?? "");
    const problem = !gender ? "Pilih gender dulu." : !normalizeWhatsapp(wa) ? "Nomor WA tidak valid. Contoh: 0812-3456-7890." : null;
    setWaError(!!gender && !!problem);
    if (problem) {
      e.preventDefault(); // a prevented submit never reaches the form action
      toast.error(problem);
    }
  }

  return (
    <div onSubmitCapture={onSubmitCapture}>
      <ActionForm action={saveProfile} successText={mode === "setup" ? "Profil tersimpan" : "Perubahan disimpan"} className="flex flex-col gap-6">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />

        <div className={`${lightCard} flex flex-col gap-5.5`}>
          <div className="flex items-center gap-3 bg-[#F1EFF7] rounded-xl px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-input truncate">{googleName || email}</div>
              <div className="text-caption text-ink/65 truncate">{email}</div>
            </div>
            <span className="text-xs font-bold text-[#23794A] bg-win/14 rounded-full px-2.5 py-0.5 flex-none">Google</span>
          </div>

          <h2 className={sectionHeading}>Data diri</h2>

          <PhotoField name={nickname} current={defaults.photoUrl} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            <label className="block min-w-0">
              <span className={lightLabel}>Nama panggilan *</span>
              <input
                className={lightInput}
                name="nickname"
                required
                maxLength={40}
                placeholder="Nama di leaderboard"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <div className={lightHint}>Tampil di leaderboard & jadwal</div>
            </label>
            <fieldset className="border-none m-0 p-0 min-w-0">
              <legend className={`${lightLabel} p-0`}>Gender *</legend>
              <Segmented name="gender" options={GENDERS} value={gender} onChange={setGender} disabled={genderLocked} />
              <div className={lightHint}>
                {genderLocked ? "Kamu sudah punya poin, jadi gender cuma bisa diubah admin." : "Buat pembagian kategori kompetisi"}
              </div>
            </fieldset>
            <label className="block min-w-0">
              <span className={lightLabel}>No. WhatsApp *</span>
              <input
                className={`${lightInput} ${waError ? "border-loss ring-2 ring-loss/15" : ""}`}
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="08xx-xxxx-xxxx"
                defaultValue={defaults.whatsapp}
                onChange={() => setWaError(false)}
              />
              <div className={lightHint}>Buat info jadwal & konfirmasi event. Satu nomor untuk satu akun.</div>
            </label>
            <label className="block min-w-0">
              <span className={lightLabel}>Domisili</span>
              <input className={lightInput} name="region" maxLength={60} placeholder="Contoh: Purwokerto" defaultValue={defaults.region} />
            </label>
          </div>

          <div className="h-px bg-ink/10" />
          <h2 className={sectionHeading}>Tentang main padel kamu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            <fieldset className="border-none m-0 p-0 min-w-0">
              <legend className={`${lightLabel} p-0`}>Tangan dominan</legend>
              <Segmented name="hand" options={HANDS} value={hand} onChange={setHand} optional />
            </fieldset>
            <fieldset className="border-none m-0 p-0 min-w-0">
              <legend className={`${lightLabel} p-0`}>Posisi favorit</legend>
              <Segmented name="position" options={POSITIONS} value={position} onChange={setPosition} optional />
              <div className={lightHint}>Sisi lapangan waktu main ganda</div>
            </fieldset>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className={`${primaryButton} w-full md:w-auto`}>
            {mode === "setup" ? "Simpan & lanjut" : "Simpan perubahan"}
          </button>
        </div>
      </ActionForm>
    </div>
  );
}
