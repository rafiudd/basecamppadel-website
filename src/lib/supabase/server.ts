import { MongoClientAdapter } from "@/lib/server/mongoAdapter";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Returns a MongoDB-backed database client with the same API interface
 * used across Server Components and Server Actions.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  return new MongoClientAdapter() as unknown as SupabaseClient<Database>;
}
