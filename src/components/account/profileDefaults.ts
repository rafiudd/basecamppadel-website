import { formatWhatsapp, profilePhoto } from "@/lib/accountRules";
import type { Profile } from "@/lib/database.types";
import type { ProfileDefaults } from "./ProfileForm";

/** First visit to Lengkapi profil: only what Google gave us (the photo defaults to the Google picture). */
export function blankProfileDefaults(googleName: string, googleAvatar: string | null = null): ProfileDefaults {
  return {
    fullName: googleName,
    nickname: googleName.trim().split(/\s+/)[0] ?? "",
    gender: "",
    region: "",
    whatsapp: "",
    instagram: "",
    playDuration: "",
    hand: "",
    position: "",
    selfLevel: "",
    photoUrl: googleAvatar,
  };
}

export type EditableProfile = Pick<
  Profile,
  "full_name" | "nickname" | "gender" | "region" | "whatsapp" | "instagram" | "play_duration" | "dominant_hand" | "position" | "self_level" | "photo_url" | "photo_source"
>;

/** Edit profil: the saved profile as form values (photo per profilePhoto: none stays none). */
export function profileDefaults(p: EditableProfile, googleAvatar: string | null = null): ProfileDefaults {
  return {
    fullName: p.full_name,
    nickname: p.nickname,
    gender: p.gender,
    region: p.region,
    whatsapp: formatWhatsapp(p.whatsapp),
    instagram: p.instagram,
    playDuration: p.play_duration ?? "",
    hand: p.dominant_hand ?? "",
    position: p.position ?? "",
    selfLevel: p.self_level ?? "",
    photoUrl: profilePhoto(p, googleAvatar),
  };
}
