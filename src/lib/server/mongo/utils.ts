/**
 * Utilities for MongoDB document normalization and query helpers.
 */

export function normalizeDoc(doc: any): any {
  if (!doc) return null;
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v instanceof Date) {
      res[k] = v.toISOString();
    } else {
      res[k] = v;
    }
  }
  if (!res.id && res._id) {
    res.id = String(res._id);
  }
  return res;
}

export function buildIdFilter(val: any, fieldName = "id"): Record<string, any> {
  if (fieldName === "user_id") {
    return { $or: [{ _id: val }, { user_id: val }] };
  }
  return { $or: [{ _id: val }, { [fieldName]: val }] };
}

/**
 * `comp_finish_event` takes `p_stages` as `[{ team_id, stage }]` (see database.types).
 * Also accepts a `{ [teamId]: stage }` map so older callers keep working.
 */
export function stageEntries(pStages: unknown): [string, string][] {
  if (Array.isArray(pStages)) {
    return pStages
      .filter((s) => s && s.team_id && s.stage)
      .map((s) => [String(s.team_id), String(s.stage)]);
  }
  if (pStages && typeof pStages === "object") {
    return Object.entries(pStages).map(([teamId, stage]) => [teamId, String(stage)]);
  }
  return [];
}
