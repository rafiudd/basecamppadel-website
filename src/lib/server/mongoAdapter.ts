/**
 * MongoDB Adapter Facade
 * 
 * Re-exports modularized MongoDB adapter components.
 * Submodules are located in ./mongo/ directory:
 * - utils.ts: Document normalization and ID filter helpers
 * - relations.ts: Foreign-key relation population logic
 * - rpc.ts: Stored procedure (RPC) handlers
 * - auth.ts: Supabase-compatible authentication adapter
 * - queryBuilder.ts: PostgREST-compatible chainable query builder
 */

export {
  MongoClientAdapter,
  MongoQueryBuilder,
  normalizeDoc,
  buildIdFilter,
  populateRelations,
  executeMongoRpc,
  createMongoAuthAdapter,
} from "./mongo";
