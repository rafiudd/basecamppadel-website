import { MongoQueryBuilder } from "./queryBuilder";
import { executeMongoRpc } from "./rpc";
import { createMongoAuthAdapter } from "./auth";

export { MongoQueryBuilder } from "./queryBuilder";
export { normalizeDoc, buildIdFilter } from "./utils";
export { populateRelations } from "./relations";
export { executeMongoRpc } from "./rpc";
export { createMongoAuthAdapter } from "./auth";

export class MongoClientAdapter {
  from(collectionName: string) {
    return new MongoQueryBuilder(collectionName);
  }

  async rpc(functionName: string, args: Record<string, any> = {}) {
    return executeMongoRpc(functionName, args);
  }

  get auth() {
    return createMongoAuthAdapter();
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
