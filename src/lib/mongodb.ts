import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoDbInstances: Map<string, Db> | undefined;
}

const MONGO_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 1,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

/**
 * Returns the target database name based on environment or explicit parameter.
 * Options: 'dev' | 'prod'
 */
export function getDbName(target?: "dev" | "prod" | string): string {
  if (target === "dev") {
    return process.env.MONGODB_DB_DEV || "DEV";
  }
  if (target === "prod") {
    return process.env.MONGODB_DB_PROD || "PROD";
  }
  if (target) {
    return target;
  }
  if (process.env.MONGODB_DB_NAME) {
    return process.env.MONGODB_DB_NAME;
  }
  if (process.env.NODE_ENV === "production") {
    return process.env.MONGODB_DB_PROD || "PROD";
  }
  return process.env.MONGODB_DB_DEV || "DEV";
}

/**
 * Gets a connected MongoDB client with pooled connections.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, MONGO_OPTIONS);
    global._mongoClientPromise = client.connect();
  }
  return await global._mongoClientPromise;
}

const dbMap = global._mongoDbInstances || new Map<string, Db>();
global._mongoDbInstances = dbMap;

/**
 * Gets a cached database instance for a specific target ('dev' or 'prod', defaults to active MONGODB_DB_NAME).
 */
export async function getDb(target?: "dev" | "prod" | string): Promise<Db> {
  const dbName = getDbName(target);
  const cached = dbMap.get(dbName);
  if (cached) return cached;

  const cli = await getMongoClient();
  const db = cli.db(dbName);
  dbMap.set(dbName, db);
  return db;
}
