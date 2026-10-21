import type { Database } from "@/lib/database.types";
import { MongoQueryBuilder } from "./queryBuilder";
import { executeMongoRpc } from "./rpc";
import { createMongoAuthAdapter } from "./auth";

export { MongoQueryBuilder } from "./queryBuilder";
export { normalizeDoc, buildIdFilter } from "./utils";
export { populateRelations } from "./relations";
export { executeMongoRpc } from "./rpc";
export { createMongoAuthAdapter } from "./auth";

type Tables = Database["public"]["Tables"];
type TableRow<K extends string> = K extends keyof Tables
  ? Tables[K]["Row"] & Record<string, any>
  : any;

export class MongoClientAdapter {
  from<K extends string = string>(collectionName: K) {
    return new MongoQueryBuilder<TableRow<K>>(collectionName);
  }

  async rpc(functionName: string, args: Record<string, any> = {}) {
    return executeMongoRpc(functionName, args);
  }

  get auth() {
    return createMongoAuthAdapter();
  }

  channel(_name: string) {
    return {
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    };
  }

  removeChannel() {}
}
