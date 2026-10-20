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
