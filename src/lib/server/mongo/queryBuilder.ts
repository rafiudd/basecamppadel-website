import { getDb } from "../../mongodb.ts";
import { DEFAULT_MATCH_SETS } from "../../database.types.ts";
import crypto from "crypto";
import { normalizeDoc, buildIdFilter } from "./utils.ts";
import { populateRelations } from "./relations.ts";
import {
  applyCollectionDefaults,
  handleCascadeDelete,
  levelColorFor,
  recomputePlayerStats,
} from "./triggers.ts";

type FilterOp = Record<string, any>;

interface SortSpec {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

export type QueryResult<R> =
  | { data: R; error: null; count?: number | null }
  | {
      data: null;
      error: { message: string; code?: string; details?: any };
      count?: number | null;
    };

export class MongoQueryBuilder<T = any, R = T[]> {
  private collectionName: string;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private filter: FilterOp = {};
  private sortSpecs: SortSpec[] = [];
  private limitCount?: number;
  private skipCount?: number;
  private countMode?: "exact";
  private isHeadOnly = false;
  private returnMode: "many" | "single" | "maybeSingle" = "many";
  private hasSelect = false;
  private rawFields = "*";

  private payload?: any;
  private upsertOpts?: { onConflict?: string; ignoreDuplicates?: boolean };
  private executedPromise?: Promise<{ data: any; error: any; count?: number | null }>;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  select(fields?: string, opts?: { count?: "exact"; head?: boolean }) {
    this.hasSelect = true;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.isHeadOnly = opts.head;
    if (fields) this.rawFields = fields;
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
    if (column === "id") {
      this.addFilter({ _id: { $ne: value }, id: { $ne: value } });
    } else if (column === "user_id") {
      this.addFilter({ _id: { $ne: value }, user_id: { $ne: value } });
    } else {
      this.addFilter({ [column]: { $ne: value } });
    }
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

  not(column: string, operator: string, value: any) {
    const op = operator.toLowerCase();
    if (op === "is" || op === "eq") {
      this.addFilter({ [column]: { $ne: value } });
    } else if (op === "in" && Array.isArray(value)) {
      this.addFilter({ [column]: { $nin: value } });
    } else if (op === "ilike" && typeof value === "string") {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexPattern = "^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$";
      this.addFilter({ [column]: { $not: { $regex: regexPattern, $options: "i" } } });
    } else {
      this.addFilter({ [column]: { $ne: value } });
    }
    return this;
  }

  match(query: Record<string, any>) {
    if (query && typeof query === "object") {
      for (const [k, v] of Object.entries(query)) {
        this.eq(k, v);
      }
    }
    return this;
  }

  ilike(column: string, pattern: string) {
    const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexPattern = "^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$";
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
        const parsedVal =
          val === "true" ? true : val === "false" ? false : val === "null" ? null : val;
        if (op === "eq" || op === "is") {
          orClauses.push({ [field]: parsedVal });
        } else if (op === "neq") {
          orClauses.push({ [field]: { $ne: parsedVal } });
        } else if (op === "ilike") {
          const escaped = String(val).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regexPattern = "^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$";
          orClauses.push({ [field]: { $regex: regexPattern, $options: "i" } });
        }
      }
    }
    if (orClauses.length > 0) {
      this.addFilter({ $or: orClauses });
    }
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.sortSpecs.push({
      column,
      ascending: opts?.ascending !== false,
      nullsFirst: opts?.nullsFirst,
    });
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

  maybeSingle(): MongoQueryBuilder<T, T | null> {
    this.returnMode = "maybeSingle";
    if (this.op === "select") {
      this.limit(1);
    }
    return this as unknown as MongoQueryBuilder<T, T | null>;
  }

  single(): MongoQueryBuilder<T, T> {
    this.returnMode = "single";
    if (this.op === "select") {
      this.limit(1);
    }
    return this as unknown as MongoQueryBuilder<T, T>;
  }

  // --- MUTATION METHODS ---

  insert(values: any | any[]) {
    this.op = "insert";
    this.payload = values;
    return this;
  }

  update(values: Record<string, any>) {
    this.op = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  upsert(values: any | any[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.payload = values;
    this.upsertOpts = opts;
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

  private applyReturnMode(docs: any[], count?: number | null) {
    if (this.returnMode === "maybeSingle") {
      const doc = Array.isArray(docs) ? (docs.length > 0 ? docs[0] : null) : docs || null;
      return { data: doc, error: null };
    }
    if (this.returnMode === "single") {
      const doc = Array.isArray(docs) ? (docs.length > 0 ? docs[0] : null) : docs || null;
      if (!doc) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
          },
        };
      }
      return { data: doc, error: null };
    }
    return {
      data: docs,
      error: null,
      ...(count !== undefined ? { count } : {}),
    };
  }

  private sortInMemory(docs: any[]): any[] {
    if (this.sortSpecs.length === 0) return docs;
    return [...docs].sort((a, b) => {
      for (const spec of this.sortSpecs) {
        const va = a[spec.column];
        const vb = b[spec.column];
        const aNull = va === null || va === undefined;
        const bNull = vb === null || vb === undefined;
        if (aNull && bNull) continue;
        // Postgres default: ASC -> nulls last (nullsFirst=false); DESC -> nulls first (nullsFirst=true)
        const nullsFirst = spec.nullsFirst ?? !spec.ascending;
        if (aNull) return nullsFirst ? -1 : 1;
        if (bNull) return nullsFirst ? 1 : -1;
        if (va < vb) return spec.ascending ? -1 : 1;
        if (va > vb) return spec.ascending ? 1 : -1;
      }
      return 0;
    });
  }

  async executeQuery(): Promise<{ data: any; error: any; count?: number | null }> {
    if (this.executedPromise) {
      return this.executedPromise;
    }
    this.executedPromise = this._runOperation();
    return this.executedPromise;
  }

  private async _runOperation(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const db = await getDb();
      const coll = db.collection(this.collectionName);

      if (this.op === "select") {
        let totalCount: number | null = null;
        if (this.countMode === "exact") {
          totalCount = await coll.countDocuments(this.filter as any);
          if (this.isHeadOnly) {
            return { data: null, error: null, count: totalCount };
          }
        }

        const needsCustomNullSort = this.sortSpecs.some(
          (s) =>
            (s.ascending && (s.nullsFirst === false || s.nullsFirst === undefined)) ||
            (!s.ascending && s.nullsFirst === true)
        );

        let cursor = coll.find(this.filter as any);
        if (this.sortSpecs.length > 0) {
          const sortObj: Record<string, 1 | -1> = {};
          for (const s of this.sortSpecs) {
            sortObj[s.column] = s.ascending ? 1 : -1;
          }
          cursor = cursor.sort(sortObj);
        }

        if (!needsCustomNullSort) {
          if (this.skipCount !== undefined) cursor = cursor.skip(this.skipCount);
          if (this.limitCount !== undefined) cursor = cursor.limit(this.limitCount);
        }

        const rawDocs = await cursor.toArray();
        let docs = rawDocs.map((d) => {
          const doc = normalizeDoc(d);
          if (this.collectionName === "matches" && doc) {
            if (!Array.isArray(doc.team_a_sets)) doc.team_a_sets = [...DEFAULT_MATCH_SETS];
            if (!Array.isArray(doc.team_b_sets)) doc.team_b_sets = [...DEFAULT_MATCH_SETS];
          }
          return doc;
        });

        if (needsCustomNullSort && this.sortSpecs.length > 0) {
          docs = this.sortInMemory(docs);
          const start = this.skipCount ?? 0;
          const end =
            this.limitCount !== undefined ? start + this.limitCount : undefined;
          docs = docs.slice(start, end);
        }

        await populateRelations(this.collectionName, docs, this.rawFields, db);

        return this.applyReturnMode(
          docs,
          totalCount !== null ? totalCount : docs.length
        );
      }

      if (this.op === "insert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const now = new Date();
        const prepared: Record<string, any>[] = items.map((rawItem) => {
          const item = applyCollectionDefaults(this.collectionName, rawItem);
          const id = item.id || item.user_id || crypto.randomUUID();
          return {
            ...item,
            _id: id,
            id,
            created_at: item.created_at || now,
            updated_at: item.updated_at || now,
          };
        });

        if (this.collectionName === "matches") {
          for (const doc of prepared) {
            if (doc.is_live && doc.court_id) {
              const conflict = await coll.findOne({
                court_id: doc.court_id,
                is_live: true,
                _id: { $ne: doc._id },
              } as any);
              if (conflict) {
                const err: any = new Error(
                  "duplicate key value violates unique constraint \"matches_one_on_air_per_court\""
                );
                err.code = "23505";
                throw err;
              }
            }
          }
        }

        if (prepared.length === 1) {
          await coll.insertOne(prepared[0]);
        } else if (prepared.length > 1) {
          await coll.insertMany(prepared);
        }

        if (
          this.collectionName === "match_history" ||
          this.collectionName === "player_awards"
        ) {
          await recomputePlayerStats(
            db,
            prepared.map((p) => p.player_id)
          );
        } else if (this.collectionName === "players") {
          const withAdjustment = prepared.filter(
            (p) => Number(p.points_adjustment || 0) !== 0
          );
          if (withAdjustment.length > 0) {
            await recomputePlayerStats(
              db,
              withAdjustment.map((p) => p.id)
            );
          }
        }

        const inserted = prepared.map((p) => normalizeDoc(p));
        await populateRelations(this.collectionName, inserted, this.rawFields, db);
        return this.applyReturnMode(inserted);
      }

      if (this.op === "update") {
        const updateData: Record<string, any> = {
          ...this.payload,
          updated_at: new Date(),
        };
        delete updateData._id;

        if (this.collectionName === "players" && updateData.level !== undefined) {
          updateData.level_color = levelColorFor(updateData.level);
        }

        // Check matches_one_on_air_per_court before setting is_live = true — scoped to the same
        // event (or, for a freeform match, other freeform matches) like the app-level "take the
        // court's other match off air" cleanup in live-actions.ts, so two events that reuse the same
        // physical court on different days don't block each other over a stale is_live left on one.
        if (this.collectionName === "matches" && updateData.is_live === true) {
          const targets = await coll.find(this.filter as any).toArray();
          for (const t of targets) {
            const courtId = updateData.court_id ?? t.court_id;
            if (courtId) {
              const eventId = updateData.event_id ?? t.event_id ?? null;
              const conflict = await coll.findOne({
                court_id: courtId,
                is_live: true,
                event_id: eventId,
                _id: { $ne: t._id },
              } as any);
              if (conflict) {
                const err: any = new Error(
                  "duplicate key value violates unique constraint \"matches_one_on_air_per_court\""
                );
                err.code = "23505";
                throw err;
              }
            }
          }
        }

        let affectedPlayerIds: string[] = [];
        if (
          this.collectionName === "match_history" ||
          this.collectionName === "player_awards"
        ) {
          const beforeDocs = await coll.find(this.filter as any).toArray();
          affectedPlayerIds.push(...beforeDocs.map((d) => d.player_id).filter(Boolean));
          if (updateData.player_id) affectedPlayerIds.push(updateData.player_id);
        } else if (
          this.collectionName === "players" &&
          updateData.points_adjustment !== undefined
        ) {
          const beforePlayers = await coll.find(this.filter as any).toArray();
          affectedPlayerIds.push(
            ...beforePlayers.map((p) => String(p.id || p._id)).filter(Boolean)
          );
        }

        await coll.updateMany(this.filter as any, { $set: updateData });

        if (affectedPlayerIds.length > 0) {
          await recomputePlayerStats(db, affectedPlayerIds);
        }

        if (this.hasSelect || this.returnMode !== "many") {
          const rawDocs = await coll.find(this.filter as any).toArray();
          const docs = rawDocs.map((d) => normalizeDoc(d));
          await populateRelations(this.collectionName, docs, this.rawFields, db);
          return this.applyReturnMode(docs);
        }

        return { data: null, error: null };
      }

      if (this.op === "delete") {
        const toDelete = await coll.find(this.filter as any).toArray();
        if (toDelete.length > 0) {
          await coll.deleteMany(this.filter as any);
          await handleCascadeDelete(db, this.collectionName, toDelete);
        }
        const deleted = toDelete.map((d) => normalizeDoc(d));
        if (this.hasSelect || this.returnMode !== "many") {
          return this.applyReturnMode(deleted);
        }
        return { data: null, error: null };
      }

      if (this.op === "upsert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const opts = this.upsertOpts;
        const conflictCols = opts?.onConflict
          ? opts.onConflict
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [];

        const results: any[] = [];
        const affectedPlayerIds: string[] = [];

        for (const rawItem of items) {
          let filter: Record<string, any> = {};

          if (conflictCols.length > 0) {
            for (const col of conflictCols) {
              if (rawItem[col] !== undefined) {
                if (col === "id" || col === "user_id") {
                  Object.assign(filter, buildIdFilter(rawItem[col], col));
                } else {
                  filter[col] = rawItem[col];
                }
              }
            }
          } else if (rawItem.id) {
            filter = { $or: [{ _id: rawItem.id }, { id: rawItem.id }] };
          } else if (rawItem.user_id) {
            filter = { $or: [{ _id: rawItem.user_id }, { user_id: rawItem.user_id }] };
          } else if (
            (this.collectionName === "coaching_assessments" ||
              this.collectionName === "coaching_session_players") &&
            rawItem.session_id &&
            rawItem.player_id
          ) {
            filter = { session_id: rawItem.session_id, player_id: rawItem.player_id };
          } else if (
            (this.collectionName === "player_awards" ||
              this.collectionName === "comp_team_players") &&
            rawItem.event_id &&
            rawItem.player_id
          ) {
            filter = { event_id: rawItem.event_id, player_id: rawItem.player_id };
          }

          const existing =
            Object.keys(filter).length > 0 ? await coll.findOne(filter as any) : null;

          if (existing) {
            if (opts?.ignoreDuplicates) {
              results.push(normalizeDoc(existing));
              continue;
            }
            const updateData: Record<string, any> = {
              ...rawItem,
              updated_at: rawItem.updated_at || new Date(),
            };
            delete updateData._id;
            if (this.collectionName === "players" && updateData.level !== undefined) {
              updateData.level_color = levelColorFor(updateData.level);
            }
            await coll.updateOne({ _id: existing._id }, { $set: updateData });
            const updated = await coll.findOne({ _id: existing._id });
            results.push(normalizeDoc(updated));
            if (existing.player_id) affectedPlayerIds.push(existing.player_id);
            if (rawItem.player_id) affectedPlayerIds.push(rawItem.player_id);
          } else {
            const item = applyCollectionDefaults(this.collectionName, rawItem);
            const id = item.id || item.user_id || crypto.randomUUID();
            const doc: Record<string, any> = {
              ...item,
              _id: id,
              id,
              created_at: item.created_at || new Date(),
              updated_at: item.updated_at || new Date(),
            };
            await coll.insertOne(doc as any);
            results.push(normalizeDoc(doc));
            if (doc.player_id) affectedPlayerIds.push(doc.player_id);
          }
        }

        if (
          (this.collectionName === "match_history" ||
            this.collectionName === "player_awards") &&
          affectedPlayerIds.length > 0
        ) {
          await recomputePlayerStats(db, affectedPlayerIds);
        }

        await populateRelations(this.collectionName, results, this.rawFields, db);
        if (this.returnMode !== "many") {
          return this.applyReturnMode(results);
        }
        const resData = Array.isArray(this.payload) ? results : results[0] || null;
        return { data: resData, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || String(err),
          code: err?.code !== undefined ? String(err.code) : undefined,
        },
      };
    }
  }

  then<
    TResult1 = QueryResult<R>,
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: QueryResult<R>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled as any, onrejected);
  }
}
