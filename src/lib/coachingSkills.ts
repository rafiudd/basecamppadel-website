/**
 * The 39 coaching skills, hardcoded: the list is fixed by the curriculum and rarely changes. Pure
 * (no imports) so the rules and tests can use it. The admin coaching task can key scores by `key`.
 */

import type { SkillDef } from "./coachingRules";

const LIST: [key: string, kind: SkillDef["kind"], group: string, label: string][] = [
  ["forehand", "teknik", "Groundstroke", "Forehand"],
  ["backhand", "teknik", "Groundstroke", "Backhand"],
  ["serve", "teknik", "Servis & return", "Servis"],
  ["return", "teknik", "Servis & return", "Return servis"],
  ["volley_fh", "teknik", "Di net", "Volley FH"],
  ["volley_bh", "teknik", "Di net", "Volley BH"],
  ["block", "teknik", "Di net", "Block"],
  ["dejada", "teknik", "Di net", "Dejada (drop volley)"],
  ["bandeja", "teknik", "Overhead", "Bandeja"],
  ["vibora", "teknik", "Overhead", "Víbora"],
  ["smash_flat", "teknik", "Overhead", "Smash datar"],
  ["smash_x3", "teknik", "Overhead", "Smash x3 / x4"],
  ["rulo", "teknik", "Overhead", "Rulo"],
  ["gancho", "teknik", "Overhead", "Gancho"],
  ["backwall_fh", "teknik", "Kaca / dinding", "Backwall FH"],
  ["backwall_bh", "teknik", "Kaca / dinding", "Backwall BH"],
  ["double_glass", "teknik", "Kaca / dinding", "Double glass"],
  ["side_wall", "teknik", "Kaca / dinding", "Side wall"],
  ["bajada", "teknik", "Kaca / dinding", "Bajada"],
  ["contrapared", "teknik", "Kaca / dinding", "Contrapared"],
  ["lob", "teknik", "Pukulan variasi", "Lob"],
  ["chiquita", "teknik", "Pukulan variasi", "Chiquita"],
  ["passing_shot", "teknik", "Pukulan variasi", "Passing shot"],
  ["positioning", "ingame", "Taktik & strategi", "Positioning"],
  ["transition", "ingame", "Taktik & strategi", "Transisi nyerang ↔ bertahan"],
  ["shot_selection", "ingame", "Taktik & strategi", "Pemilihan pukulan"],
  ["net_control", "ingame", "Taktik & strategi", "Merebut & jaga net"],
  ["reading", "ingame", "Taktik & strategi", "Baca permainan lawan"],
  ["tempo", "ingame", "Taktik & strategi", "Variasi tempo"],
  ["communication", "ingame", "Kerja sama", "Komunikasi partner"],
  ["partner_movement", "ingame", "Kerja sama", "Gerak bareng partner"],
  ["middle_ball", "ingame", "Kerja sama", "Bola tengah"],
  ["clutch", "ingame", "Mental", "Tenang di poin penting"],
  ["focus", "ingame", "Mental", "Fokus & konsisten"],
  ["comeback", "ingame", "Mental", "Bangkit saat ketinggalan"],
  ["sportsmanship", "ingame", "Mental", "Sportivitas"],
  ["footwork", "ingame", "Fisik", "Footwork / split-step"],
  ["agility", "ingame", "Fisik", "Kelincahan & reaksi"],
  ["stamina", "ingame", "Fisik", "Stamina"],
];

export const COACHING_SKILLS: SkillDef[] = LIST.map(([key, kind, group_label, label], i) => ({ key, kind, group_label, label, sort: i + 1 }));

const KEY_BY_LABEL = new Map(COACHING_SKILLS.map((s) => [s.label.toLowerCase(), s.key]));

/** A skill name as stored by the admin coaching tables → our key (null when it is not in the list). */
export function skillKeyByLabel(label: string): string | null {
  return KEY_BY_LABEL.get(label.trim().toLowerCase()) ?? null;
}
