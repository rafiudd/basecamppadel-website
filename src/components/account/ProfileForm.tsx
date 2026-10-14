"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { toast } from "@/components/ui/Toast";
import { saveProfile } from "@/app/akun/actions";
import { normalizeInstagram, normalizeWhatsapp, PLAY_DURATIONS, SELF_LEVELS, type PlayDuration, type SelfLevel } from "@/lib/accountRules";
import type { ActionState } from "@/lib/actionState";
import type { CourtPosition, DominantHand, Gender } from "@/lib/database.types";
import { GoogleMark } from "./GoogleMark";
import { ProfileAvatar } from "./ProfileAvatar";
import { PhotoField } from "./PhotoField";
import { lightCard, lightHint, lightInput, lightLabel, primaryButton, sectionHeading } from "./styles";

export type ProfileDefaults = {
  fullName: string;
  nickname: string;
  gender: Gender | "";
  region: string;
  whatsapp: string;
  instagram: string;
  playDuration: PlayDuration | "";
  hand: DominantHand | "";
  position: CourtPosition | "";
  selfLevel: SelfLevel | "";
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
  options: readonly { value: T; label: string }[];
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
            className={`flex-1 basis-0 min-w-0 min-h-11.5 rounded-tile border px-2.5 font-sans font-semibold text-sm transition-colors disabled:cursor-not-allowed ${
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

function Text({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={lightLabel}>{label}</span>
      {children}
      {hint && <div className={lightHint}>{hint}</div>}
    </label>
  );
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-none m-0 p-0 min-w-0">
      <legend className={`${lightLabel} p-0`}>{label}</legend>
      {children}
      {hint && <div className={lightHint}>{hint}</div>}
    </fieldset>
  );
}

/** The Google account a profile belongs to: its picture (or initials), name, email, "Terhubung". */
export function GoogleAccount({ name, email, photoUrl }: { name: string; email: string; photoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3 bg-[#F1EFF7] rounded-xl px-3.5 py-3">
      <ProfileAvatar name={name || email} photoUrl={photoUrl} className="w-11 h-11 text-base" />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-input truncate">{name || email}</div>
        <div className="text-caption text-ink/65 flex items-center gap-1.5 min-w-0">
          <GoogleMark size={14} />
          <span className="truncate">{email}</span>
        </div>
      </div>
      <span className="text-xs font-bold text-[#23794A] bg-win/14 rounded-full px-2.5 py-0.5 flex-none">Terhubung</span>
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
const LEVELS = SELF_LEVELS.map((l) => ({ value: l, label: l }));

/** Lengkapi profil (first login) and Edit profil, laid out like the "Lengkapi profil" design. */
export function ProfileForm({
  mode,
  next,
  email,
  googleName,
  googleAvatar = null,
  defaults,
  categoryLocked = false,
  action = saveProfile,
}: {
  mode: "setup" | "edit";
  next: string;
  email: string;
  googleName: string;
  googleAvatar?: string | null;
  defaults: ProfileDefaults;
  categoryLocked?: boolean;
  /** Defaults to saving the account; the demo passes a no-op. */
  action?: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [fullName, setFullName] = useState(defaults.fullName);
  const [nickname, setNickname] = useState(defaults.nickname);
  const [gender, setGender] = useState<Gender | "">(defaults.gender);
  const [hand, setHand] = useState<DominantHand | "">(defaults.hand);
  const [position, setPosition] = useState<CourtPosition | "">(defaults.position);
  const [selfLevel, setSelfLevel] = useState<SelfLevel | "">(defaults.selfLevel);
  const [invalid, setInvalid] = useState<"whatsapp" | "instagram" | null>(null);

  // client-side check of what has no native `required` (the toggles, WA and Instagram format); the server checks again
  function onSubmitCapture(e: React.FormEvent<HTMLDivElement>) {
    const fd = new FormData(e.target as HTMLFormElement);
    const problem: [string, typeof invalid] | null = !gender
      ? ["Pilih kategori dulu.", null]
      : !normalizeWhatsapp(String(fd.get("whatsapp") ?? ""))
        ? ["Nomor WA tidak valid. Contoh: 0812-3456-7890.", "whatsapp"]
        : normalizeInstagram(String(fd.get("instagram") ?? "")) === null
          ? ["Username Instagram tidak valid. Contoh: @basecamppadel.id", "instagram"]
          : null;
    setInvalid(problem?.[1] ?? null);
    if (problem) {
      e.preventDefault(); // a prevented submit never reaches the form action
      toast.error(problem[0]);
    }
  }
  const invalidRing = (f: typeof invalid) => (invalid === f ? "border-loss ring-2 ring-loss/15" : "");

  return (
    <div onSubmitCapture={onSubmitCapture}>
      <ActionForm action={action} successText={mode === "setup" ? "Profil tersimpan" : "Perubahan disimpan"} className="flex flex-col gap-6">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />

        <div className={`${lightCard} flex flex-col gap-5.5`}>
          {/* on Edit profil the Google account sits in the "Akun" card below the form instead */}
          {mode === "setup" && <GoogleAccount name={googleName || nickname} email={email} photoUrl={googleAvatar} />}

          <h2 className={sectionHeading}>Data diri</h2>

          <PhotoField name={fullName || nickname} current={defaults.photoUrl} googleAvatar={googleAvatar} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            <Text label="Nama lengkap" hint="Dari akun Google, bisa diubah">
              <input className={lightInput} name="full_name" maxLength={80} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Text>
            <Text label="Nama panggilan">
              <input
                className={lightInput}
                name="nickname"
                required
                maxLength={40}
                placeholder="Nama di leaderboard"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </Text>
            <Choice
              label="Kategori"
              hint={categoryLocked ? "Kamu udah punya poin, jadi kategori cuma bisa diubah admin." : "Buat pembagian kategori kompetisi"}
            >
              <Segmented name="gender" options={GENDERS} value={gender} onChange={setGender} disabled={categoryLocked} />
            </Choice>
            <Text label="Kota">
              <input className={lightInput} name="region" maxLength={60} autoComplete="address-level2" placeholder="Contoh: Purwokerto" defaultValue={defaults.region} />
            </Text>
            <Text label="No. WhatsApp" hint="Buat info jadwal & konfirmasi event">
              <input
                className={`${lightInput} ${invalidRing("whatsapp")}`}
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="08xx-xxxx-xxxx"
                defaultValue={defaults.whatsapp}
                onChange={() => setInvalid(null)}
              />
            </Text>
            <Text label="Instagram (opsional)">
              <input
                className={`${lightInput} ${invalidRing("instagram")}`}
                name="instagram"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="@username"
                defaultValue={defaults.instagram ? `@${defaults.instagram}` : ""}
                onChange={() => setInvalid(null)}
              />
            </Text>
          </div>

          <div className="h-px bg-ink/10" />
          <h2 className={sectionHeading}>Tentang main padel kamu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            <Text label="Udah main padel berapa lama?">
              <select className={`${lightInput} select-light`} name="play_duration" defaultValue={defaults.playDuration}>
                <option value="">Pilih…</option>
                {PLAY_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Text>
            <Choice label="Tangan dominan">
              <Segmented name="hand" options={HANDS} value={hand} onChange={setHand} optional />
            </Choice>
            <Choice label="Posisi favorit" hint="Sisi lapangan waktu main ganda">
              <Segmented name="position" options={POSITIONS} value={position} onChange={setPosition} optional />
            </Choice>
            <Choice label="Level (perkiraan sendiri)" hint="Nanti disesuaikan sama penilaian coach">
              <Segmented name="self_level" options={LEVELS} value={selfLevel} onChange={setSelfLevel} optional />
            </Choice>
          </div>

          {mode === "edit" && (
            <div className="border-t border-ink/10 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="m-0 text-caption text-ink/60">Nama, kategori, kota, dan foto juga tampil di leaderboard.</p>
              <button type="submit" className={`${primaryButton} w-full md:w-auto`}>
                Simpan perubahan
              </button>
            </div>
          )}
        </div>

        {mode === "setup" && (
          <div className="flex justify-end">
            <button type="submit" className={`${primaryButton} w-full md:w-auto`}>
              Simpan &amp; lanjut
            </button>
          </div>
        )}
      </ActionForm>
    </div>
  );
}
