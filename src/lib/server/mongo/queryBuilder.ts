import { getDb } from "@/lib/mongodb";
import crypto from "crypto";
import { normalizeDoc, buildIdFilter } from "./utils";
import { populateRelations } from "./relations";

type FilterOp = Record<string, any>;

export class MongoQueryBuilder<T = any> {
  private collectionName: string;
  private filter: FilterOp = {};
  private sortObj: Record<string, 1 | -1> = {};
  private projection: Record<string, 1> | undefined = undefined;
  private limitCount?: number;
  private skipCount?: number;
  private countMode?: "exact";
  private isHeadOnly = false;
  private mutationPromise?: Promise<any>;

  private rawFields = "*";

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  select(fields?: string, opts?: { count?: "exact"; head?: boolean }) {
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.isHeadOnly = opts.head;
    if (fields) this.rawFields = fields;

    if (fields && !fields.includes("*")) {
      const fieldList = fields.split(",").map((f) => f.trim().split(/\s+/)[0]);
      const proj: Record<string, 1> = {};
      for (const f of fieldList) {
        if (!f.includes("(") && !f.includes(":")) {
          proj[f] = 1;
        }
      }
      if (Object.keys(proj).length > 0) {
        this.projection = proj;
      }
    }
    return this;
  }

  eq(column: string, value: any) {
    if (column === "id") {
      this.addFilter(buildIdFilter(value, "id"));
    } else if (column === "user_id") {
      this.addFilter(buildIdFilter(value, "user_id"));
    } else {
      this.addFilter({ [column]: value });
    }
    return this;
  }

  neq(column: string, value: any) {
    this.addFilter({ [column]: { $ne: value } });
    return this;
  }

  gt(column: string, value: any) {
    this.addFilter({ [column]: { $gt: value } });
    return this;
  }

  gte(column: string, value: any) {
    this.addFilter({ [column]: { $gte: value } });
    return this;
  }

  lt(column: string, value: any) {
    this.addFilter({ [column]: { $lt: value } });
    return this;
  }

  lte(column: string, value: any) {
    this.addFilter({ [column]: { $lte: value } });
    return this;
  }

  in(column: string, values: any[]) {
    if (!values || values.length === 0) {
      this.addFilter({ [column]: "__EMPTY_ARRAY__" });
      return this;
    }
    if (column === "id") {
      this.addFilter({ $or: [{ _id: { $in: values } }, { id: { $in: values } }] });
    } else if (column === "user_id") {
      this.addFilter({ $or: [{ _id: { $in: values } }, { user_id: { $in: values } }] });
    } else {
      this.addFilter({ [column]: { $in: values } });
    }
    return this;
  }

  is(column: string, value: any) {
    this.addFilter({ [column]: value });
    return this;
  }

  ilike(column: string, pattern: string) {
    const regexPattern = "^" + pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$";
    this.addFilter({ [column]: { $regex: regexPattern, $options: "i" } });
    return this;
  }

  contains(column: string, value: any) {
    const arr = Array.isArray(value) ? value : [value];
    this.addFilter({ [column]: { $all: arr } });
    return this;
  }

  or(filterStr: string) {
    const conditions = filterStr.split(",").map((cond) => cond.trim());
    const orClauses: any[] = [];
    for (const c of conditions) {
      const parts = c.split(".");
      if (parts.length >= 3) {
        const [field, op, ...valParts] = parts;
        const val = valParts.join(".");
        if (op === "eq") {
          const parsedVal = val === "true" ? true : val === "false" ? false : val;
          orClauses.push({ [field]: parsedVal });
        }
      }
    }
    if (orClauses.length > 0) {
      this.addFilter({ $or: orClauses });
    }
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.sortObj[column] = opts?.ascending !== false ? 1 : -1;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.skipCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  private addFilter(clause: any) {
    if (Object.keys(this.filter).length === 0) {
      this.filter = clause;
    } else if (this.filter.$and) {
      this.filter.$and.push(clause);
    } else {
      this.filter = { $and: [this.filter, clause] };
    }
  }

  async executeQuery(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      if (this.mutationPromise) {
        return await this.mutationPromise;
      }

      const db = await getDb();
      const coll = db.collection(this.collectionName);

      let totalCount: number | null = null;
      if (this.countMode === "exact") {
        totalCount = await coll.countDocuments(this.filter as any);
        if (this.isHeadOnly) {
          return { data: null, error: null, count: totalCount };
        }
      }

      let cursor = coll.find(this.filter as any);
      if (Object.keys(this.sortObj).length > 0) {
        cursor = cursor.sort(this.sortObj);
      }
      if (this.skipCount !== undefined) {
        cursor = cursor.skip(this.skipCount);
      }
      if (this.limitCount !== undefined) {
        cursor = cursor.limit(this.limitCount);
      }
      if (this.projection) {
        cursor = cursor.project(this.projection);
      }

      const rawDocs = await cursor.toArray();
      const docs = rawDocs.map((d) => normalizeDoc(d));

      // Relational population
      await populateRelations(this.collectionName, docs, this.rawFields, db);

      return {
        data: docs,
        error: null,
        count: totalCount !== null ? totalCount : docs.length,
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    this.limit(1);
    const res = await this.executeQuery();
    if (res.error) return { data: null, error: res.error };
    const doc = Array.isArray(res.data)
      ? (res.data.length > 0 ? res.data[0] : null)
      : (res.data || null);
    return { data: doc, error: null };
  }

  async single(): Promise<{ data: any; error: any }> {
    this.limit(1);
    const res = await this.executeQuery();
    if (res.error) return { data: null, error: res.error };
    const doc = Array.isArray(res.data)
      ? (res.data.length > 0 ? res.data[0] : null)
      : (res.data || null);
    if (!doc) {
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
      };
    }
    return { data: doc, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.executeQuery().then(onfulfilled, onrejected);
  }

  // --- MUTATION METHODS ---

  insert(values: any | any[]) {
    this.mutationPromise = (async () => {
      const db = await getDb();
      const coll = db.collection(this.collectionName);

      const items = Array.isArray(values) ? values : [values];
      const prepared = items.map((item) => {
        const id = item.id || item.user_id || crypto.randomUUID();
        return {
          _id: id,
          id,
          created_at: item.created_at || new Date(),
          updated_at: new Date(),
          ...item,
        };
      });

      if (prepared.length === 1) {
        await coll.insertOne(prepared[0]);
      } else if (prepared.length > 1) {
        await coll.insertMany(prepared);
      }

      const inserted = prepared.map((p) => normalizeDoc(p));
      return {
        data: inserted,
        error: null,
        select: () => ({
          single: async () => ({ data: inserted[0], error: null }),
          maybeSingle: async () => ({ data: inserted[0], error: null }),
        }),
      };
    })();
    return this;
  }

  update(values: Record<string, any>) {
    const self = this;
    const runner = async () => {
      const db = await getDb();
      const coll = db.collection(self.collectionName);
      const updateData = {
        ...values,
        updated_at: new Date(),
      };
      await coll.updateMany(self.filter as any, { $set: updateData });
      return { data: null, error: null };
    };

    return {
      then: (onf?: any, onr?: any) => runner().then(onf, onr),
      eq: (col: string, val: any) => {
        self.eq(col, val);
        return {
          then: (onf?: any, onr?: any) => runner().then(onf, onr),
          select: () => ({
            then: (onf?: any, onr?: any) => runner().then(onf, onr),
            single: async () => {
              await runner();
              const coll = (await getDb()).collection(self.collectionName);
              const res = await coll.findOne(self.filter as any);
              return { data: normalizeDoc(res), error: null };
            },
          }),
        };
      },
      in: (col: string, vals: any[]) => {
        self.in(col, vals);
        return {
          then: (onf?: any, onr?: any) => runner().then(onf, onr),
        };
      },
      select: () => ({
        then: (onf?: any, onr?: any) => runner().then(onf, onr),
        single: async () => {
          await runner();
          const coll = (await getDb()).collection(self.collectionName);
          const res = await coll.findOne(self.filter as any);
          return { data: normalizeDoc(res), error: null };
        },
      }),
    };
  }

  delete() {
    const self = this;
    const runner = async () => {
      const db = await getDb();
      const coll = db.collection(self.collectionName);
      await coll.deleteMany(self.filter as any);
      return { data: null, error: null };
    };

    return {
      then: (onf?: any, onr?: any) => runner().then(onf, onr),
      eq: (col: string, val: any) => {
        self.eq(col, val);
        return {
          then: (onf?: any, onr?: any) => runner().then(onf, onr),
        };
      },
      in: (col: string, vals: any[]) => {
        self.in(col, vals);
        return {
          then: (onf?: any, onr?: any) => runner().then(onf, onr),
        };
      },
    };
  }

  upsert(values: any | any[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mutationPromise = (async () => {
      const db = await getDb();
      const coll = db.collection(this.collectionName);

      const items = Array.isArray(values) ? values : [values];
      const conflictCols = opts?.onConflict
        ? opts.onConflict.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

      const results: any[] = [];

      for (const item of items) {
        let filter: Record<string, any> = {};

        if (conflictCols.length > 0) {
          for (const col of conflictCols) {
            if (item[col] !== undefined) {
              filter[col] = item[col];
            }
          }
        } else if (item.id) {
          filter = { $or: [{ _id: item.id }, { id: item.id }] };
        } else if (item.user_id) {
          filter = { $or: [{ _id: item.user_id }, { user_id: item.user_id }] };
        } else if (this.collectionName === "coaching_assessments" && item.session_id && item.player_id) {
          filter = { session_id: item.session_id, player_id: item.player_id };
        } else if (this.collectionName === "coaching_session_players" && item.session_id && item.player_id) {
          filter = { session_id: item.session_id, player_id: item.player_id };
        }

        const existing = Object.keys(filter).length > 0 ? await coll.findOne(filter as any) : null;

        if (existing) {
          if (opts?.ignoreDuplicates) {
            results.push(normalizeDoc(existing));
            continue;
          }
          const updateData = {
            ...item,
            updated_at: item.updated_at || new Date(),
          };
          delete updateData._id;
          await coll.updateOne({ _id: existing._id }, { $set: updateData });
          const updated = await coll.findOne({ _id: existing._id });
          results.push(normalizeDoc(updated));
        } else {
          const id = item.id || item.user_id || crypto.randomUUID();
          const doc = {
            _id: id,
            id,
            created_at: item.created_at || new Date(),
            updated_at: item.updated_at || new Date(),
            ...item,
          };
          await coll.insertOne(doc);
          results.push(normalizeDoc(doc));
        }
      }

      const resData = Array.isArray(values) ? results : (results[0] || null);
      return {
        data: resData,
        error: null,
        select: () => ({
          single: async () => ({ data: results[0] || null, error: null }),
          maybeSingle: async () => ({ data: results[0] || null, error: null }),
        }),
      };
    })();
    return this;
  }
}
