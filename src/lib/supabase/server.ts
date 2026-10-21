import { MongoClientAdapter } from "@/lib/server/mongoAdapter";

/**
 * Returns a MongoDB-backed database client with the same API interface
 * used across Server Components and Server Actions.
 */
export async function createClient(): Promise<MongoClientAdapter> {
  return new MongoClientAdapter();
}
