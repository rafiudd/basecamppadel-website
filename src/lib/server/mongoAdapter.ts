import { getDb } from "@/lib/mongodb";
import { getSessionUser, setSessionCookie, clearSessionCookie } from "./session";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

  private rawFields: string = "*";

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
      this.addFilter({ $or: [{ _id: value }, { id: value }] });
    } else if (column === "user_id") {
      this.addFilter({ $or: [{ _id: value }, { user_id: value }] });
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

  private normalizeDoc(doc: any): any {
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
      const docs = rawDocs.map((d) => this.normalizeDoc(d));

      // Relational population for foreign keys
      if (this.rawFields.includes("point_presets") && this.collectionName === "leagues") {
        const presetIds = docs.map((d) => d.point_preset_id).filter(Boolean);
        if (presetIds.length > 0) {
          const presets = await db.collection("point_presets").find({
            $or: [{ _id: { $in: presetIds } }, { id: { $in: presetIds } }],
          } as any).toArray();
          const pMap = new Map(presets.map((p) => [String(p.id || p._id), p]));
          for (const d of docs) {
            const found = pMap.get(d.point_preset_id);
            d.point_presets = found ? { name: found.name } : null;
          }
        }
      }

      if (this.rawFields.includes("events") && this.collectionName === "league_volumes") {
        const eventIds = docs.map((d) => d.event_id).filter(Boolean);
        if (eventIds.length > 0) {
          const events = await db.collection("events").find({
            $or: [{ _id: { $in: eventIds } }, { id: { $in: eventIds } }],
          } as any).toArray();
          const evMap = new Map(events.map((e) => [String(e.id || e._id), e]));
          for (const d of docs) {
            const ev = evMap.get(d.event_id);
            d.events = ev ? this.normalizeDoc(ev) : null;
          }
        }
      }

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
    const doc = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    return { data: doc, error: null };
  }

  async single(): Promise<{ data: any; error: any }> {
    this.limit(1);
    const res = await this.executeQuery();
    if (res.error) return { data: null, error: res.error };
    const doc = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
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

      const inserted = prepared.map((p) => this.normalizeDoc(p));
      return {
        data: Array.isArray(values) ? inserted : inserted[0],
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
              return { data: self.normalizeDoc(res), error: null };
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
          return { data: self.normalizeDoc(res), error: null };
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

  upsert(values: any | any[], opts?: { onConflict?: string }) {
    this.mutationPromise = (async () => {
      const db = await getDb();
      const coll = db.collection(this.collectionName);

      const items = Array.isArray(values) ? values : [values];
      for (const item of items) {
        const id = item.id || item.user_id || crypto.randomUUID();
        const doc = {
          _id: id,
          id,
          updated_at: new Date(),
          ...item,
        };
        const filter = item.user_id ? { $or: [{ _id: item.user_id }, { user_id: item.user_id }] } : { $or: [{ _id: id }, { id }] };
        await coll.replaceOne(filter as any, doc, { upsert: true });
      }

      return { data: values, error: null };
    })();
    return this;
  }
}

export class MongoClientAdapter {
  from(collectionName: string) {
    return new MongoQueryBuilder(collectionName);
  }

  async rpc(functionName: string, args: Record<string, any> = {}) {
    const db = await getDb();

    switch (functionName) {
      case "coaching_set_session_status": {
        const { p_session_id, p_status } = args;
        await db.collection("coaching_sessions").updateOne(
          { $or: [{ _id: p_session_id }, { id: p_session_id }] } as any,
          { $set: { status: p_status, updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      case "coaching_apply_level": {
        const { p_player_id, p_level } = args;
        await db.collection("players").updateOne(
          { $or: [{ _id: p_player_id }, { id: p_player_id }] } as any,
          { $set: { level: p_level, updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      case "account_save_profile": {
        const user = await getSessionUser();
        if (!user) return { data: null, error: { message: "Unauthorized" } };
        const { p_nickname, p_gender, p_whatsapp, p_region, p_dominant_hand, p_position, p_instagram, p_play_duration, p_self_level } = args;

        const profileDoc = {
          user_id: user.id,
          email: user.email,
          nickname: p_nickname,
          gender: p_gender,
          whatsapp: p_whatsapp,
          region: p_region || "",
          dominant_hand: p_dominant_hand || null,
          position: p_position || null,
          instagram: p_instagram || "",
          play_duration: p_play_duration || null,
          self_level: p_self_level || null,
          updated_at: new Date(),
        };

        await db.collection("profiles").updateOne(
          { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
          { $set: profileDoc, $setOnInsert: { created_at: new Date() } },
          { upsert: true }
        );

        // Sync name to player if linked
        const existing = await db.collection("profiles").findOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any);
        if (existing?.player_id) {
          await db.collection("players").updateOne(
            { $or: [{ _id: existing.player_id }, { id: existing.player_id }] } as any,
            { $set: { name: p_nickname, updated_at: new Date() } }
          );
        }
        return { data: profileDoc, error: null };
      }

      case "account_choose_player": {
        const user = await getSessionUser();
        if (!user) return { data: null, error: { message: "Unauthorized" } };
        const { p_player } = args;
        await db.collection("profiles").updateOne(
          { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
          { $set: { player_id: p_player, claim_player_id: null, updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      case "account_delete": {
        const user = await getSessionUser();
        if (!user) return { data: null, error: { message: "Unauthorized" } };
        await db.collection("profiles").deleteOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any);
        await db.collection("auth_users").deleteOne({ $or: [{ _id: user.id }, { id: user.id }] } as any);
        await clearSessionCookie();
        return { data: null, error: null };
      }

      case "account_name_candidates": {
        const user = await getSessionUser();
        const profile = user ? await db.collection("profiles").findOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any) : null;
        const nameQuery = profile?.nickname || "";
        const candidates = await db.collection("players")
          .find({ name: { $regex: nameQuery, $options: "i" }, active: true })
          .limit(10)
          .toArray();
        return { data: candidates, error: null };
      }

      case "account_resolve_claim": {
        const { p_uid, p_approve } = args;
        const profile = await db.collection("profiles").findOne({ $or: [{ _id: p_uid }, { user_id: p_uid }] } as any);
        if (profile) {
          if (p_approve) {
            await db.collection("profiles").updateOne(
              { _id: profile._id },
              { $set: { player_id: profile.claim_player_id, claim_player_id: null, updated_at: new Date() } }
            );
          } else {
            await db.collection("profiles").updateOne(
              { _id: profile._id },
              { $set: { claim_player_id: null, updated_at: new Date() } }
            );
          }
        }
        return { data: null, error: null };
      }

      case "account_set_default_photo": {
        const user = await getSessionUser();
        if (!user) return { data: null, error: { message: "Unauthorized" } };
        const { p_photo_url } = args;
        await db.collection("profiles").updateOne(
          { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
          { $set: { photo_url: p_photo_url, updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      case "comp_set_result": {
        const { p_match_id, p_games_a, p_games_b, p_wo } = args;
        await db.collection("matches").updateOne(
          { $or: [{ _id: p_match_id }, { id: p_match_id }] } as any,
          {
            $set: {
              team_a_games: p_games_a,
              team_b_games: p_games_b,
              wo: p_wo || false,
              status: "finished",
              updated_at: new Date(),
            },
          }
        );
        return { data: null, error: null };
      }

      case "comp_finish_event": {
        const { p_event_id } = args;
        await db.collection("events").updateOne(
          { $or: [{ _id: p_event_id }, { id: p_event_id }] } as any,
          { $set: { status: "finished", updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      default:
        console.warn(`[MongoAdapter] Unhandled RPC: ${functionName}`);
        return { data: null, error: null };
    }
  }

  get auth() {
    return {
      getUser: async () => {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return { data: { user: null }, error: null };
        return {
          data: {
            user: {
              id: sessionUser.id,
              email: sessionUser.email,
              user_metadata: sessionUser.user_metadata,
            },
          },
          error: null,
        };
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const db = await getDb();
        const user = await db.collection("auth_users").findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.encrypted_password) {
          return { data: { user: null }, error: { message: "Email atau password salah." } };
        }

        const isMatch = await bcrypt.compare(password, user.encrypted_password);
        if (!isMatch) {
          return { data: { user: null }, error: { message: "Email atau password salah." } };
        }

        const userId = String(user.id || user._id);
        const adminRow = await db.collection("admin_users").findOne({
          $or: [{ user_id: userId }, { _id: userId }],
        } as any);

        await setSessionCookie({
          id: userId,
          email: user.email,
          role: adminRow?.role || "admin",
          coach_id: adminRow?.coach_id || null,
          user_metadata: user.raw_user_meta_data || {},
        });

        return {
          data: {
            user: {
              id: userId,
              email: user.email,
              user_metadata: user.raw_user_meta_data || {},
            },
          },
          error: null,
        };
      },

      exchangeCodeForSession: async (code: string) => {
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!sbUrl || !anonKey) {
          return { data: { user: null }, error: { message: "Auth provider not configured" } };
        }

        try {
          const res = await fetch(`${sbUrl}/auth/v1/token?grant_type=pkce`, {
            method: "POST",
            headers: {
              apikey: anonKey,
              "content-type": "application/json",
            },
            body: JSON.stringify({ auth_code: code }),
          });

          const tokenData = await res.json();
          if (!res.ok || !tokenData?.user) {
            return { data: { user: null }, error: { message: tokenData?.error_description || "Exchange failed" } };
          }

          const sbUser = tokenData.user;
          const db = await getDb();

          await db.collection("auth_users").updateOne(
            { $or: [{ _id: sbUser.id }, { id: sbUser.id }] } as any,
            {
              $set: {
                id: sbUser.id,
                email: sbUser.email,
                role: "authenticated",
                raw_user_meta_data: sbUser.user_metadata || {},
                updated_at: new Date(),
              },
              $setOnInsert: { created_at: new Date() },
            },
            { upsert: true }
          );

          const adminRow = await db.collection("admin_users").findOne({
            $or: [{ user_id: sbUser.id }, { _id: sbUser.id }],
          } as any);

          await setSessionCookie({
            id: sbUser.id,
            email: sbUser.email,
            role: adminRow?.role || "authenticated",
            coach_id: adminRow?.coach_id || null,
            user_metadata: sbUser.user_metadata || {},
          });

          return { data: { user: sbUser }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: err };
        }
      },

      signOut: async () => {
        await clearSessionCookie();
        return { error: null };
      },
    };
  }

  channel(name: string) {
    return {
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    };
  }

  removeChannel() {}
}
