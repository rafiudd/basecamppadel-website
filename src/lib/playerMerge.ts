/** Merging a duplicate player: the pure parts, shared by the server merge and the admin UI. */

/** What a player has in the database: shown before deleting a player, and on both sides of a merge. */
export type PlayerFootprint = {
  matches: number;
  awards: number;
  events: number;
  coachingSessions: number;
  assessments: number;
  classes: number;
  /** Email of the player account linked to this player, if any. */
  accountEmail: string | null;
};

/** "12 match · 3 penilaian coaching": the parts of a footprint that are not zero. */
export function footprintParts(f: PlayerFootprint): string[] {
  return [
    f.matches && `${f.matches} match`,
    f.awards && `${f.awards} penghargaan event`,
    f.events && `${f.events} event`,
    f.coachingSessions && `${f.coachingSessions} sesi coaching`,
    f.assessments && `${f.assessments} penilaian coaching`,
    f.classes && `${f.classes} pendaftaran kelas`,
  ].filter((s): s is string => Boolean(s));
}

/** "Erick KS / Budi" with "Erick KS" → "Erick": only whole names between " / " are replaced. */
export function renameInTeamName(teamName: string, from: string, to: string): string {
  if (!from.trim() || from === to) return teamName;
  return teamName
    .split(" / ")
    .map((part) => (part.trim() === from.trim() ? to : part))
    .join(" / ");
}
