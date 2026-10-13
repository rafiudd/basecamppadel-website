/**
 * The default 39 coaching skills (same as the admin's initial Master Teknik seed). The real list
 * lives in `coaching_skills`, which the admin can edit; this one serves the demo and is the fallback
 * when that table is empty. Pure (type import only).
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
